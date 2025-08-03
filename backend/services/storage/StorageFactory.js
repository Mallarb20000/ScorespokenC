/**
 * =============================================================================
 * STORAGE FACTORY
 * =============================================================================
 * 
 * Factory pattern for creating storage instances based on configuration.
 * Makes it easy to switch between storage types without changing application code.
 */

const MemoryStorage = require('./MemoryStorage')
const DiskStorage = require('./DiskStorage')
// const S3Storage = require('./S3Storage') // Future implementation

class StorageFactory {
  static create(config) {
    const { type } = config

    switch (type) {
      case 'memory':
        return new MemoryStorage()
      
      case 'disk':
        return new DiskStorage(config.tempDir)
      
      case 's3':
        // return new S3Storage(config.s3) // Future implementation
        throw new Error('S3 storage not yet implemented')
      
      default:
        throw new Error(`Unknown storage type: ${type}`)
    }
  }

  static async createWithCleanup(config) {
    const storage = StorageFactory.create(config)
    
    // Set up automatic cleanup if configured
    if (config.cleanupInterval > 0) {
      const cleanupAge = config.cleanupInterval * 2 // Clean files older than 2x the interval
      
      setInterval(async () => {
        try {
          const cleanedCount = await storage.cleanup(cleanupAge)
          if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} old files`)
          }
        } catch (error) {
          console.error('❌ Cleanup failed:', error)
        }
      }, config.cleanupInterval)

      console.log(`✅ Automatic cleanup enabled (every ${config.cleanupInterval / 1000}s)`)
    }

    return storage
  }
}

module.exports = StorageFactory