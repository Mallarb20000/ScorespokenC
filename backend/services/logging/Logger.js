/**
 * Centralized Logging Service
 * 
 * Eliminates duplicate logs and provides consistent formatting
 * across all backend services with configurable log levels.
 */

class Logger {
  constructor(component = 'APP') {
    this.component = component
    this.levels = {
      ERROR: 0,
      WARN: 1, 
      INFO: 2,
      DEBUG: 3
    }
    this.currentLevel = this.levels[process.env.LOG_LEVEL?.toUpperCase()] ?? this.levels.INFO
    this.processedEvents = new Set() // Prevent duplicate logs
  }

  /**
   * Create operation-specific logger to prevent duplicates
   */
  createOperationLogger(operationId) {
    return {
      start: (message) => this.operation(operationId, 'start', message),
      progress: (message, step, total) => this.operation(operationId, 'progress', message, { step, total }),
      complete: (message, duration) => this.operation(operationId, 'complete', message, { duration }),
      error: (message, error) => this.operation(operationId, 'error', message, { error })
    }
  }

  /**
   * Operation-based logging with duplicate prevention
   */
  operation(operationId, phase, message, metadata = {}) {
    const eventKey = `${operationId}:${phase}`
    
    // Skip if we've already logged this exact operation phase
    if (this.processedEvents.has(eventKey)) {
      return
    }
    
    this.processedEvents.add(eventKey)
    
    // Auto-cleanup old events to prevent memory leaks
    if (this.processedEvents.size > 1000) {
      const oldEvents = Array.from(this.processedEvents).slice(0, 500)
      oldEvents.forEach(event => this.processedEvents.delete(event))
    }

    switch (phase) {
      case 'start':
        this.info(`🔄 ${message}`)
        break
      case 'progress':
        if (metadata.step && metadata.total) {
          this.info(`📊 ${message} (${metadata.step}/${metadata.total})`)
        } else {
          this.info(`⏳ ${message}`)
        }
        break
      case 'complete':
        if (metadata.duration) {
          this.info(`✅ ${message} (${metadata.duration}ms)`)
        } else {
          this.info(`✅ ${message}`)
        }
        break
      case 'error':
        this.error(`❌ ${message}`, metadata.error)
        break
    }
  }

  /**
   * Standard log levels
   */
  error(message, error = null) {
    if (this.currentLevel >= this.levels.ERROR) {
      const timestamp = new Date().toISOString()
      console.error(`[${timestamp}] [${this.component}] ERROR: ${message}`)
      if (error) {
        console.error(error.stack || error)
      }
    }
  }

  warn(message) {
    if (this.currentLevel >= this.levels.WARN) {
      const timestamp = new Date().toISOString()
      console.warn(`[${timestamp}] [${this.component}] WARN: ${message}`)
    }
  }

  info(message) {
    if (this.currentLevel >= this.levels.INFO) {
      console.log(message) // Keep existing emoji format for info
    }
  }

  debug(message) {
    if (this.currentLevel >= this.levels.DEBUG) {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [${this.component}] DEBUG: ${message}`)
    }
  }

  /**
   * Request-specific logging
   */
  request(req, res, duration) {
    const { method, url, ip } = req
    const { statusCode } = res
    const userAgent = req.get('User-Agent')
    
    let message = `${method} ${url} ${statusCode} ${duration}ms`
    
    // Add upload info if present
    if (req.file) {
      message += ` [${req.file.filename}: ${(req.file.size / 1024).toFixed(1)}KB]`
    }
    
    this.info(message)
    
    // Warn on slow requests
    if (duration > 5000) {
      this.warn(`Slow request: ${method} ${url} took ${duration}ms`)
    }
  }

  /**
   * Clean up processed events (call periodically)
   */
  cleanup() {
    this.processedEvents.clear()
    this.debug('Logger events cleared')
  }
}

// Singleton instances for common components
const loggers = {
  app: new Logger('APP'),
  api: new Logger('API'),
  storage: new Logger('STORAGE'),
  ai: new Logger('AI'),
  audio: new Logger('AUDIO')
}

module.exports = Logger
module.exports.loggers = loggers