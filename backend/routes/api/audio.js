/**
 * =============================================================================
 * AUDIO ROUTES
 * =============================================================================
 * 
 * Routes for audio file operations including serving, metadata, and utilities.
 * Handles file serving for playback and audio management operations.
 */

const express = require('express')
const router = express.Router()

// Import services
const AudioService = require('../../services/audio/AudioService')
const StorageFactory = require('../../services/storage/StorageFactory')
const config = require('../../config')

// Initialize services
const audioService = new AudioService(config.storage)
const storage = StorageFactory.create(config.storage)

/**
 * GET /api/audio/:id
 * Serve audio file by ID for playback
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ 
        error: 'Audio ID is required',
        code: 'MISSING_AUDIO_ID'
      })
    }

    // Check if file exists
    const exists = await storage.exists(id)
    if (!exists) {
      return res.status(404).json({ 
        error: 'Audio file not found',
        code: 'AUDIO_NOT_FOUND'
      })
    }

    // Serve file using storage service
    if (typeof storage.serveFile === 'function') {
      await storage.serveFile(id, res)
    } else {
      // Fallback: retrieve buffer and serve manually
      const fileBuffer = await storage.retrieve(id)
      const metadata = await storage.getMetadata(id)

      res.set({
        'Content-Type': metadata.mimetype || 'audio/webm',
        'Content-Length': fileBuffer.length,
        'Content-Disposition': `inline; filename="${metadata.filename || id}"`
      })

      res.send(fileBuffer)
    }

  } catch (error) {
    console.error('Audio serving error:', error)
    res.status(500).json({ 
      error: 'Failed to serve audio file',
      message: error.message,
      code: 'AUDIO_SERVE_ERROR'
    })
  }
})

/**
 * GET /api/audio/:id/metadata
 * Get audio file metadata
 */
router.get('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ 
        error: 'Audio ID is required',
        code: 'MISSING_AUDIO_ID'
      })
    }

    // Check if file exists
    const exists = await storage.exists(id)
    if (!exists) {
      return res.status(404).json({ 
        error: 'Audio file not found',
        code: 'AUDIO_NOT_FOUND'
      })
    }

    // Get metadata from storage
    const storageMetadata = await storage.getMetadata(id)
    
    // Get additional audio metadata
    const fileBuffer = await storage.retrieve(id)
    const audioMetadata = await audioService.getAudioMetadata(fileBuffer, storageMetadata.mimetype)

    const response = {
      id,
      storage: storageMetadata,
      audio: audioMetadata,
      urls: {
        playback: `/api/audio/${id}`,
        metadata: `/api/audio/${id}/metadata`
      }
    }

    res.json(response)

  } catch (error) {
    console.error('Audio metadata error:', error)
    res.status(500).json({ 
      error: 'Failed to get audio metadata',
      message: error.message,
      code: 'METADATA_ERROR'
    })
  }
})

/**
 * DELETE /api/audio/:id
 * Delete audio file
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({ 
        error: 'Audio ID is required',
        code: 'MISSING_AUDIO_ID'
      })
    }

    // Check if file exists
    const exists = await storage.exists(id)
    if (!exists) {
      return res.status(404).json({ 
        error: 'Audio file not found',
        code: 'AUDIO_NOT_FOUND'
      })
    }

    // Delete file
    const deleted = await storage.delete(id)

    if (deleted) {
      res.json({ 
        success: true,
        message: 'Audio file deleted successfully',
        id
      })
    } else {
      res.status(500).json({ 
        error: 'Failed to delete audio file',
        code: 'DELETE_FAILED'
      })
    }

  } catch (error) {
    console.error('Audio deletion error:', error)
    res.status(500).json({ 
      error: 'Failed to delete audio file',
      message: error.message,
      code: 'DELETE_ERROR'
    })
  }
})

/**
 * GET /api/audio
 * List audio files (with optional filtering)
 */
router.get('/', async (req, res) => {
  try {
    const { prefix, limit = 50, offset = 0 } = req.query

    // Get file list
    const files = await storage.list(prefix)
    
    // Paginate results
    const startIndex = parseInt(offset)
    const limitNum = parseInt(limit)
    const paginatedFiles = files.slice(startIndex, startIndex + limitNum)

    // Get metadata for each file
    const fileDetails = await Promise.all(
      paginatedFiles.map(async (id) => {
        try {
          const metadata = await storage.getMetadata(id)
          return {
            id,
            filename: metadata.filename,
            size: metadata.size,
            created: metadata.created,
            mimetype: metadata.mimetype,
            urls: {
              playback: `/api/audio/${id}`,
              metadata: `/api/audio/${id}/metadata`
            }
          }
        } catch (error) {
          return {
            id,
            error: error.message
          }
        }
      })
    )

    const response = {
      files: fileDetails,
      pagination: {
        total: files.length,
        offset: startIndex,
        limit: limitNum,
        hasMore: startIndex + limitNum < files.length
      },
      filter: {
        prefix: prefix || null
      }
    }

    res.json(response)

  } catch (error) {
    console.error('Audio listing error:', error)
    res.status(500).json({ 
      error: 'Failed to list audio files',
      message: error.message,
      code: 'LIST_ERROR'
    })
  }
})

/**
 * POST /api/audio/cleanup
 * Clean up old audio files
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { maxAge = 3600000 } = req.body // Default: 1 hour

    if (typeof storage.cleanup !== 'function') {
      return res.status(501).json({ 
        error: 'Cleanup not supported by current storage type',
        code: 'CLEANUP_NOT_SUPPORTED'
      })
    }

    const cleanedCount = await storage.cleanup(maxAge)

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old audio files`,
      cleanedCount,
      maxAge
    })

  } catch (error) {
    console.error('Audio cleanup error:', error)
    res.status(500).json({ 
      error: 'Cleanup failed',
      message: error.message,
      code: 'CLEANUP_ERROR'
    })
  }
})

/**
 * GET /api/audio/stats
 * Get audio storage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    let stats = {
      service: 'Audio API',
      timestamp: new Date().toISOString()
    }

    // Get storage stats if available
    if (typeof storage.getStats === 'function') {
      const storageStats = await storage.getStats()
      stats.storage = storageStats
    }

    // Get audio service stats
    const audioStats = audioService.getStats()
    stats.audio = audioStats

    // Get file count
    try {
      const files = await storage.list()
      stats.fileCount = files.length
    } catch (error) {
      stats.fileCount = 'unavailable'
    }

    res.json(stats)

  } catch (error) {
    console.error('Audio stats error:', error)
    res.status(500).json({ 
      error: 'Failed to get audio statistics',
      message: error.message,
      code: 'STATS_ERROR'
    })
  }
})

// Legacy route for backward compatibility
router.get('/temp/:filename', (req, res) => {
  const { filename } = req.params
  
  // Extract ID from filename if it follows the pattern
  // This is a best-effort approach for backward compatibility
  const id = filename.replace(/\.(webm|wav|mp3)$/, '')
  
  req.params.id = id
  router.handle(req, res, '/:id')
})

module.exports = router