/**
 * =============================================================================
 * LOGGING MIDDLEWARE
 * =============================================================================
 * 
 * Request logging and monitoring middleware for tracking
 * API usage, performance, and debugging.
 */

const config = require('../config')

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Store original end function
  const originalEnd = res.end
  
  // Override res.end to capture response details
  res.end = function(chunk, encoding) {
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Log request details
    const logData = {
      timestamp: new Date(startTime).toISOString(),
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      contentLength: res.get('Content-Length') || 0
    }

    // Add file upload info if present
    if (req.file) {
      logData.upload = {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    }

    if (req.files) {
      logData.uploads = Object.keys(req.files).map(key => ({
        field: key,
        count: req.files[key].length,
        totalSize: req.files[key].reduce((sum, file) => sum + file.size, 0)
      }))
    }

    // Color code based on status
    const statusColor = getStatusColor(res.statusCode)
    const durationColor = getDurationColor(duration)

    // Format log message
    const logMessage = `${logData.method} ${logData.path} ${statusColor}${logData.statusCode}\x1b[0m ${durationColor}${logData.duration}\x1b[0m`

    // Log to console
    console.log(logMessage)

    // Log full details in development
    if (config.server.env === 'development' && (res.statusCode >= 400 || duration > 5000)) {
      console.log('Request details:', JSON.stringify(logData, null, 2))
    }

    // Store metrics for later use
    if (!res.locals.metrics) res.locals.metrics = {}
    res.locals.metrics.request = logData

    // Call original end function
    originalEnd.call(this, chunk, encoding)
  }

  next()
}

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint()
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint()
    const duration = Number(endTime - startTime) / 1e6 // Convert to milliseconds
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      console.warn(`⚠️  Slow request detected: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`)
    }

    // Log memory usage for heavy requests
    if (duration > 10000) { // 10 seconds
      const memUsage = process.memoryUsage()
      console.warn(`📊 Memory usage after slow request:`, {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      })
    }
  })

  next()
}

/**
 * API usage tracking middleware
 */
const apiUsageTracker = (req, res, next) => {
  // Track API endpoint usage
  const endpoint = `${req.method} ${req.route?.path || req.path}`
  
  // Initialize usage stats if not exists
  if (!global.apiUsageStats) {
    global.apiUsageStats = new Map()
  }

  // Update usage count
  const currentCount = global.apiUsageStats.get(endpoint) || 0
  global.apiUsageStats.set(endpoint, currentCount + 1)

  // Track AI usage specifically
  if (req.path.includes('/analyze')) {
    if (!global.aiUsageStats) {
      global.aiUsageStats = {
        totalRequests: 0,
        requestsByType: new Map(),
        totalCost: 0
      }
    }

    global.aiUsageStats.totalRequests++
    
    const testType = req.body?.testType || 'unknown'
    const currentTypeCount = global.aiUsageStats.requestsByType.get(testType) || 0
    global.aiUsageStats.requestsByType.set(testType, currentTypeCount + 1)
  }

  next()
}

/**
 * Error logging middleware
 */
const errorLogger = (error, req, res, next) => {
  const errorData = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    },
    user: req.user?.id || 'anonymous'
  }

  // Log error with appropriate level
  if (error.statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(errorData, null, 2))
  } else if (error.statusCode >= 400) {
    console.warn('⚠️  Client Error:', errorData.error.message)
  }

  next(error)
}

/**
 * Get usage statistics
 */
const getUsageStats = () => {
  return {
    api: global.apiUsageStats ? Object.fromEntries(global.apiUsageStats) : {},
    ai: global.aiUsageStats || {
      totalRequests: 0,
      requestsByType: {},
      totalCost: 0
    }
  }
}

/**
 * Reset usage statistics
 */
const resetUsageStats = () => {
  global.apiUsageStats = new Map()
  global.aiUsageStats = {
    totalRequests: 0,
    requestsByType: new Map(),
    totalCost: 0
  }
}

// Helper functions
function getStatusColor(statusCode) {
  if (statusCode >= 500) return '\x1b[31m' // Red
  if (statusCode >= 400) return '\x1b[33m' // Yellow
  if (statusCode >= 300) return '\x1b[36m' // Cyan
  if (statusCode >= 200) return '\x1b[32m' // Green
  return '\x1b[0m' // Reset
}

function getDurationColor(duration) {
  if (duration > 5000) return '\x1b[31m' // Red for > 5s
  if (duration > 2000) return '\x1b[33m' // Yellow for > 2s
  if (duration > 1000) return '\x1b[36m' // Cyan for > 1s
  return '\x1b[32m' // Green for fast requests
}

module.exports = {
  requestLogger,
  performanceMonitor,
  apiUsageTracker,
  errorLogger,
  getUsageStats,
  resetUsageStats
}