/**
 * =============================================================================
 * HEALTH CHECK ROUTES
 * =============================================================================
 * 
 * Health monitoring endpoints for service status and diagnostics.
 * Used for monitoring, load balancers, and debugging.
 */

const express = require('express')
const router = express.Router()

// Import services
const AudioService = require('../../services/audio/AudioService')
const AIFactory = require('../../services/ai/AIFactory')
const StorageFactory = require('../../services/storage/StorageFactory')
const config = require('../../config')

// Initialize services for health checks
let audioService, aiService, storage

try {
  audioService = new AudioService(config.storage)
  aiService = AIFactory.create(config.ai)
  storage = StorageFactory.create(config.storage)
} catch (error) {
  console.error('Failed to initialize services for health checks:', error)
}

/**
 * GET /api/health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.env,
      version: '1.0.0'
    }

    res.json(health)
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/health/detailed
 * Comprehensive health check with service status
 */
router.get('/detailed', async (req, res) => {
  const checks = {}
  let overallStatus = 'healthy'

  try {
    // Check AI service
    if (aiService) {
      try {
        const aiHealth = await aiService.getHealthStatus()
        checks.ai = { status: 'healthy', ...aiHealth }
      } catch (error) {
        checks.ai = { status: 'unhealthy', error: error.message }
        overallStatus = 'unhealthy'
      }
    } else {
      checks.ai = { status: 'not_initialized', error: 'AI service not available' }
      overallStatus = 'degraded'
    }

    // Check audio service
    if (audioService) {
      try {
        const audioStats = audioService.getStats()
        checks.audio = { status: 'healthy', ...audioStats }
      } catch (error) {
        checks.audio = { status: 'unhealthy', error: error.message }
        overallStatus = 'unhealthy'
      }
    } else {
      checks.audio = { status: 'not_initialized', error: 'Audio service not available' }
      overallStatus = 'degraded'
    }

    // Check storage service
    if (storage) {
      try {
        // Basic storage test
        const testData = Buffer.from('health-check-test')
        const testId = await storage.store(testData, 'health-check.txt', 'text/plain')
        const retrieved = await storage.retrieve(testId)
        await storage.delete(testId)
        
        checks.storage = { 
          status: 'healthy',
          type: config.storage.type,
          testPassed: Buffer.compare(testData, retrieved) === 0
        }
      } catch (error) {
        checks.storage = { status: 'unhealthy', error: error.message }
        overallStatus = 'unhealthy'
      }
    } else {
      checks.storage = { status: 'not_initialized', error: 'Storage service not available' }
      overallStatus = 'degraded'
    }

    // System metrics
    const system = {
      memory: {
        used: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform
    }

    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: config.server.env,
      version: '1.0.0',
      system,
      services: checks
    })

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      services: checks
    })
  }
})

/**
 * GET /api/health/ai
 * AI service specific health check
 */
router.get('/ai', async (req, res) => {
  try {
    if (!aiService) {
      return res.status(503).json({
        status: 'unavailable',
        error: 'AI service not initialized'
      })
    }

    const health = await aiService.getHealthStatus()
    const connectionTest = await aiService.testConnection()

    res.json({
      status: connectionTest ? 'healthy' : 'unhealthy',
      connection: connectionTest,
      ...health,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/health/storage
 * Storage service specific health check
 */
router.get('/storage', async (req, res) => {
  try {
    if (!storage) {
      return res.status(503).json({
        status: 'unavailable',
        error: 'Storage service not initialized'
      })
    }

    // Test storage operations
    const testData = Buffer.from(`health-check-${Date.now()}`)
    const testId = await storage.store(testData, 'health-check.txt', 'text/plain')
    
    const exists = await storage.exists(testId)
    const retrieved = await storage.retrieve(testId)
    const metadata = await storage.getMetadata(testId)
    
    await storage.delete(testId)

    const testsPassed = {
      store: !!testId,
      exists: exists,
      retrieve: Buffer.compare(testData, retrieved) === 0,
      metadata: !!metadata,
      delete: !(await storage.exists(testId))
    }

    const allTestsPassed = Object.values(testsPassed).every(Boolean)

    res.json({
      status: allTestsPassed ? 'healthy' : 'unhealthy',
      type: config.storage.type,
      tests: testsPassed,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

/**
 * GET /api/health/metrics
 * Performance and usage metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const memory = process.memoryUsage()
    const cpu = process.cpuUsage()

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.round(process.uptime()),
        formatted: formatUptime(process.uptime())
      },
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
        heapUtilization: Math.round((memory.heapUsed / memory.heapTotal) * 100)
      },
      cpu: {
        user: cpu.user,
        system: cpu.system
      },
      eventLoop: {
        lag: getEventLoopLag()
      }
    }

    // Add service-specific metrics if available
    if (aiService) {
      try {
        const aiHealth = await aiService.getHealthStatus()
        metrics.ai = {
          requestCount: aiHealth.requestCount || 0,
          totalCost: aiHealth.totalCost || 0,
          averageCostPerRequest: aiHealth.averageCostPerRequest || 0
        }
      } catch (error) {
        metrics.ai = { error: error.message }
      }
    }

    if (storage && typeof storage.getStats === 'function') {
      try {
        const storageStats = await storage.getStats()
        metrics.storage = storageStats
      } catch (error) {
        metrics.storage = { error: error.message }
      }
    }

    res.json(metrics)

  } catch (error) {
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Helper functions
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${hours}h ${minutes}m ${secs}s`
}

function getEventLoopLag() {
  const start = process.hrtime.bigint()
  setImmediate(() => {
    const lag = Number(process.hrtime.bigint() - start) / 1e6 // Convert to milliseconds
    return lag
  })
  return 0 // Simplified for now
}

module.exports = router