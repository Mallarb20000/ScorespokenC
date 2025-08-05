/**
 * =============================================================================
 * SUPABASE STORAGE IMPLEMENTATION
 * =============================================================================
 * 
 * Cloud storage using Supabase Storage for scalable file management.
 * Features user isolation, automatic cleanup, and cost-effective pricing.
 * Perfect for MVP with 1GB free tier + 2GB bandwidth.
 */

const StorageInterface = require('./StorageInterface')
const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')

class SupabaseStorage extends StorageInterface {
  constructor(config) {
    super()
    this.config = config
    this.bucket = config.bucket || 'audio-files'
    
    // Connection pooling settings
    this.connectionPool = {
      maxConnections: config.maxConnections || 10,
      connectionTimeout: config.connectionTimeout || 30000,
      idleTimeout: config.idleTimeout || 60000,
      retryAttempts: config.retryAttempts || 3
    }
    
    // Initialize Supabase client with optimized settings
    this.supabase = createClient(config.url, config.serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Connection': 'keep-alive'
        }
      },
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    })
    
    // Connection management
    this.activeConnections = 0
    this.connectionQueue = []
    this.connectionStats = {
      totalConnections: 0,
      successfulOperations: 0,
      failedOperations: 0,
      avgResponseTime: 0,
      lastOperation: null
    }
    
    this.metadata = new Map() // Local metadata cache
    this.initialized = false
  }

  /**
   * Acquire connection from pool with queue management
   */
  async acquireConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection acquisition timeout'))
      }, this.connectionPool.connectionTimeout)

      if (this.activeConnections < this.connectionPool.maxConnections) {
        this.activeConnections++
        this.connectionStats.totalConnections++
        clearTimeout(timeout)
        resolve()
      } else {
        // Add to queue
        this.connectionQueue.push({ resolve, reject, timeout })
      }
    })
  }

  /**
   * Release connection back to pool
   */
  releaseConnection() {
    this.activeConnections--
    
    // Process queue if available
    if (this.connectionQueue.length > 0 && this.activeConnections < this.connectionPool.maxConnections) {
      const { resolve, reject, timeout } = this.connectionQueue.shift()
      this.activeConnections++
      this.connectionStats.totalConnections++
      clearTimeout(timeout)
      resolve()
    }
  }

  /**
   * Execute operation with connection management and retry logic
   */
  async executeWithRetry(operation, operationName = 'unknown') {
    let lastError = null
    
    for (let attempt = 1; attempt <= this.connectionPool.retryAttempts; attempt++) {
      try {
        await this.acquireConnection()
        const startTime = Date.now()
        
        const result = await operation()
        
        const responseTime = Date.now() - startTime
        this.updateStats(responseTime, true, operationName)
        this.releaseConnection()
        
        return result
      } catch (error) {
        this.releaseConnection()
        lastError = error
        
        this.updateStats(0, false, operationName)
        
        if (attempt < this.connectionPool.retryAttempts) {
          console.warn(`⚠️  Supabase ${operationName} attempt ${attempt} failed, retrying... (${error.message})`)
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
        }
      }
    }
    
    throw new Error(`Supabase ${operationName} failed after ${this.connectionPool.retryAttempts} attempts: ${lastError.message}`)
  }

  /**
   * Update connection statistics
   */
  updateStats(responseTime, success, operationName) {
    if (success) {
      this.connectionStats.successfulOperations++
      // Update running average
      const total = this.connectionStats.successfulOperations
      this.connectionStats.avgResponseTime = 
        ((this.connectionStats.avgResponseTime * (total - 1)) + responseTime) / total
    } else {
      this.connectionStats.failedOperations++
    }
    
    this.connectionStats.lastOperation = {
      name: operationName,
      timestamp: new Date().toISOString(),
      success,
      responseTime: success ? responseTime : null
    }
  }

  /**
   * Delay utility for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async init() {
    if (this.initialized) return
    
    try {
      console.log(`🔄 Initializing Supabase Storage with URL: ${this.config.url}`)
      console.log(`🔄 Using bucket: ${this.bucket}`)
      
      // Test connection first
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets()
      
      if (listError) {
        console.error('❌ Failed to connect to Supabase Storage:', listError)
        throw new Error(`Supabase connection failed: ${listError.message}. Please check your SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file`)
      }
      
      console.log(`✅ Connected to Supabase Storage. Found ${buckets?.length || 0} buckets`)
      
      const bucketExists = buckets?.some(b => b.name === this.bucket)
      console.log(`🔍 Checking if bucket '${this.bucket}' exists: ${bucketExists}`)
      
      if (!bucketExists) {
        console.log(`🔄 Creating bucket '${this.bucket}'...`)
        const { error } = await this.supabase.storage.createBucket(this.bucket, {
          public: false, // Private bucket for security
          fileSizeLimit: this.config.maxFileSize,
          allowedMimeTypes: this.config.allowedTypes
        })
        
        if (error) {
          console.error('❌ Failed to create Supabase bucket:', error)
          throw new Error(`Bucket creation failed: ${error.message}. Error code: ${error.error_code || 'unknown'}`)
        }
        
        console.log(`✅ Created Supabase bucket: ${this.bucket}`)
      } else {
        console.log(`✅ Bucket '${this.bucket}' already exists`)
      }
      
      this.initialized = true
      console.log('✅ Supabase Storage initialized successfully')
    } catch (error) {
      console.error('❌ Supabase Storage initialization failed:', error)
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n')[0]
      })
      throw error
    }
  }

  async store(fileBuffer, filename, mimetype, userId = 'anonymous', audioMetadata = {}) {
    try {
      await this.init()
      
      const identifier = `${Date.now()}_${uuidv4()}_${filename}`
      const filePath = `${userId}/${identifier}` // User isolation in path
      
      const metadata = {
        filename,
        mimetype,
        size: fileBuffer.length,
        created: new Date(),
        identifier,
        userId,
        path: filePath,
        bucket: this.bucket,
        // Include audio metadata for duration, etc.
        ...audioMetadata
      }

      // Use connection pooling for upload operation
      return await this.executeWithRetry(async () => {
        // Upload file to Supabase Storage with audio metadata
        const { data, error } = await this.supabase.storage
          .from(this.bucket)
          .upload(filePath, fileBuffer, {
            contentType: mimetype,
            upsert: false, // Don't overwrite existing files
            metadata: {
              duration: audioMetadata.estimatedDuration || audioMetadata.duration || 0,
              originalFilename: filename,
              compressed: audioMetadata.compression ? 'true' : 'false',
              compressionRatio: audioMetadata.compression?.ratio || 1,
              uploadedAt: new Date().toISOString()
            }
          })

        if (error) {
          console.error('Supabase upload error:', error)
          throw new Error(`File upload failed: ${error.message}`)
        }

        // Store metadata locally for quick access
        this.metadata.set(identifier, metadata)

        console.log(`✅ File uploaded to Supabase: ${filePath}`)
        return identifier
        
      }, 'store') // Close executeWithRetry function call
      
    } catch (error) {
      // CRITICAL: Never let Supabase errors block the main application flow
      console.error(`❌ Supabase storage failed for ${filename}, but this will not block AI processing:`, error.message)
      throw error // Re-throw for background handling, but ensure it's caught in background operations
    }
  }

  async retrieve(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      throw new Error(`File not found: ${identifier}`)
    }

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .download(metadata.path)

      if (error) {
        throw new Error(`File download failed: ${error.message}`)
      }

      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer()
      return Buffer.from(arrayBuffer)

    } catch (error) {
      console.error('Failed to retrieve file from Supabase:', error)
      throw error
    }
  }

  async delete(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      return false
    }

    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([metadata.path])

      if (error) {
        console.error('Supabase delete error:', error)
        return false
      }

      // Remove from local metadata
      this.metadata.delete(identifier)
      console.log(`✅ File deleted from Supabase: ${metadata.path}`)
      return true

    } catch (error) {
      console.error('Failed to delete file from Supabase:', error)
      return false
    }
  }

  async exists(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      return false
    }

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(metadata.userId, {
          search: identifier
        })

      return !error && data && data.length > 0
    } catch {
      return false
    }
  }

  async getMetadata(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      throw new Error(`File not found: ${identifier}`)
    }
    return metadata
  }

  async list(prefix = '') {
    const identifiers = Array.from(this.metadata.keys())
    if (prefix) {
      return identifiers.filter(id => id.startsWith(prefix))
    }
    return identifiers
  }

  async cleanup(maxAge) {
    const now = Date.now()
    let cleanedCount = 0

    for (const [identifier, metadata] of this.metadata.entries()) {
      const age = now - new Date(metadata.created).getTime()
      if (age > maxAge) {
        const deleted = await this.delete(identifier)
        if (deleted) {
          cleanedCount++
        }
      }
    }

    return cleanedCount
  }

  async getPublicUrl(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      throw new Error(`File not found: ${identifier}`)
    }

    // Generate signed URL for 30-day access
    const expirySeconds = this.config.signUrlExpirySeconds || 30 * 24 * 60 * 60 // 30 days
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(metadata.path, expirySeconds)

    if (error) {
      throw new Error(`Failed to generate URL: ${error.message}`)
    }

    return data.signedUrl
  }

  // Supabase specific methods
  async getStats() {
    const files = Array.from(this.metadata.values())
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    
    // Get bucket info
    let bucketSize = 0
    try {
      const { data: bucketInfo } = await this.supabase.storage
        .from(this.bucket)
        .list()
      
      bucketSize = bucketInfo?.reduce((sum, item) => sum + (item.metadata?.size || 0), 0) || 0
    } catch (error) {
      console.warn('Could not fetch bucket stats:', error.message)
    }

    return {
      fileCount: this.metadata.size,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      bucketSizeMB: (bucketSize / 1024 / 1024).toFixed(2),
      bucket: this.bucket,
      oldestFile: files.reduce((oldest, file) => {
        return !oldest || new Date(file.created) < new Date(oldest.created) ? file : oldest
      }, null)?.created
    }
  }

  // Serve file content for HTTP responses
  async serveFile(identifier, res) {
    try {
      const metadata = this.metadata.get(identifier)
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' })
      }

      // Get signed URL instead of downloading file
      const signedUrl = await this.getPublicUrl(identifier)
      
      // Redirect to signed URL
      res.redirect(signedUrl)

    } catch (error) {
      console.error('Error serving file:', error)
      res.status(500).json({ error: 'Error serving file' })
    }
  }

  // List files by user (helpful for user management)
  async listUserFiles(userId, limit = 100) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(userId, {
          limit,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) {
        throw new Error(`Failed to list user files: ${error.message}`)
      }

      return data.map(file => ({
        name: file.name,
        size: file.metadata?.size || 0,
        created: file.created_at,
        updated: file.updated_at
      }))
    } catch (error) {
      console.error('Failed to list user files:', error)
      return []
    }
  }
}

module.exports = SupabaseStorage