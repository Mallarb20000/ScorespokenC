/**
 * =============================================================================
 * AUDIO SERVICE
 * =============================================================================
 * 
 * Handles all audio processing operations including validation,
 * format conversion, merging, and metadata extraction.
 * Abstracted from storage and AI concerns for better separation.
 */

class AudioService {
  constructor(config = {}) {
    this.config = {
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      allowedFormats: config.allowedFormats || ['audio/webm', 'audio/wav', 'audio/mp3'],
      maxDuration: config.maxDuration || 300, // 5 minutes in seconds
      ...config
    }
  }

  /**
   * Validate audio file
   */
  validateAudio(fileBuffer, mimetype, filename) {
    const errors = []

    // Check file size
    if (fileBuffer.length > this.config.maxFileSize) {
      errors.push(`File too large: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB (max: ${this.config.maxFileSize / 1024 / 1024}MB)`)
    }

    // Check file format
    if (!this.config.allowedFormats.includes(mimetype)) {
      errors.push(`Unsupported format: ${mimetype} (allowed: ${this.config.allowedFormats.join(', ')})`)
    }

    // Check filename
    if (!filename || filename.trim().length === 0) {
      errors.push('Filename is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Extract audio metadata
   */
  async getAudioMetadata(fileBuffer, mimetype) {
    try {
      // Basic metadata extraction
      const metadata = {
        size: fileBuffer.length,
        sizeKB: Math.round(fileBuffer.length / 1024),
        sizeMB: Math.round(fileBuffer.length / 1024 / 1024 * 100) / 100,
        format: mimetype,
        estimatedDuration: this.estimateDuration(fileBuffer, mimetype),
        isValid: fileBuffer.length > 0
      }

      return metadata
    } catch (error) {
      console.error('Failed to extract audio metadata:', error)
      return {
        size: fileBuffer.length,
        format: mimetype,
        isValid: false,
        error: error.message
      }
    }
  }

  /**
   * Estimate audio duration based on file size and format
   */
  estimateDuration(fileBuffer, mimetype) {
    // Rough estimation based on typical bitrates
    const bitrates = {
      'audio/webm': 64000,  // 64 kbps typical for WebM
      'audio/wav': 1411200, // 1411.2 kbps for CD quality WAV
      'audio/mp3': 128000   // 128 kbps typical for MP3
    }

    const bitrate = bitrates[mimetype] || 64000
    const durationSeconds = (fileBuffer.length * 8) / bitrate
    
    return Math.round(durationSeconds * 10) / 10 // Round to 1 decimal
  }

  /**
   * Generate beep/silence separator
   */
  generateSeparator(durationSeconds = 2, type = 'silence') {
    if (type === 'silence') {
      return this.generateSilenceBuffer(durationSeconds)
    } else {
      return this.generateBeepBuffer(durationSeconds)
    }
  }

  /**
   * Generate silence buffer
   */
  generateSilenceBuffer(durationSeconds = 2) {
    const sampleRate = 44100
    const samples = sampleRate * durationSeconds
    const silenceBuffer = Buffer.alloc(samples * 2, 0) // 16-bit zeros = silence
    
    return {
      buffer: silenceBuffer,
      metadata: {
        duration: durationSeconds,
        sampleRate,
        type: 'silence',
        size: silenceBuffer.length
      }
    }
  }

  /**
   * Generate beep tone buffer
   */
  generateBeepBuffer(durationSeconds = 2, frequency = 800) {
    const sampleRate = 44100
    const samples = sampleRate * durationSeconds
    const beepBuffer = Buffer.alloc(samples * 2)
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * 32767
      beepBuffer.writeInt16LE(sample, i * 2)
    }
    
    return {
      buffer: beepBuffer,
      metadata: {
        duration: durationSeconds,
        sampleRate,
        frequency,
        type: 'beep',
        size: beepBuffer.length
      }
    }
  }

  /**
   * Merge multiple audio files with separators
   */
  async mergeAudioFiles(audioBuffers, options = {}) {
    try {
      const {
        separatorType = 'silence',
        separatorDuration = 2,
        addMetadata = true
      } = options

      if (!audioBuffers || audioBuffers.length === 0) {
        throw new Error('No audio files provided for merging')
      }

      const mergedParts = []
      const separator = this.generateSeparator(separatorDuration, separatorType)

      // Add each audio file with separator (except last)
      for (let i = 0; i < audioBuffers.length; i++) {
        mergedParts.push(audioBuffers[i])
        
        // Add separator between files (not after last file)
        if (i < audioBuffers.length - 1) {
          mergedParts.push(separator.buffer)
        }
      }

      // Combine all buffers
      const mergedBuffer = Buffer.concat(mergedParts)

      const result = {
        buffer: mergedBuffer,
        metadata: {
          originalFileCount: audioBuffers.length,
          separatorType,
          separatorDuration,
          totalSize: mergedBuffer.length,
          totalSizeMB: Math.round(mergedBuffer.length / 1024 / 1024 * 100) / 100,
          estimatedDuration: this.estimateDuration(mergedBuffer, 'audio/webm'),
          mergedAt: new Date().toISOString()
        }
      }

      if (addMetadata) {
        result.metadata.individualFiles = audioBuffers.map((buffer, index) => ({
          index,
          size: buffer.length,
          estimatedDuration: this.estimateDuration(buffer, 'audio/webm')
        }))
      }

      return result

    } catch (error) {
      console.error('Audio merging failed:', error)
      throw new Error(`Failed to merge audio files: ${error.message}`)
    }
  }

  /**
   * Process multiple audio files for AI analysis
   */
  async processForAnalysis(audioFiles, options = {}) {
    try {
      const {
        validateFiles = true,
        mergeFiles = true,
        extractMetadata = true
      } = options

      const processedFiles = []
      let totalDuration = 0

      // Process each file
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i]
        const fileBuffer = file.buffer

        // Validate if requested
        if (validateFiles) {
          const validation = this.validateAudio(fileBuffer, file.mimetype, file.originalname)
          if (!validation.isValid) {
            throw new Error(`File ${i + 1} validation failed: ${validation.errors.join(', ')}`)
          }
        }

        // Extract metadata if requested
        let metadata = {}
        if (extractMetadata) {
          metadata = await this.getAudioMetadata(fileBuffer, file.mimetype)
          totalDuration += metadata.estimatedDuration || 0
        }

        processedFiles.push({
          index: i,
          buffer: fileBuffer,
          originalName: file.originalname,
          mimetype: file.mimetype,
          metadata
        })
      }

      // Merge files if requested
      let mergedAudio = null
      if (mergeFiles && audioFiles.length > 1) {
        const buffers = processedFiles.map(f => f.buffer)
        mergedAudio = await this.mergeAudioFiles(buffers, options)
      }

      return {
        individualFiles: processedFiles,
        mergedAudio,
        summary: {
          fileCount: audioFiles.length,
          totalDuration,
          totalSize: processedFiles.reduce((sum, f) => sum + f.buffer.length, 0),
          averageFileSize: Math.round(processedFiles.reduce((sum, f) => sum + f.buffer.length, 0) / audioFiles.length),
          processedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Audio processing failed:', error)
      throw new Error(`Audio processing failed: ${error.message}`)
    }
  }

  /**
   * Convert audio format (placeholder for future implementation)
   */
  async convertFormat(audioBuffer, fromFormat, toFormat) {
    // TODO: Implement audio format conversion using ffmpeg or similar
    console.warn('Audio format conversion not yet implemented')
    return audioBuffer
  }

  /**
   * Optimize audio for AI processing
   */
  async optimizeForAI(audioBuffer, mimetype) {
    try {
      // Basic optimization - ensure proper format for AI
      const metadata = await this.getAudioMetadata(audioBuffer, mimetype)
      
      // For now, just validate and return
      // Future: could implement compression, noise reduction, etc.
      if (metadata.sizeMB > 5) {
        console.warn(`Large audio file (${metadata.sizeMB}MB) - consider compression`)
      }

      return {
        buffer: audioBuffer,
        optimized: false, // Set to true when actual optimization is implemented
        originalSize: metadata.size,
        optimizedSize: metadata.size,
        compressionRatio: 1,
        metadata
      }

    } catch (error) {
      console.error('Audio optimization failed:', error)
      throw new Error(`Audio optimization failed: ${error.message}`)
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      service: 'AudioService',
      config: {
        maxFileSize: this.config.maxFileSize,
        maxFileSizeMB: Math.round(this.config.maxFileSize / 1024 / 1024),
        allowedFormats: this.config.allowedFormats,
        maxDuration: this.config.maxDuration
      },
      capabilities: {
        validation: true,
        metadataExtraction: true,
        audioMerging: true,
        formatConversion: false, // Not yet implemented
        optimization: false // Not yet implemented
      }
    }
  }
}

module.exports = AudioService