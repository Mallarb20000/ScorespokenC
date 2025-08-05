/**
 * =============================================================================
 * STREAMING ANALYSIS ROUTES
 * =============================================================================
 * 
 * Server-Sent Events (SSE) for real-time progress updates during AI analysis.
 * Provides better user experience with live progress indicators.
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')

// Import services
const AudioService = require('../../services/audio/AudioService')
const AIFactory = require('../../services/ai/AIFactory')
const StorageFactory = require('../../services/storage/StorageFactory')
const { loggers } = require('../../services/logging/Logger')
const config = require('../../config')

// Import middleware
const { optionalFirebaseAuth } = require('../../middleware/firebaseAuth')

// Initialize services
const audioService = new AudioService(config.storage)
const aiService = AIFactory.create(config.ai)
const storage = StorageFactory.create(config.storage)

// Configure multer for streaming analysis
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
 * POST /api/streaming/analyze
 * Streaming analysis with real-time progress updates
 */
router.post('/analyze', optionalFirebaseAuth, upload.single('audio'), async (req, res) => {
  const requestStart = Date.now()
  
  try {
    const { question, testType = 'quick-drill' } = req.body
    console.log(`📥 Starting streaming analysis for ${testType}...`)

    // Validation
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: { message: 'No audio file provided', code: 'MISSING_AUDIO_FILE' }
      })
    }

    if (!question) {
      return res.status(400).json({ 
        success: false,
        error: { message: 'Question is required', code: 'MISSING_QUESTION' }
      })
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })

    // Helper function to send progress updates
    const sendProgress = (message, step, total, data = {}) => {
      const progressData = {
        message,
        step,
        total,
        percentage: Math.round((step / total) * 100),
        timestamp: new Date().toISOString(),
        ...data
      }
      res.write(`data: ${JSON.stringify({ type: 'progress', ...progressData })}\n\n`)
    }

    // Helper function to send final result
    const sendResult = (result) => {
      res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`)
      res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
      res.end()
    }

    // Helper function to send error
    const sendError = (error) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`)
      res.end()
    }

    try {
      // Step 1: Process and compress audio
      sendProgress('🗜️ Compressing audio...', 1, 6)
      const audioBuffer = req.file.buffer
      const optimizedAudio = await audioService.optimizeForStorage(audioBuffer, req.file.mimetype, req.file.originalname)

      // Step 2: Upload to storage
      sendProgress('☁️ Uploading to cloud storage...', 2, 6)
      const userId = req.user?.id || `guest_${req.ip.replace(/\./g, '_')}`
      const audioId = await storage.store(optimizedAudio.buffer, req.file.originalname, req.file.mimetype, userId)
      const audioUrl = await storage.getPublicUrl(audioId)

      // Step 3-6: AI Analysis with streaming progress
      const aiStart = Date.now()
      
      // Streaming progress callback (no console logging - handled by SSE)
      const progressCallback = (message, step, total) => {
        sendProgress(message, step + 2, 6) // Offset by 2 for previous steps
      }
      
      const analysis = await aiService.analyzeSingleAudio(audioBuffer, question, testType, progressCallback)
      const aiTime = Date.now() - aiStart

      // Send final result
      const result = {
        success: true,
        data: {
          ...analysis,
          audio_url: audioUrl,
          audio_metadata: optimizedAudio.metadata,
          compression_info: {
            compressed: optimizedAudio.optimized,
            original_size: optimizedAudio.originalSize,
            optimized_size: optimizedAudio.optimizedSize,
            compression_ratio: optimizedAudio.compressionRatio,
            savings_percent: optimizedAudio.optimized ? 
              ((1 - 1/optimizedAudio.compressionRatio) * 100).toFixed(1) + '%' : '0%'
          },
          processing_info: {
            processed_at: new Date().toISOString(),
            test_type: testType,
            audio_id: audioId,
            ai_processing_time_ms: aiTime,
            total_processing_time_ms: Date.now() - requestStart
          }
        }
      }

      sendResult(result)

    } catch (error) {
      console.error('Streaming analysis error:', error)
      sendError({
        message: error.message,
        code: 'ANALYSIS_ERROR',
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Streaming setup error:', error)
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false,
        error: {
          message: error.message,
          code: 'STREAMING_ERROR',
          timestamp: new Date().toISOString()
        }
      })
    }
  }
})

/**
 * GET /api/streaming/test
 * Test streaming endpoint
 */
router.get('/test', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  })

  let step = 0
  const total = 5
  
  const interval = setInterval(() => {
    step++
    
    const messages = [
      '🔄 Initializing...',
      '📝 Processing data...',
      '🤖 Running AI analysis...',
      '📊 Calculating results...',
      '✅ Complete!'
    ]
    
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      message: messages[step - 1],
      step,
      total,
      percentage: Math.round((step / total) * 100),
      timestamp: new Date().toISOString()
    })}\n\n`)
    
    if (step >= total) {
      res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
      res.end()
      clearInterval(interval)
    }
  }, 1000)

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval)
    res.end()
  })
})

module.exports = router