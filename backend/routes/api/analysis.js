/**
 * =============================================================================
 * ANALYSIS ROUTES
 * =============================================================================
 * 
 * Routes for IELTS audio analysis endpoints.
 * Handles single and multiple audio file analysis for different test types.
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')

// Import services
const AudioService = require('../../services/audio/AudioService')
const AIFactory = require('../../services/ai/AIFactory')
const StorageFactory = require('../../services/storage/StorageFactory')
const config = require('../../config')

// Initialize services
const audioService = new AudioService(config.storage)
const aiService = AIFactory.create(config.ai)
const storage = StorageFactory.create(config.storage)

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
 * POST /api/analyze/single
 * Analyze single audio file (Quick Drill)
 */
router.post('/single', upload.single('audio'), async (req, res) => {
  try {
    const { question, testType = 'quick-drill' } = req.body

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

    // Process audio
    const audioBuffer = req.file.buffer
    const audioMetadata = await audioService.getAudioMetadata(audioBuffer, req.file.mimetype)

    // Store audio file
    const audioId = await storage.store(audioBuffer, req.file.originalname, req.file.mimetype)
    const audioUrl = await storage.getPublicUrl(audioId)

    // Analyze with AI
    const analysis = await aiService.analyzeSingleAudio(audioBuffer, question, testType)

    // Prepare response
    const response = {
      ...analysis,
      audio_url: audioUrl,
      audio_metadata: audioMetadata,
      processing_info: {
        processed_at: new Date().toISOString(),
        test_type: testType,
        audio_id: audioId
      }
    }

    res.json(response)

  } catch (error) {
    console.error('Single analysis error:', error)
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message,
      code: 'ANALYSIS_ERROR'
    })
  }
})

/**
 * POST /api/analyze/part1
 * Analyze Part 1 (multiple personal questions)
 */
router.post('/part1', upload.fields([
  { name: 'audio_0', maxCount: 1 },
  { name: 'audio_1', maxCount: 1 },
  { name: 'audio_2', maxCount: 1 },
  { name: 'audio_3', maxCount: 1 },
  { name: 'audio_4', maxCount: 1 }
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
    const audioUrls = []
    
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

    // Store individual files and get URLs
    for (const file of processedAudio.individualFiles) {
      const audioId = await storage.store(file.buffer, file.originalName, file.mimetype)
      const audioUrl = await storage.getPublicUrl(audioId)
      audioUrls.push(audioUrl)
    }

    // Store merged audio if available
    let mergedAudioUrl = null
    if (processedAudio.mergedAudio) {
      const mergedId = await storage.store(
        processedAudio.mergedAudio.buffer,
        `part1_merged_${Date.now()}.wav`,
        'audio/wav'
      )
      mergedAudioUrl = await storage.getPublicUrl(mergedId)
    }

    // Prepare audio buffers for AI analysis
    const audioBuffers = processedAudio.individualFiles.map(f => f.buffer)

    // Analyze with AI
    const analysis = await aiService.analyzeMultipleAudio(audioBuffers, parsedQuestions, testType)

    // Prepare response
    const response = {
      ...analysis,
      individual_audio_urls: audioUrls,
      merged_audio_url: mergedAudioUrl,
      audio_metadata: processedAudio.summary,
      processing_info: {
        processed_at: new Date().toISOString(),
        test_type: testType,
        file_count: audioFiles.length
      }
    }

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
router.post('/part2', upload.single('audio'), async (req, res) => {
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

    // Store audio file
    const audioId = await storage.store(audioBuffer, req.file.originalname, req.file.mimetype)
    const audioUrl = await storage.getPublicUrl(audioId)

    // Analyze with AI
    const analysis = await aiService.analyzeSingleAudio(audioBuffer, question, testType)

    // Prepare response
    const response = {
      ...analysis,
      audio_url: audioUrl,
      audio_metadata: audioMetadata,
      processing_info: {
        processed_at: new Date().toISOString(),
        test_type: testType,
        audio_id: audioId,
        duration_check: audioMetadata.estimatedDuration >= 60 ? 'adequate' : 'too_short'
      }
    }

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
router.post('/part3', upload.fields([
  { name: 'audio_0', maxCount: 1 },
  { name: 'audio_1', maxCount: 1 },
  { name: 'audio_2', maxCount: 1 },
  { name: 'audio_3', maxCount: 1 },
  { name: 'audio_4', maxCount: 1 }
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
    const audioUrls = []
    
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

    // Store individual files and get URLs
    for (const file of processedAudio.individualFiles) {
      const audioId = await storage.store(file.buffer, file.originalName, file.mimetype)
      const audioUrl = await storage.getPublicUrl(audioId)
      audioUrls.push(audioUrl)
    }

    // Store merged audio if available
    let mergedAudioUrl = null
    if (processedAudio.mergedAudio) {
      const mergedId = await storage.store(
        processedAudio.mergedAudio.buffer,
        `part3_merged_${Date.now()}.wav`,
        'audio/wav'
      )
      mergedAudioUrl = await storage.getPublicUrl(mergedId)
    }

    // Prepare audio buffers for AI analysis
    const audioBuffers = processedAudio.individualFiles.map(f => f.buffer)

    // Analyze with AI
    const analysis = await aiService.analyzeMultipleAudio(audioBuffers, parsedQuestions, testType)

    // Prepare response
    const response = {
      ...analysis,
      individual_audio_urls: audioUrls,
      merged_audio_url: mergedAudioUrl,
      audio_metadata: processedAudio.summary,
      processing_info: {
        processed_at: new Date().toISOString(),
        test_type: testType,
        file_count: audioFiles.length
      }
    }

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