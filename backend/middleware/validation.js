/**
 * =============================================================================
 * REQUEST VALIDATION MIDDLEWARE
 * =============================================================================
 * 
 * Comprehensive request validation using Joi schema validation.
 * Provides consistent error responses and input sanitization.
 */

const Joi = require('joi')
const { AppError } = require('./errorHandler')

// Custom Joi extensions
const customJoi = Joi.extend((joi) => ({
  type: 'audioFile',
  base: joi.object(),
  messages: {
    'audioFile.invalid': 'Invalid audio file',
    'audioFile.tooLarge': 'Audio file too large (max {{#limit}}MB)',
    'audioFile.unsupportedFormat': 'Unsupported audio format. Supported: {{#formats}}'
  },
  validate(value, helpers) {
    if (!value || !value.buffer) {
      return { value, errors: helpers.error('audioFile.invalid') }
    }
    return { value }
  }
}))

// Common validation schemas
const schemas = {
  // Audio file validation
  audioFile: customJoi.object({
    buffer: Joi.binary().required(),
    mimetype: Joi.string().valid('audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg').required(),
    size: Joi.number().max(10 * 1024 * 1024).required(), // 10MB max
    originalname: Joi.string().required()
  }),

  // Single question analysis
  singleAnalysis: Joi.object({
    question: Joi.string().min(10).max(500).required().messages({
      'string.min': 'Question must be at least 10 characters long',
      'string.max': 'Question cannot exceed 500 characters',
      'any.required': 'Question is required'
    }),
    testType: Joi.string().valid('quick-drill', 'part1', 'part2', 'part3').default('quick-drill'),
    metadata: Joi.object().optional()
  }),

  // Multiple questions analysis
  multipleAnalysis: Joi.object({
    questions: Joi.alternatives().try(
      Joi.array().items(Joi.string().min(10).max(500)).min(1).max(10),
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value)
          if (!Array.isArray(parsed)) {
            return helpers.error('any.invalid')
          }
          return parsed
        } catch (error) {
          return helpers.error('any.invalid')
        }
      })
    ).required().messages({
      'array.min': 'At least one question is required',
      'array.max': 'Maximum 10 questions allowed',
      'any.required': 'Questions array is required'
    }),
    testType: Joi.string().valid('part1', 'part3').required(),
    theme: Joi.string().min(3).max(100).optional(),
    metadata: Joi.object().optional()
  }),

  // Part 2 specific validation
  part2Analysis: Joi.object({
    topic: Joi.string().min(10).max(200).required().messages({
      'string.min': 'Topic must be at least 10 characters long',
      'string.max': 'Topic cannot exceed 200 characters',
      'any.required': 'Topic is required for Part 2'
    }),
    points: Joi.alternatives().try(
      Joi.array().items(Joi.string().min(5).max(100)).max(4),
      Joi.string().custom((value, helpers) => {
        try {
          const parsed = JSON.parse(value)
          if (!Array.isArray(parsed)) {
            return helpers.error('any.invalid')
          }
          return parsed
        } catch (error) {
          return helpers.error('any.invalid')
        }
      })
    ).optional(),
    testType: Joi.string().valid('part2').default('part2'),
    metadata: Joi.object().optional()
  }),

  // User preferences
  userPreferences: Joi.object({
    targetScore: Joi.number().min(1).max(9).optional(),
    preferredPart: Joi.string().valid('part1', 'part2', 'part3', 'all').optional(),
    difficultyLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    recordingMode: Joi.string().valid('voice-activated', 'push-to-talk').optional(),
    playbackSpeed: Joi.number().min(0.5).max(2.0).optional(),
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    language: Joi.string().length(2).optional(),
    notifications: Joi.boolean().optional()
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
}

/**
 * Create validation middleware for request body
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    })

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ')
      return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'))
    }

    req.body = value
    next()
  }
}

/**
 * Create validation middleware for query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    })

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ')
      return next(new AppError(errorMessage, 400, 'VALIDATION_ERROR'))
    }

    req.query = value
    next()
  }
}

/**
 * Validate uploaded audio files
 */
const validateAudioFiles = (fieldNames = ['audio']) => {
  return (req, res, next) => {
    try {
      // Check if files exist
      if (!req.files && !req.file) {
        return next(new AppError('No audio files provided', 400, 'MISSING_AUDIO_FILES'))
      }

      let filesToValidate = []

      // Single file upload
      if (req.file) {
        filesToValidate.push(req.file)
      }

      // Multiple file upload
      if (req.files) {
        if (Array.isArray(req.files)) {
          filesToValidate = req.files
        } else {
          // Object format from multer fields
          filesToValidate = Object.values(req.files).flat()
        }
      }

      // Validate each file
      for (const file of filesToValidate) {
        const { error } = schemas.audioFile.validate(file)
        if (error) {
          const errorMessage = error.details.map(detail => detail.message).join(', ')
          return next(new AppError(`Audio file validation failed: ${errorMessage}`, 400, 'INVALID_AUDIO_FILE'))
        }

        // Additional checks
        if (file.size < 1000) { // Less than 1KB
          return next(new AppError('Audio file appears to be empty or corrupted', 400, 'EMPTY_AUDIO_FILE'))
        }
      }

      next()
    } catch (error) {
      next(new AppError('Audio file validation error', 400, 'AUDIO_VALIDATION_ERROR'))
    }
  }
}

/**
 * Sanitize and validate test type specific requests
 */
const validateTestType = () => {
  return (req, res, next) => {
    const testType = req.body.testType || req.params.testType

    if (!testType) {
      return next(new AppError('Test type is required', 400, 'MISSING_TEST_TYPE'))
    }

    const validTestTypes = ['quick-drill', 'part1', 'part2', 'part3', 'full-test']
    if (!validTestTypes.includes(testType)) {
      return next(new AppError(`Invalid test type. Valid types: ${validTestTypes.join(', ')}`, 400, 'INVALID_TEST_TYPE'))
    }

    // Test type specific validation
    switch (testType) {
      case 'part1':
      case 'part3':
        if (!req.body.questions) {
          return next(new AppError('Questions array is required for Part 1 and Part 3', 400, 'MISSING_QUESTIONS'))
        }
        break

      case 'part2':
        if (!req.body.topic && !req.body.question) {
          return next(new AppError('Topic or question is required for Part 2', 400, 'MISSING_TOPIC'))
        }
        break
    }

    next()
  }
}

/**
 * Rate limiting validation
 */
const validateRateLimit = () => {
  return (req, res, next) => {
    // Add rate limiting headers
    res.set({
      'X-RateLimit-Limit': req.rateLimit?.limit || 'N/A',
      'X-RateLimit-Remaining': req.rateLimit?.remaining || 'N/A',
      'X-RateLimit-Reset': req.rateLimit?.reset || 'N/A'
    })

    next()
  }
}

module.exports = {
  schemas,
  validateBody,
  validateQuery,
  validateAudioFiles,
  validateTestType,
  validateRateLimit,
  customJoi
}