/**
 * =============================================================================
 * MEMORY STORAGE IMPLEMENTATION
 * =============================================================================
 * 
 * In-memory storage for development and testing.
 * Files are stored in RAM - not suitable for production with multiple users.
 * Easy to switch to disk/S3 storage later using the same interface.
 */

const StorageInterface = require('./StorageInterface')
const { v4: uuidv4 } = require('uuid')

class MemoryStorage extends StorageInterface {
  constructor() {
    super()
    this.files = new Map() // Map<identifier, {buffer, metadata}>
    this.urlMap = new Map() // Map<identifier, objectUrl>
  }

  async store(fileBuffer, filename, mimetype) {
    const identifier = `${Date.now()}_${uuidv4()}_${filename}`
    
    const metadata = {
      filename,
      mimetype,
      size: fileBuffer.length,
      created: new Date(),
      identifier
    }

    this.files.set(identifier, {
      buffer: fileBuffer,
      metadata
    })

    // Create object URL for browser playback
    const blob = new Blob([fileBuffer], { type: mimetype })
    const objectUrl = `/temp/${identifier}`
    this.urlMap.set(identifier, objectUrl)

    return identifier
  }

  async retrieve(identifier) {
    const file = this.files.get(identifier)
    if (!file) {
      throw new Error(`File not found: ${identifier}`)
    }
    return file.buffer
  }

  async delete(identifier) {
    const deleted = this.files.delete(identifier)
    this.urlMap.delete(identifier)
    return deleted
  }

  async exists(identifier) {
    return this.files.has(identifier)
  }

  async getMetadata(identifier) {
    const file = this.files.get(identifier)
    if (!file) {
      throw new Error(`File not found: ${identifier}`)
    }
    return file.metadata
  }

  async list(prefix = '') {
    const identifiers = Array.from(this.files.keys())
    if (prefix) {
      return identifiers.filter(id => id.startsWith(prefix))
    }
    return identifiers
  }

  async cleanup(maxAge) {
    const now = Date.now()
    let cleanedCount = 0

    for (const [identifier, file] of this.files.entries()) {
      const age = now - file.metadata.created.getTime()
      if (age > maxAge) {
        await this.delete(identifier)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  async getPublicUrl(identifier) {
    const url = this.urlMap.get(identifier)
    if (!url) {
      throw new Error(`File not found: ${identifier}`)
    }
    return url
  }

  // Memory storage specific methods
  getStats() {
    const files = Array.from(this.files.values())
    const totalSize = files.reduce((sum, file) => sum + file.metadata.size, 0)
    
    return {
      fileCount: this.files.size,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      oldestFile: files.reduce((oldest, file) => {
        return !oldest || file.metadata.created < oldest.metadata.created ? file : oldest
      }, null)?.metadata.created
    }
  }

  // Serve file content for HTTP responses
  async serveFile(identifier, res) {
    try {
      const file = this.files.get(identifier)
      if (!file) {
        return res.status(404).json({ error: 'File not found' })
      }

      res.set({
        'Content-Type': file.metadata.mimetype,
        'Content-Length': file.metadata.size,
        'Content-Disposition': `inline; filename="${file.metadata.filename}"`
      })

      res.send(file.buffer)
    } catch (error) {
      res.status(500).json({ error: 'Error serving file' })
    }
  }
}

module.exports = MemoryStorage