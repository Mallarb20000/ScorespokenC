/**
 * =============================================================================
 * DISK STORAGE IMPLEMENTATION
 * =============================================================================
 * 
 * File system based storage for better scalability than memory storage.
 * Files are stored on disk with automatic cleanup and metadata tracking.
 * Easy migration path from memory storage.
 */

const StorageInterface = require('./StorageInterface')
const fs = require('fs').promises
const path = require('path')
const { v4: uuidv4 } = require('uuid')

class DiskStorage extends StorageInterface {
  constructor(baseDir = './temp') {
    super()
    this.baseDir = baseDir
    this.metadataFile = path.join(baseDir, '.metadata.json')
    this.metadata = new Map()
    
    this.init()
  }

  async init() {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.baseDir, { recursive: true })
      
      // Load existing metadata
      try {
        const data = await fs.readFile(this.metadataFile, 'utf8')
        const metadataObj = JSON.parse(data)
        this.metadata = new Map(Object.entries(metadataObj))
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
        this.metadata = new Map()
      }
    } catch (error) {
      console.error('Failed to initialize disk storage:', error)
      throw error
    }
  }

  async store(fileBuffer, filename, mimetype) {
    const identifier = `${Date.now()}_${uuidv4()}_${filename}`
    const filePath = path.join(this.baseDir, identifier)
    
    const metadata = {
      filename,
      mimetype,
      size: fileBuffer.length,
      created: new Date(),
      identifier,
      path: filePath
    }

    try {
      // Write file to disk
      await fs.writeFile(filePath, fileBuffer)
      
      // Store metadata
      this.metadata.set(identifier, metadata)
      await this.saveMetadata()

      return identifier
    } catch (error) {
      console.error('Failed to store file:', error)
      throw error
    }
  }

  async retrieve(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      throw new Error(`File not found: ${identifier}`)
    }

    try {
      return await fs.readFile(metadata.path)
    } catch (error) {
      console.error('Failed to retrieve file:', error)
      throw error
    }
  }

  async delete(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      return false
    }

    try {
      await fs.unlink(metadata.path)
      this.metadata.delete(identifier)
      await this.saveMetadata()
      return true
    } catch (error) {
      console.error('Failed to delete file:', error)
      return false
    }
  }

  async exists(identifier) {
    const metadata = this.metadata.get(identifier)
    if (!metadata) {
      return false
    }

    try {
      await fs.access(metadata.path)
      return true
    } catch {
      // File doesn't exist on disk, remove from metadata
      this.metadata.delete(identifier)
      await this.saveMetadata()
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
    return `/temp/${identifier}`
  }

  // Save metadata to disk
  async saveMetadata() {
    try {
      const metadataObj = Object.fromEntries(this.metadata)
      await fs.writeFile(this.metadataFile, JSON.stringify(metadataObj, null, 2))
    } catch (error) {
      console.error('Failed to save metadata:', error)
    }
  }

  // Disk storage specific methods
  async getStats() {
    const files = Array.from(this.metadata.values())
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    
    // Get actual disk usage
    let actualSize = 0
    try {
      const dirents = await fs.readdir(this.baseDir, { withFileTypes: true })
      for (const dirent of dirents) {
        if (dirent.isFile() && dirent.name !== '.metadata.json') {
          const filePath = path.join(this.baseDir, dirent.name)
          const stats = await fs.stat(filePath)
          actualSize += stats.size
        }
      }
    } catch (error) {
      console.error('Failed to calculate disk usage:', error)
    }

    return {
      fileCount: this.metadata.size,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      actualSizeMB: (actualSize / 1024 / 1024).toFixed(2),
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

      const fileBuffer = await fs.readFile(metadata.path)

      res.set({
        'Content-Type': metadata.mimetype,
        'Content-Length': metadata.size,
        'Content-Disposition': `inline; filename="${metadata.filename}"`
      })

      res.send(fileBuffer)
    } catch (error) {
      console.error('Error serving file:', error)
      res.status(500).json({ error: 'Error serving file' })
    }
  }
}

module.exports = DiskStorage