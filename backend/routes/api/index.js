/**
 * =============================================================================
 * API ROUTES INDEX
 * =============================================================================
 * 
 * Main API router that organizes all API endpoints.
 * Follows RESTful conventions and groups related endpoints.
 */

const express = require('express')
const router = express.Router()

// Import route modules
const analysisRoutes = require('./analysis')
const healthRoutes = require('./health')
const audioRoutes = require('./audio')
// const userRoutes = require('./users') // Future implementation
// const testRoutes = require('./tests') // Future implementation

// Mount route modules
router.use('/analyze', analysisRoutes)
router.use('/health', healthRoutes)
router.use('/audio', audioRoutes)
// router.use('/users', userRoutes) // Future implementation
// router.use('/tests', testRoutes) // Future implementation

// API information endpoint
router.get('/', (req, res) => {
  res.json({
    service: 'ScoreSpoken API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      analysis: '/api/analyze',
      health: '/api/health',
      audio: '/api/audio'
    },
    documentation: '/api/docs' // Future implementation
  })
})

module.exports = router