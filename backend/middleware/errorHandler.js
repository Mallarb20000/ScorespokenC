/**
 * =============================================================================
 * ERROR HANDLING MIDDLEWARE
 * =============================================================================
 * 
 * Centralized error handling for consistent error responses
 * and proper logging across the application.
 */

const config = require('../config')

/**
 * Custom error class for application errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Express error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  let err = { ...error }
  err.message = error.message

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Mongoose bad ObjectId
  if (error.name === 'CastError') {
    const message = 'Resource not found'
    err = new AppError(message, 404, 'RESOURCE_NOT_FOUND')
  }

  // Mongoose duplicate key
  if (error.code === 11000) {
    const message = 'Duplicate field value entered'
    err = new AppError(message, 400, 'DUPLICATE_FIELD')
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map(val => val.message).join(', ')
    err = new AppError(message, 400, 'VALIDATION_ERROR')
  }

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    const message = `File too large. Maximum size is ${config.storage.maxFileSize / 1024 / 1024}MB`
    err = new AppError(message, 400, 'FILE_TOO_LARGE')
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field'
    err = new AppError(message, 400, 'UNEXPECTED_FILE')
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    const message = 'Invalid token'
    err = new AppError(message, 401, 'INVALID_TOKEN')
  }

  if (error.name === 'TokenExpiredError') {
    const message = 'Token expired'
    err = new AppError(message, 401, 'TOKEN_EXPIRED')
  }

  // AI service errors
  if (error.message && error.message.includes('AI analysis failed')) {
    err = new AppError(error.message, 503, 'AI_SERVICE_ERROR')
  }

  // Storage errors
  if (error.message && error.message.includes('storage')) {
    err = new AppError(error.message, 503, 'STORAGE_ERROR')
  }

  // Rate limiting errors
  if (error.status === 429) {
    err = new AppError('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED')
  }

  // Send error response
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      ...(config.server.env === 'development' && { 
        stack: error.stack,
        details: error 
      })
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  })
}

/**
 * Handle async errors in route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND')
  next(error)
}

/**
 * Global uncaught exception handler
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...')
    console.error(err.name, err.message, err.stack)
    process.exit(1)
  })
}

/**
 * Global unhandled rejection handler
 */
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...')
    console.error(err.name, err.message)
    server.close(() => {
      process.exit(1)
    })
  })
}

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection
}