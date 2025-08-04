/**
 * =============================================================================
 * CONFIGURATION MANAGEMENT
 * =============================================================================
 * 
 * Centralized configuration for the application.
 * Makes it easy to switch between development/production environments
 * and modify settings without changing core application code.
 */

require('dotenv').config()

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3002,
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  // AI Service Configuration
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.AI_MODEL || 'gemini-2.0-flash-exp',
    maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 3,
    timeout: parseInt(process.env.AI_TIMEOUT) || 30000
  },

  // Storage Configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'memory', // 'memory', 'disk', 's3'
    tempDir: process.env.TEMP_DIR || './temp',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['audio/webm', 'audio/wav', 'audio/mp3'],
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 3600000, // 1 hour
    
    // S3 Configuration (for future use)
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  },

  // Database Configuration (for future use)
  database: {
    type: process.env.DB_TYPE || 'none', // 'none', 'postgresql', 'mongodb'
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'scorespoken',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
  },

  // Cache Configuration (for future use)
  cache: {
    type: process.env.CACHE_TYPE || 'memory', // 'memory', 'redis'
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD
    },
    ttl: parseInt(process.env.CACHE_TTL) || 3600 // 1 hour
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // requests per window
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
  },

  // Firebase Configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT, // JSON string
    webApiKey: process.env.FIREBASE_WEB_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  // Feature Flags
  features: {
    enableCaching: process.env.ENABLE_CACHING === 'true',
    enableQueue: process.env.ENABLE_QUEUE === 'true',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    enableBatchProcessing: process.env.ENABLE_BATCH_PROCESSING === 'true'
  }
}

// Validation
const validateConfig = () => {
  const errors = []

  if (!config.ai.apiKey) {
    errors.push('GEMINI_API_KEY is required')
  }

  // Firebase validation (optional - can run without Firebase)
  if (config.firebase.projectId && !config.firebase.serviceAccount) {
    console.warn('⚠️  Firebase project ID provided but no service account - using default credentials')
  }

  if (config.storage.type === 's3') {
    if (!config.storage.s3.bucket) errors.push('S3_BUCKET is required when using S3 storage')
    if (!config.storage.s3.accessKeyId) errors.push('S3_ACCESS_KEY_ID is required when using S3 storage')
    if (!config.storage.s3.secretAccessKey) errors.push('S3_SECRET_ACCESS_KEY is required when using S3 storage')
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:')
    errors.forEach(error => console.error(`  - ${error}`))
    process.exit(1)
  }
}

// Run validation
validateConfig()

module.exports = config