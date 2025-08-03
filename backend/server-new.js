/**
 * =============================================================================
 * MODULAR SCORESPOKEN BACKEND SERVER
 * =============================================================================
 * 
 * Refactored Express.js server with layered architecture for scalability.
 * Easy migration to MVC pattern and microservices later.
 * 
 * ARCHITECTURE:
 * - Configuration management
 * - Service layer (AI, Audio, Storage)
 * - Route layer (organized by domain)
 * - Middleware layer (error handling, logging)
 * - Easy scaling and testing
 */

// =============================================================================
// DEPENDENCIES AND CONFIGURATION
// =============================================================================

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

// Import configuration
const config = require('./config')

// Import middleware
const { 
  errorHandler, 
  notFoundHandler, 
  handleUncaughtException, 
  handleUnhandledRejection 
} = require('./middleware/errorHandler')

const { 
  requestLogger, 
  performanceMonitor, 
  apiUsageTracker, 
  errorLogger 
} = require('./middleware/logger')

// Import services
const AudioService = require('./services/audio/AudioService')
const AIFactory = require('./services/ai/AIFactory')
const StorageFactory = require('./services/storage/StorageFactory')

// Import routes
const apiRoutes = require('./routes/api')

// =============================================================================
// GLOBAL ERROR HANDLERS
// =============================================================================

// Handle uncaught exceptions
handleUncaughtException()

// =============================================================================
// EXPRESS APP SETUP
// =============================================================================

const app = express()

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1)

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
})

app.use('/api/', limiter)

// Body parsing
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Logging and monitoring
app.use(requestLogger)
app.use(performanceMonitor)
app.use(apiUsageTracker)

// =============================================================================
// SERVICE INITIALIZATION
// =============================================================================

let audioService, aiService, storage

async function initializeServices() {
  try {
    console.log('🔧 Initializing services...')

    // Initialize storage service
    storage = await StorageFactory.createWithCleanup(config.storage)
    console.log(`✅ Storage service initialized (${config.storage.type})`)

    // Initialize audio service
    audioService = new AudioService(config.storage)
    console.log('✅ Audio service initialized')

    // Initialize AI service with health check
    aiService = await AIFactory.createWithHealthCheck(config.ai)
    console.log(`✅ AI service initialized (${config.ai.provider})`)

    // Make services available to routes
    app.locals.services = {
      audio: audioService,
      ai: aiService,
      storage: storage
    }

    return true

  } catch (error) {
    console.error('❌ Service initialization failed:', error)
    return false
  }
}

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint (before API routes for faster response)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.env,
    version: '2.0.0'
  })
})

// API routes
app.use('/api', apiRoutes)

// Legacy routes for backward compatibility
app.use('/api/analyze-answer', (req, res, next) => {
  req.url = '/api/analyze/single'
  req.body.testType = 'quick-drill'
  apiRoutes(req, res, next)
})

app.use('/api/analyze-part1', (req, res, next) => {
  req.url = '/api/analyze/part1'
  apiRoutes(req, res, next)
})

app.use('/api/analyze-part2', (req, res, next) => {
  req.url = '/api/analyze/part2'
  apiRoutes(req, res, next)
})

app.use('/api/analyze-part3', (req, res, next) => {
  req.url = '/api/analyze/part3'
  apiRoutes(req, res, next)
})

// Serve audio files (legacy compatibility)
app.use('/temp', express.static(config.storage.tempDir))

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'ScoreSpoken API',
    version: '2.0.0',
    environment: config.server.env,
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      docs: '/api/docs'
    },
    features: {
      modularArchitecture: true,
      configurableStorage: true,
      multiAIProviders: true,
      errorHandling: true,
      requestLogging: true,
      rateLimiting: true
    }
  })
})

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use(notFoundHandler)

// Error logging
app.use(errorLogger)

// Global error handler
app.use(errorHandler)

// =============================================================================
// SERVER STARTUP
// =============================================================================

async function startServer() {
  try {
    // Initialize services first
    const servicesInitialized = await initializeServices()
    
    if (!servicesInitialized) {
      console.error('❌ Failed to initialize services. Exiting...')
      process.exit(1)
    }

    // Start server
    const server = app.listen(config.server.port, () => {
      console.log(`
🚀 ScoreSpoken Server v2.0.0 Started!

📍 Server: http://localhost:${config.server.port}
🔗 Health: http://localhost:${config.server.port}/health
📋 API: http://localhost:${config.server.port}/api

🔧 Configuration:
   Environment: ${config.server.env}
   Storage: ${config.storage.type}
   AI Provider: ${config.ai.provider}
   AI Model: ${config.ai.model}

🎯 Features:
   ✅ Modular Architecture
   ✅ Configurable Storage (${config.storage.type})
   ✅ AI Service (${config.ai.provider})
   ✅ Audio Processing
   ✅ Error Handling & Logging
   ✅ Rate Limiting
   ✅ Health Monitoring
   ✅ Backward Compatibility

Ready for requests! 🎉
      `)
    })

    // Handle unhandled rejections
    handleUnhandledRejection(server)

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('\n🛑 Graceful shutdown initiated...')
      
      server.close(() => {
        console.log('✅ HTTP server closed')
        
        // Cleanup services
        if (storage && typeof storage.cleanup === 'function') {
          storage.cleanup(0).then(() => {
            console.log('✅ Storage cleanup completed')
            process.exit(0)
          }).catch(() => {
            process.exit(1)
          })
        } else {
          process.exit(0)
        }
      })
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down')
        process.exit(1)
      }, 10000)
    }

    // Listen for shutdown signals
    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)

    return server

  } catch (error) {
    console.error('❌ Server startup failed:', error)
    process.exit(1)
  }
}

// =============================================================================
// START THE SERVER
// =============================================================================

if (require.main === module) {
  startServer()
}

module.exports = { app, startServer }