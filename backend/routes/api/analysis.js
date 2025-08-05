/**
 * =============================================================================
 * ANALYSIS ROUTES
 * =============================================================================
 * 
 * Routes for IELTS audio analysis endpoints.
 * Handles single and multiple audio file analysis for different test types.
 * 
 * ARCHITECTURE: NON-BLOCKING STORAGE
 * - AI Analysis: ALWAYS PRIORITIZED (never blocked by storage issues)
 * - Memory Storage: Immediate (for audio playback)
 * - Supabase Storage: Background processing (for long-term storage)
 * - Error Handling: Storage errors reported in response but don't block AI
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')

// Import services
const AudioService = require('../../services/audio/AudioService')
const AudioCompression = require('../../services/audio/AudioCompression')
const AIFactory = require('../../services/ai/AIFactory')
const StorageFactory = require('../../services/storage/StorageFactory')
const MemoryAudioStorage = require('../../services/storage/MemoryAudioStorage')
const { loggers } = require('../../services/logging/Logger')
const config = require('../../config')

// Import middleware
const { optionalFirebaseAuth } = require('../../middleware/firebaseAuth')

// Initialize services
const audioService = new AudioService(config.storage)
const audioCompression = new AudioCompression(config.compression || { compressionLevel: 6 })
const aiService = AIFactory.create(config.ai)
const persistentStorage = StorageFactory.create(config.storage)
const memoryStorage = MemoryAudioStorage.getInstance(config.memoryStorage || {})

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (config.storage.allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false)
    }
  }
})

/**
 * REUSABLE HYBRID STORAGE FUNCTIONS
 */

/**
 * Store single audio file in both memory and Supabase with compression optimization
 * CRITICAL: Memory storage is synchronous, Supabase storage is NON-BLOCKING background operation
 */
async function storeAudioHybrid(audioBuffer, filename, mimetype, userId, metadata = {}, testType = 'unknown') {
  const storageStart = Date.now()
  
  // Store ORIGINAL (uncompressed) in memory for immediate playback quality - ALWAYS SUCCEEDS
  const memoryId = memoryStorage.store(audioBuffer, filename, mimetype, {
    testType,
    uploadedAt: new Date().toISOString(),
    compressed: false,
    ...metadata
  })
  const memoryUrl = `http://localhost:${config.server.port}/api/audio/memory/${memoryId}`

  // Initialize return object with memory storage (guaranteed to work)
  const result = {
    memory: { id: memoryId, url: memoryUrl },
    supabase: { 
      status: 'pending', 
      id: null, 
      url: null, 
      error: null 
    },
    compression: {
      enabled: false,
      ratio: 1,
      originalSize: audioBuffer.length,
      compressedSize: audioBuffer.length,
      storageTime: Date.now() - storageStart
    }
  }

  // Start Supabase storage in background - DO NOT BLOCK AI PIPELINE
  const storageLogger = loggers.storage.createOperationLogger(`hybrid-storage-${filename}`)
  setImmediate(async () => {
    try {
      storageLogger.start(`Background Supabase storage for ${filename}`)
      
      // Get optimal compression settings for test type
      const compressionResult = await audioCompression.compress(audioBuffer, {
        testType,
        uploadedAt: new Date().toISOString(),
        ...metadata
      })
      
      // Store COMPRESSED in Supabase for long-term storage efficiency
      const supabaseId = await persistentStorage.store(
        compressionResult.buffer, 
        filename, 
        mimetype, 
        userId, 
        compressionResult.metadata
      )
      const supabaseUrl = await persistentStorage.getPublicUrl(supabaseId)
      
      const totalTime = Date.now() - storageStart
      storageLogger.complete(`Supabase storage with ${compressionResult.compressed ? `${(compressionResult.compressionRatio * 100 - 100).toFixed(1)}% compression` : 'no compression'}`, totalTime)
      
      // Update result object (though it's already been returned)
      result.supabase = { 
        status: 'completed', 
        id: supabaseId, 
        url: supabaseUrl, 
        error: null 
      }
      result.compression = {
        enabled: compressionResult.compressed,
        ratio: compressionResult.compressionRatio,
        originalSize: compressionResult.originalSize,
        compressedSize: compressionResult.compressedSize,
        storageTime: totalTime
      }
      
    } catch (error) {
      storageLogger.error(`Supabase storage failed for ${filename}`, error)
      result.supabase = { 
        status: 'failed', 
        id: null, 
        url: null, 
        error: error.message 
      }
    }
  })

  loggers.storage.info(`💾 Hybrid storage: Memory (immediate) + Supabase (background) for ${filename}`)
  return result
}

/**
 * Store multiple audio files in both memory and Supabase
 * CRITICAL: Memory storage is immediate, Supabase storage is background
 */
async function storeMultipleAudioHybrid(audioFiles, userId, testType = 'unknown') {
  const memoryUrls = []
  const supabaseUrls = []
  const storageInfo = []

  // Process all files - memory storage happens immediately, Supabase in background
  for (const file of audioFiles) {
    const storage = await storeAudioHybrid(
      file.buffer, 
      file.originalName, 
      file.mimetype, 
      userId, 
      { questionIndex: file.index, ...file.metadata },
      testType
    )
    
    // Memory URLs are immediately available
    memoryUrls.push(storage.memory.url)
    
    // Supabase URLs will be null initially (background processing)
    supabaseUrls.push(storage.supabase.url || 'processing-in-background')
    storageInfo.push(storage)
  }

  return { memoryUrls, supabaseUrls, storageInfo }
}

/**
 * Create consistent response with hybrid storage info
 * Shows Supabase status (pending/completed/failed) without blocking
 */
function createHybridStorageResponse(analysis, audioStorage, testType, additionalInfo = {}) {
  return {
    ...analysis,
    // Storage metadata
    audio_storage: {
      memory: {
        status: 'available',
        expires_in_minutes: config.memoryStorage?.ttl ? config.memoryStorage.ttl / 60 / 1000 : 30,
        ...audioStorage.memory
      },
      supabase: {
        status: audioStorage.supabase?.status || 'pending',
        expires_in_days: 30,
        error: audioStorage.supabase?.error || null,
        note: audioStorage.supabase?.status === 'pending' ? 'Processing in background - check again later' : null,
        ...audioStorage.supabase
      }
    },
    processing_info: {
      processed_at: new Date().toISOString(),
      test_type: testType,
      storage_priority: 'memory_first_supabase_background',
      ...additionalInfo
    }
  }
}

/**
 * POST /api/analyze/single
 * Analyze single audio file (Quick Drill)
 */
router.post('/single', optionalFirebaseAuth, upload.single('audio'), async (req, res) => {
  const requestStart = Date.now()
  const requestLogger = loggers.api.createOperationLogger(`${req.method}-${req.path}-${Date.now()}`)
  
  try {
    const { question, testType = 'quick-drill' } = req.body
    requestLogger.start(`Processing ${testType} request`)

    // Validation
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        code: 'MISSING_AUDIO_FILE'
      })
    }

    if (!question) {
      return res.status(400).json({ 
        error: 'Question is required',
        code: 'MISSING_QUESTION'
      })
    }

    const audioBuffer = req.file.buffer

    // PRIORITY 1: Analyze with AI immediately for fastest response (NEVER BLOCK THIS)
    const aiLogger = loggers.ai.createOperationLogger(`ai-analysis-${req.file.originalname}`)
    aiLogger.start('AI analysis')
    const aiStart = Date.now()
    
    // Progress callback for logging
    const progressCallback = (message, step, total) => {
      aiLogger.progress(message, step, total)
    }
    
    // Use original uncompressed audio for AI analysis (better quality)
    const analysis = await aiService.analyzeSingleAudio(audioBuffer, question, testType, progressCallback)
    
    const aiTime = Date.now() - aiStart
    aiLogger.complete('AI analysis', aiTime)

    // PRIORITY 2: Store in memory immediately (for audio playback)
    const userId = req.user?.id || `guest_${req.ip.replace(/\./g, '_')}`
    const audioMetadata = await audioService.getAudioMetadata(audioBuffer, req.file.mimetype)
    
    const audioStorage = await storeAudioHybrid(audioBuffer, req.file.originalname, req.file.mimetype, userId, audioMetadata, testType)

    // Prepare response using reusable function
    const response = {
      success: true,
      data: createHybridStorageResponse(analysis, {
        memory: { id: audioStorage.memory.id, url: audioStorage.memory.url },
        supabase: { id: audioStorage.supabase.id, url: audioStorage.supabase.url }
      }, testType, {
        // Primary audio URL for immediate playback (memory)
        audio_url: audioStorage.memory.url,
        // Backup audio URL for 30-day access (Supabase)
        supabase_audio_url: audioStorage.supabase.url,
        audio_metadata: audioMetadata,
        memory_audio_id: audioStorage.memory.id,
        supabase_audio_id: audioStorage.supabase.id,
        ai_processing_time_ms: aiTime,
        total_processing_time_ms: Date.now() - requestStart
      })
    }

    res.json(response)
    
    // Log successful completion
    const totalTime = Date.now() - requestStart
    requestLogger.complete(`${testType} request`, totalTime)
    loggers.api.request(req, res, totalTime)

  } catch (error) {
    requestLogger.error('Analysis request failed', error)
    
    // Determine if this is a storage error or AI error
    const isStorageError = error.message.includes('Supabase') || error.message.includes('storage') || error.message.includes('bucket')
    
    if (isStorageError) {
      loggers.storage.warn('Storage error in background process (non-blocking)')
    }
    
    // More detailed error response
    res.status(500).json({ 
      success: false,
      error: {
        message: error.message,
        code: isStorageError ? 'STORAGE_ERROR' : 'ANALYSIS_ERROR',
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: isStorageError ? 'storage' : 'ai_processing'
      }
    })
  }
})

/**
 * POST /api/analyze/part1
 * Analyze Part 1 (multiple personal questions)
 */
router.post('/part1', optionalFirebaseAuth, upload.fields([
  { name: 'audio_0', maxCount: 1 },
  { name: 'audio_1', maxCount: 1 },
  { name: 'audio_2', maxCount: 1 },
  { name: 'audio_3', maxCount: 1 },
  { name: 'audio_4', maxCount: 1 },
  { name: 'questions', maxCount: 1 },
  { name: 'testType', maxCount: 1 },
  { name: 'metadata', maxCount: 1 }
]), async (req, res) => {
  try {
    const { questions, testType = 'part1' } = req.body
    
    // Parse questions if it's a string
    let parsedQuestions
    try {
      parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid questions format',
        code: 'INVALID_QUESTIONS'
      })
    }

    // Validation
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        error: 'No audio files provided',
        code: 'MISSING_AUDIO_FILES'
      })
    }

    if (!parsedQuestions || !Array.isArray(parsedQuestions)) {
      return res.status(400).json({ 
        error: 'Questions array is required',
        code: 'MISSING_QUESTIONS'
      })
    }

    // Extract audio files in order
    const audioFiles = []
    
    for (let i = 0; i < 5; i++) {
      const fieldName = `audio_${i}`
      if (req.files[fieldName] && req.files[fieldName][0]) {
        audioFiles.push(req.files[fieldName][0])
      }
    }

    if (audioFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No valid audio files found',
        code: 'NO_VALID_AUDIO'
      })
    }

    // Process all audio files
    const processedAudio = await audioService.processForAnalysis(audioFiles, {
      validateFiles: true,
      mergeFiles: true,
      extractMetadata: true
    })

    // Store multiple audio files using reusable hybrid storage
    const userId = req.user?.id || `guest_${req.ip.replace(/\./g, '_')}`
    const { memoryUrls, supabaseUrls } = await storeMultipleAudioHybrid(processedAudio.individualFiles, userId, testType)

    // Store merged audio if available
    let mergedStorage = null
    if (processedAudio.mergedAudio) {
      mergedStorage = await storeAudioHybrid(
        processedAudio.mergedAudio.buffer,
        `part1_merged_${Date.now()}.wav`,
        'audio/wav',
        userId,
        { merged: true, ...processedAudio.mergedAudio.metadata },
        testType
      )
    }
    
    // Set URLs for backward compatibility (use memory URLs as primary)
    const audioUrls = memoryUrls
    const mergedAudioUrl = mergedStorage?.memory.url || null

    // Prepare audio buffers for AI analysis
    const audioBuffers = processedAudio.individualFiles.map(f => f.buffer)

    // Analyze with AI
    const analysis = await aiService.analyzeMultipleAudio(audioBuffers, parsedQuestions, testType)

    // Prepare response using reusable function
    const response = createHybridStorageResponse(analysis, {
      memory: {
        individual_count: memoryUrls.length,
        has_merged: !!mergedStorage,
        urls: memoryUrls,
        merged_url: mergedStorage?.memory.url
      },
      supabase: {
        individual_count: supabaseUrls.length,
        has_merged: !!mergedStorage,
        urls: supabaseUrls,
        merged_url: mergedStorage?.supabase.url
      }
    }, testType, {
      // Backward compatibility
      individual_audio_urls: memoryUrls,
      merged_audio_url: mergedStorage?.memory.url || null,
      // Additional storage URLs
      supabase_individual_urls: supabaseUrls,
      supabase_merged_url: mergedStorage?.supabase.url || null,
      audio_metadata: processedAudio.summary,
      file_count: audioFiles.length
    })

    res.json(response)

  } catch (error) {
    console.error('Part 1 analysis error:', error)
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message,
      code: 'ANALYSIS_ERROR'
    })
  }
})

/**
 * POST /api/analyze/part2
 * Analyze Part 2 (cue card response)
 */
router.post('/part2', optionalFirebaseAuth, upload.single('audio'), async (req, res) => {
  try {
    const { question, testType = 'part2' } = req.body

    // Validation
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No audio file provided',
        code: 'MISSING_AUDIO_FILE'
      })
    }

    if (!question) {
      return res.status(400).json({ 
        error: 'Cue card question is required',
        code: 'MISSING_QUESTION'
      })
    }

    // Process audio
    const audioBuffer = req.file.buffer
    const audioMetadata = await audioService.getAudioMetadata(audioBuffer, req.file.mimetype)

    // Validate duration for Part 2 (should be around 2 minutes)
    if (audioMetadata.estimatedDuration < 60) {
      console.warn('Part 2 response seems too short (< 1 minute)')
    }

    // Store audio using hybrid storage approach
    const userId = req.user?.id || `guest_${req.ip.replace(/\./g, '_')}`
    const audioStorage = await storeAudioHybrid(audioBuffer, req.file.originalname, req.file.mimetype, userId, audioMetadata, testType)

    // Analyze with AI
    const analysis = await aiService.analyzeSingleAudio(audioBuffer, question, testType)

    // Prepare response using reusable function
    const response = createHybridStorageResponse(analysis, {
      memory: { id: audioStorage.memory.id, url: audioStorage.memory.url },
      supabase: { id: audioStorage.supabase.id, url: audioStorage.supabase.url }
    }, testType, {
      // Primary audio URL for immediate playback (memory)
      audio_url: audioStorage.memory.url,
      // Backup audio URL for 30-day access (Supabase)
      supabase_audio_url: audioStorage.supabase.url,
      audio_metadata: audioMetadata,
      memory_audio_id: audioStorage.memory.id,
      supabase_audio_id: audioStorage.supabase.id,
      duration_check: audioMetadata.estimatedDuration >= 60 ? 'adequate' : 'too_short'
    })

    res.json(response)

  } catch (error) {
    console.error('Part 2 analysis error:', error)
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message,
      code: 'ANALYSIS_ERROR'
    })
  }
})

/**
 * POST /api/analyze/part3
 * Analyze Part 3 (discussion questions)
 */
router.post('/part3', optionalFirebaseAuth, upload.fields([
  { name: 'audio_0', maxCount: 1 },
  { name: 'audio_1', maxCount: 1 },
  { name: 'audio_2', maxCount: 1 },
  { name: 'audio_3', maxCount: 1 },
  { name: 'audio_4', maxCount: 1 },
  { name: 'questions', maxCount: 1 },
  { name: 'testType', maxCount: 1 },
  { name: 'metadata', maxCount: 1 }
]), async (req, res) => {
  try {
    const { questions, testType = 'part3' } = req.body
    
    // Parse questions if it's a string
    let parsedQuestions
    try {
      parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid questions format',
        code: 'INVALID_QUESTIONS'
      })
    }

    // Validation
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        error: 'No audio files provided',
        code: 'MISSING_AUDIO_FILES'
      })
    }

    if (!parsedQuestions || !Array.isArray(parsedQuestions)) {
      return res.status(400).json({ 
        error: 'Questions array is required',
        code: 'MISSING_QUESTIONS'
      })
    }

    // Extract audio files in order
    const audioFiles = []
    
    for (let i = 0; i < 5; i++) {
      const fieldName = `audio_${i}`
      if (req.files[fieldName] && req.files[fieldName][0]) {
        audioFiles.push(req.files[fieldName][0])
      }
    }

    if (audioFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No valid audio files found',
        code: 'NO_VALID_AUDIO'
      })
    }

    // Process all audio files
    const processedAudio = await audioService.processForAnalysis(audioFiles, {
      validateFiles: true,
      mergeFiles: true,
      extractMetadata: true
    })

    // Store multiple audio files using reusable hybrid storage
    const userId = req.user?.id || `guest_${req.ip.replace(/\./g, '_')}`
    const { memoryUrls, supabaseUrls } = await storeMultipleAudioHybrid(processedAudio.individualFiles, userId, testType)

    // Store merged audio if available
    let mergedStorage = null
    if (processedAudio.mergedAudio) {
      mergedStorage = await storeAudioHybrid(
        processedAudio.mergedAudio.buffer,
        `part3_merged_${Date.now()}.wav`,
        'audio/wav',
        userId,
        { merged: true, ...processedAudio.mergedAudio.metadata },
        testType
      )
    }
    
    // Set URLs for backward compatibility (use memory URLs as primary)
    const audioUrls = memoryUrls
    const mergedAudioUrl = mergedStorage?.memory.url || null

    // Prepare audio buffers for AI analysis
    const audioBuffers = processedAudio.individualFiles.map(f => f.buffer)

    // Analyze with AI
    const analysis = await aiService.analyzeMultipleAudio(audioBuffers, parsedQuestions, testType)

    // Prepare response using reusable function
    const response = createHybridStorageResponse(analysis, {
      memory: {
        individual_count: memoryUrls.length,
        has_merged: !!mergedStorage,
        urls: memoryUrls,
        merged_url: mergedStorage?.memory.url
      },
      supabase: {
        individual_count: supabaseUrls.length,
        has_merged: !!mergedStorage,
        urls: supabaseUrls,
        merged_url: mergedStorage?.supabase.url
      }
    }, testType, {
      // Backward compatibility
      individual_audio_urls: memoryUrls,
      merged_audio_url: mergedStorage?.memory.url || null,
      // Additional storage URLs
      supabase_individual_urls: supabaseUrls,
      supabase_merged_url: mergedStorage?.supabase.url || null,
      audio_metadata: processedAudio.summary,
      file_count: audioFiles.length
    })

    res.json(response)

  } catch (error) {
    console.error('Part 3 analysis error:', error)
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message,
      code: 'ANALYSIS_ERROR'
    })
  }
})

// Legacy routes are handled by server.js for backward compatibility

module.exports = router