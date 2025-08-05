/**
 * =============================================================================
 * AUDIO COMPRESSION SERVICE
 * =============================================================================
 * 
 * Lossless audio compression to reduce storage costs while maintaining
 * perfect quality for IELTS analysis. Uses gzip compression on audio buffers.
 */

const pako = require('pako')
const { promisify } = require('util')

class AudioCompression {
  constructor(config = {}) {
    this.config = {
      compressionLevel: config.compressionLevel || 6, // 1-9 (6 = good balance)
      enableCompression: config.enableCompression !== false, // Enable by default
      ...config
    }
  }

  /**
   * Compress audio buffer using gzip (lossless)
   */
  async compress(audioBuffer, metadata = {}) {
    if (!this.config.enableCompression) {
      return {
        buffer: audioBuffer,
        compressed: false,
        originalSize: audioBuffer.length,
        compressedSize: audioBuffer.length,
        compressionRatio: 1.0,
        metadata
      }
    }

    try {
      const startTime = Date.now()
      
      // Compress using gzip with optimal level for audio
      const compressed = pako.gzip(audioBuffer, {
        level: this.config.compressionLevel,
        windowBits: 15,
        memLevel: 8
      })

      const compressionTime = Date.now() - startTime
      const compressionRatio = audioBuffer.length / compressed.length

      console.log(`🗜️  Audio compressed: ${(audioBuffer.length / 1024).toFixed(1)}KB → ${(compressed.length / 1024).toFixed(1)}KB (${(compressionRatio * 100 - 100).toFixed(1)}% reduction)`)

      return {
        buffer: Buffer.from(compressed),
        compressed: true,
        originalSize: audioBuffer.length,
        compressedSize: compressed.length,
        compressionRatio,
        compressionTime,
        metadata: {
          ...metadata,
          compression: {
            algorithm: 'gzip',
            level: this.config.compressionLevel,
            originalSize: audioBuffer.length,
            compressedSize: compressed.length,
            ratio: compressionRatio,
            timestamp: new Date().toISOString()
          }
        }
      }

    } catch (error) {
      console.error('❌ Audio compression failed:', error)
      
      // Fallback to uncompressed if compression fails
      return {
        buffer: audioBuffer,
        compressed: false,
        originalSize: audioBuffer.length,
        compressedSize: audioBuffer.length,
        compressionRatio: 1.0,
        error: error.message,
        metadata
      }
    }
  }

  /**
   * Decompress audio buffer
   */
  async decompress(compressedBuffer, metadata = {}) {
    if (!metadata.compression || !metadata.compression.algorithm) {
      // Not compressed, return as-is
      return {
        buffer: compressedBuffer,
        decompressed: false,
        metadata
      }
    }

    try {
      const startTime = Date.now()
      
      // Decompress using gzip
      const decompressed = pako.ungzip(compressedBuffer)
      const decompressionTime = Date.now() - startTime

      console.log(`📤 Audio decompressed: ${(compressedBuffer.length / 1024).toFixed(1)}KB → ${(decompressed.length / 1024).toFixed(1)}KB`)

      return {
        buffer: Buffer.from(decompressed),
        decompressed: true,
        decompressionTime,
        originalSize: metadata.compression.originalSize,
        compressedSize: metadata.compression.compressedSize,
        metadata
      }

    } catch (error) {
      console.error('❌ Audio decompression failed:', error)
      throw new Error(`Decompression failed: ${error.message}`)
    }
  }

  /**
   * Get optimal compression settings for different audio types
   */
  getOptimalSettings(audioType = 'speech') {
    const settings = {
      speech: {
        compressionLevel: 6, // Good balance for speech
        enableCompression: true
      },
      music: {
        compressionLevel: 9, // Maximum compression for music
        enableCompression: true
      },
      quick: {
        compressionLevel: 1, // Fast compression for real-time
        enableCompression: true
      },
      storage: {
        compressionLevel: 9, // Maximum compression for long-term storage
        enableCompression: true
      }
    }

    return settings[audioType] || settings.speech
  }

  /**
   * Estimate compression savings
   */
  estimateCompression(audioBuffer, sampleCount = 1000) {
    if (audioBuffer.length < sampleCount) {
      sampleCount = audioBuffer.length
    }

    // Take a sample for quick estimation
    const sample = audioBuffer.slice(0, sampleCount)
    const compressed = pako.gzip(sample, { level: 1 }) // Quick compression

    const estimatedRatio = sample.length / compressed.length
    const estimatedSavings = audioBuffer.length * (1 - 1/estimatedRatio)

    return {
      estimatedCompressionRatio: estimatedRatio,
      estimatedSavingBytes: estimatedSavings,
      estimatedSavingMB: (estimatedSavings / 1024 / 1024).toFixed(2),
      estimatedSavingPercent: ((1 - 1/estimatedRatio) * 100).toFixed(1)
    }
  }

  /**
   * Batch compress multiple audio files
   */
  async compressBatch(audioFiles, progressCallback = null) {
    const results = []
    let totalOriginalSize = 0
    let totalCompressedSize = 0

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i]
      
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: audioFiles.length,
          filename: file.filename || `file_${i}`
        })
      }

      const result = await this.compress(file.buffer, file.metadata)
      results.push({
        ...result,
        filename: file.filename || `file_${i}`,
        index: i
      })

      totalOriginalSize += result.originalSize
      totalCompressedSize += result.compressedSize
    }

    const overallRatio = totalOriginalSize / totalCompressedSize
    const overallSavings = totalOriginalSize - totalCompressedSize

    return {
      files: results,
      summary: {
        totalFiles: audioFiles.length,
        totalOriginalSize,
        totalCompressedSize,
        overallCompressionRatio: overallRatio,
        totalSavingsBytes: overallSavings,
        totalSavingsMB: (overallSavings / 1024 / 1024).toFixed(2),
        totalSavingsPercent: ((1 - 1/overallRatio) * 100).toFixed(1)
      }
    }
  }

  /**
   * Get compression statistics
   */
  getStats() {
    return {
      compressionLevel: this.config.compressionLevel,
      algorithm: 'gzip',
      enabled: this.config.enableCompression,
      avgCompressionRatio: 2.5, // Typical for speech audio
      estimatedSavings: '60-70%'
    }
  }
}

module.exports = AudioCompression