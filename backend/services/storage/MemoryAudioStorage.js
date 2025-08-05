/**
 * =============================================================================
 * MEMORY AUDIO STORAGE
 * =============================================================================
 * 
 * Temporary in-memory storage for immediate audio playback in results.
 * Audio data expires after session or server restart.
 * Used alongside Supabase for optimal user experience.
 */

class MemoryAudioStorage {
  constructor(config = {}) {
    // Singleton pattern - use shared instance if exists
    if (MemoryAudioStorage.instance) {
      return MemoryAudioStorage.instance
    }
    this.config = {
      maxSize: config.maxSize || 50 * 1024 * 1024, // Reduced to 50MB to be safer
      ttl: config.ttl || 15 * 60 * 1000, // Reduced to 15 minutes TTL
      cleanupInterval: config.cleanupInterval || 2 * 60 * 1000, // Increased cleanup frequency to 2 minutes
      diskOverflow: config.diskOverflow !== false, // Enable disk overflow by default
      maxItemSize: config.maxItemSize || 10 * 1024 * 1024, // 10MB max per item
      ...config
    }
    
    // In-memory storage
    this.storage = new Map()
    this.metadata = new Map()
    this.currentSize = 0
    
    // Disk overflow storage (fallback)
    this.diskOverflowStorage = null
    if (this.config.diskOverflow) {
      this.initializeDiskOverflow()
    }
    
    // LRU tracking for intelligent eviction
    this.accessOrder = new Map() // id -> last access time
    
    // Start cleanup timer
    this.startCleanupTimer()
    
    // Store singleton instance
    MemoryAudioStorage.instance = this
    
    console.log(`📝 Memory Audio Storage initialized (${(this.config.maxSize / 1024 / 1024).toFixed(1)}MB limit, ${this.config.diskOverflow ? 'with' : 'without'} disk overflow)`)
  }

  /**
   * Initialize disk overflow storage
   */
  initializeDiskOverflow() {
    try {
      const DiskStorage = require('./DiskStorage')
      this.diskOverflowStorage = new DiskStorage({
        baseDir: './temp/memory_overflow',
        maxFileSize: this.config.maxItemSize,
        cleanupInterval: this.config.cleanupInterval
      })
      console.log('💾 Disk overflow storage initialized')
    } catch (error) {
      console.warn('⚠️  Could not initialize disk overflow storage:', error.message)
      this.config.diskOverflow = false
    }
  }

  /**
   * Store audio in memory for immediate access
   */
  store(audioBuffer, filename, mimetype, metadata = {}) {
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const size = audioBuffer.length
    
    // Check individual item size limit
    if (size > this.config.maxItemSize) {
      if (this.config.diskOverflow && this.diskOverflowStorage) {
        console.log(`📁 Item too large for memory (${(size / 1024 / 1024).toFixed(1)}MB), storing to disk overflow`)
        return this.diskOverflowStorage.store(audioBuffer, filename, mimetype, metadata)
      } else {
        throw new Error(`Item size (${(size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed (${(this.config.maxItemSize / 1024 / 1024).toFixed(1)}MB)`)
      }
    }
    
    // Make room in memory using intelligent eviction
    if (this.currentSize + size > this.config.maxSize) {
      console.warn(`⚠️  Memory storage full (${(this.currentSize / 1024 / 1024).toFixed(1)}MB), making room...`)
      
      // Try cleanup first
      const cleaned = this.cleanup(true)
      console.log(`🧹 Cleaned up ${cleaned.cleanedCount} items, freed ${(cleaned.freedSize / 1024 / 1024).toFixed(1)}MB`)
      
      // If still not enough room, use LRU eviction
      if (this.currentSize + size > this.config.maxSize) {
        const evicted = this.evictLRU(size)
        console.log(`🔄 Evicted ${evicted.evictedCount} items via LRU, freed ${(evicted.freedSize / 1024 / 1024).toFixed(1)}MB`)
      }
      
      // If still not enough room, use disk overflow
      if (this.currentSize + size > this.config.maxSize) {
        if (this.config.diskOverflow && this.diskOverflowStorage) {
          console.log(`💾 Memory still full, storing to disk overflow`)
          return this.diskOverflowStorage.store(audioBuffer, filename, mimetype, metadata)
        } else {
          throw new Error(`Memory storage capacity exceeded: need ${(size / 1024 / 1024).toFixed(1)}MB but only ${((this.config.maxSize - this.currentSize) / 1024 / 1024).toFixed(1)}MB available`)
        }
      }
    }
    
    // Store audio data in memory
    this.storage.set(id, audioBuffer)
    this.metadata.set(id, {
      filename,
      mimetype,
      size,
      created: Date.now(),
      ttl: Date.now() + this.config.ttl,
      location: 'memory',
      ...metadata
    })
    this.accessOrder.set(id, Date.now())
    
    this.currentSize += size
    
    console.log(`📝 Stored in memory: ${filename} (${(size / 1024).toFixed(1)}KB) - ID: ${id}`)
    return id
  }

  /**
   * Evict least recently used items to make room
   */
  evictLRU(requiredSpace) {
    const sortedByAccess = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1]) // Sort by access time (oldest first)
    
    let freedSize = 0
    let evictedCount = 0
    
    for (const [id] of sortedByAccess) {
      if (this.currentSize + requiredSpace <= this.config.maxSize) {
        break // We've freed enough space
      }
      
      const metadata = this.metadata.get(id)
      if (metadata && metadata.location === 'memory') {
        // Try to move to disk overflow before deleting
        if (this.config.diskOverflow && this.diskOverflowStorage) {
          try {
            const audioBuffer = this.storage.get(id)
            if (audioBuffer) {
              this.diskOverflowStorage.store(audioBuffer, metadata.filename, metadata.mimetype, {
                ...metadata,
                location: 'disk_overflow',
                evicted_from_memory: Date.now()
              })
              console.log(`💾 Moved ${id} to disk overflow due to LRU eviction`)
            }
          } catch (error) {
            console.warn(`⚠️  Failed to move ${id} to disk overflow:`, error.message)
          }
        }
        
        freedSize += metadata.size
        this.delete(id)
        evictedCount++
      }
    }
    
    return { evictedCount, freedSize }
  }

  /**
   * Retrieve audio from memory or disk overflow
   */
  get(id) {
    // Update access time for LRU tracking
    this.accessOrder.set(id, Date.now())
    
    const audioBuffer = this.storage.get(id)
    const metadata = this.metadata.get(id)
    
    if (audioBuffer && metadata) {
      // Check TTL
      if (Date.now() > metadata.ttl) {
        this.delete(id)
        return null
      }
      
      return {
        buffer: audioBuffer,
        metadata
      }
    }
    
    // Try disk overflow storage if enabled
    if (this.config.diskOverflow && this.diskOverflowStorage) {
      try {
        const diskData = this.diskOverflowStorage.get(id)
        if (diskData) {
          console.log(`💾 Retrieved ${id} from disk overflow`)
          return diskData
        }
      } catch (error) {
        console.warn(`⚠️  Failed to retrieve ${id} from disk overflow:`, error.message)
      }
    }
    
    return null
  }

  /**
   * Check if audio exists in memory
   */
  exists(id) {
    return this.storage.has(id) && this.metadata.has(id)
  }

  /**
   * Delete audio from memory
   */
  delete(id) {
    const metadata = this.metadata.get(id)
    if (metadata) {
      this.currentSize -= metadata.size
    }
    
    this.storage.delete(id)
    this.metadata.delete(id)
    
    console.log(`🗑️  Deleted from memory: ${id}`)
    return true
  }

  /**
   * Generate audio URL for memory-stored files
   */
  getUrl(id) {
    if (!this.exists(id)) {
      return null
    }
    
    // Return a special memory URL that can be handled by the audio endpoint
    return `/api/audio/memory/${id}`
  }

  /**
   * Get all stored audio IDs
   */
  list() {
    return Array.from(this.metadata.keys()).map(id => ({
      id,
      ...this.metadata.get(id)
    }))
  }

  /**
   * Cleanup expired entries
   */
  cleanup(force = false) {
    const now = Date.now()
    let cleanedCount = 0
    let freedSize = 0
    
    for (const [id, metadata] of this.metadata.entries()) {
      if (force || now > metadata.ttl) {
        freedSize += metadata.size
        this.delete(id)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Memory cleanup: ${cleanedCount} files, ${(freedSize / 1024).toFixed(1)}KB freed`)
    }
    
    return { cleanedCount, freedSize }
  }

  /**
   * Start periodic cleanup timer
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
    
    console.log(`⏰ Memory cleanup timer started (${this.config.cleanupInterval / 1000}s interval)`)
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
      console.log('⏰ Memory cleanup timer stopped')
    }
  }

  /**
   * Get storage statistics
   */
  getStats() {
    const entries = this.storage.size
    const totalSize = this.currentSize
    const avgSize = entries > 0 ? totalSize / entries : 0
    
    return {
      entries,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      avgSize: Math.round(avgSize),
      avgSizeKB: (avgSize / 1024).toFixed(1),
      maxSize: this.config.maxSize,
      maxSizeMB: (this.config.maxSize / 1024 / 1024).toFixed(2),
      usage: ((totalSize / this.config.maxSize) * 100).toFixed(1) + '%',
      ttlMinutes: this.config.ttl / 60 / 1000
    }
  }

  /**
   * Clear all stored audio
   */
  clear() {
    const count = this.storage.size
    const size = this.currentSize
    
    this.storage.clear()
    this.metadata.clear()
    this.currentSize = 0
    
    console.log(`🧹 Memory storage cleared: ${count} files, ${(size / 1024).toFixed(1)}KB freed`)
    return { count, size }
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    this.stopCleanupTimer()
    this.clear()
    console.log('📝 Memory Audio Storage shutdown complete')
  }

  /**
   * Get singleton instance
   */
  static getInstance(config = {}) {
    if (!MemoryAudioStorage.instance) {
      new MemoryAudioStorage(config)
    }
    return MemoryAudioStorage.instance
  }
}

module.exports = MemoryAudioStorage