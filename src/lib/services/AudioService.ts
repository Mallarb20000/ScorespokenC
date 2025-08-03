/**
 * =============================================================================
 * AUDIO SERVICE
 * =============================================================================
 * 
 * Centralized audio recording and playback functionality
 * Replaces duplicated audio logic across all components
 */

import { AppError } from '../types'

export interface AudioRecordingOptions {
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
}

export interface AudioPlaybackOptions {
  volume?: number
  playbackRate?: number
}

// =============================================================================
// AUDIO RECORDING SERVICE
// =============================================================================

export class AudioRecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private startTime: number = 0

  /**
   * Start audio recording with optimized settings
   */
  async startRecording(options: AudioRecordingOptions = {}): Promise<void> {
    try {
      // Clean up any existing recording
      await this.cleanup()

      // Request microphone access with optimized settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: options.echoCancellation ?? true,
          noiseSuppression: options.noiseSuppression ?? true,
          autoGainControl: options.autoGainControl ?? true,
          channelCount: 1, // Mono for smaller file size
          sampleRate: 44100
        }
      })

      // Create MediaRecorder with optimal settings
      const mimeType = this.getBestMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000 // Balanced quality/size
      })

      // Reset chunks array
      this.audioChunks = []
      this.startTime = Date.now()

      // Set up event handlers
      this.setupRecorderEvents()

      // Start recording
      this.mediaRecorder.start(100) // Collect data every 100ms

    } catch (error) {
      await this.cleanup()
      throw this.createAudioError('RECORDING_FAILED', 'Failed to start recording', error)
    }
  }

  /**
   * Stop recording and return audio data
   */
  async stopRecording(): Promise<{ audioBlob: Blob; audioUrl: string; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(this.createAudioError('RECORDING_FAILED', 'No active recording to stop'))
        return
      }

      // Set up the stop handler
      this.mediaRecorder.onstop = () => {
        try {
          const duration = Date.now() - this.startTime
          const mimeType = this.getBestMimeType()
          const audioBlob = new Blob(this.audioChunks, { type: mimeType })
          const audioUrl = URL.createObjectURL(audioBlob)

          // Cleanup resources
          this.cleanup()

          resolve({ audioBlob, audioUrl, duration })
        } catch (error) {
          reject(this.createAudioError('RECORDING_FAILED', 'Failed to process recording', error))
        }
      }

      // Stop the recording
      this.mediaRecorder.stop()
    })
  }

  /**
   * Check if recording is currently active
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  /**
   * Get recording duration in milliseconds
   */
  getRecordingDuration(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    this.mediaRecorder = null
    this.audioChunks = []
    this.startTime = 0
  }

  /**
   * Set up MediaRecorder event handlers
   */
  private setupRecorderEvents(): void {
    if (!this.mediaRecorder) return

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data)
      }
    }

    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event)
      this.cleanup()
    }
  }

  /**
   * Get the best supported MIME type for recording
   */
  private getBestMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'audio/webm' // Fallback
  }

  /**
   * Create standardized audio errors
   */
  private createAudioError(code: string, message: string, originalError?: any): AppError {
    return {
      code,
      message,
      details: originalError,
      recoverable: code !== 'MICROPHONE_ACCESS_DENIED'
    }
  }
}

// =============================================================================
// AUDIO PLAYBACK SERVICE
// =============================================================================

export class AudioPlaybackService {
  private audioElements: Map<string, HTMLAudioElement> = new Map()
  private currentPlayback: HTMLAudioElement | null = null

  /**
   * Play audio from URL or Blob
   */
  async playAudio(
    source: string | Blob, 
    options: AudioPlaybackOptions = {}
  ): Promise<void> {
    try {
      // Stop any currently playing audio first
      this.stopAll()

      const url = typeof source === 'string' ? source : URL.createObjectURL(source)
      const audio = new Audio(url)
      
      // Apply options
      audio.volume = options.volume ?? 0.9
      audio.playbackRate = options.playbackRate ?? 1.0

      // Store reference for cleanup
      const id = Math.random().toString(36).substr(2, 9)
      this.audioElements.set(id, audio)
      this.currentPlayback = audio

      // Set up cleanup on end
      audio.onended = () => {
        this.audioElements.delete(id)
        if (this.currentPlayback === audio) {
          this.currentPlayback = null
        }
        if (typeof source !== 'string') {
          URL.revokeObjectURL(url)
        }
      }

      // Set up error handling
      audio.onerror = () => {
        this.audioElements.delete(id)
        if (this.currentPlayback === audio) {
          this.currentPlayback = null
        }
        if (typeof source !== 'string') {
          URL.revokeObjectURL(url)
        }
      }

      // Play audio
      await audio.play()

    } catch (error) {
      throw this.createAudioError('PLAYBACK_FAILED', 'Failed to play audio', error)
    }
  }

  /**
   * Play sequential audio files with beeps between them
   */
  async playSequentialAudio(
    urls: string[], 
    beepDuration: number = 2,
    beepFrequency: number = 800
  ): Promise<void> {
    // Stop any currently playing audio first
    this.stopAll()

    for (let i = 0; i < urls.length; i++) {
      // Check if we should continue (user might have navigated away)
      if (!this.audioElements.size && this.currentPlayback === null) {
        break
      }

      // Play audio file without stopping previous (since we're in a sequence)
      const url = `http://localhost:3002${urls[i]}`
      const audio = new Audio(url)
      this.currentPlayback = audio
      
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve() // Continue even if one fails
        audio.play().catch(() => resolve()) // Handle play failures
      })
      
      // Play beep between files (except after last file)
      if (i < urls.length - 1) {
        await this.playBeep(beepFrequency, beepDuration)
      }
    }
    
    this.currentPlayback = null
  }

  /**
   * Generate and play a beep sound
   */
  async playBeep(frequency: number = 800, duration: number = 2): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration)
        
        setTimeout(() => resolve(), duration * 1000)
      } catch (error) {
        console.warn('Failed to play beep:', error)
        resolve() // Continue even if beep fails
      }
    })
  }

  /**
   * Stop all playing audio
   */
  stopAll(): void {
    this.audioElements.forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
    this.audioElements.clear()
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAll()
  }

  /**
   * Create standardized audio errors  
   */
  private createAudioError(code: string, message: string, originalError?: any): AppError {
    return {
      code,
      message, 
      details: originalError,
      recoverable: true
    }
  }
}

// =============================================================================
// AUDIO UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if microphone access is available
 */
export async function checkMicrophoneAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get available audio input devices
 */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(device => device.kind === 'audioinput')
  } catch (error) {
    console.warn('Failed to enumerate audio devices:', error)
    return []
  }
}

/**
 * Convert audio blob to different format (if needed)
 */
export function convertAudioFormat(blob: Blob, targetMimeType: string): Blob {
  // For now, just return the original blob
  // In the future, we could add audio format conversion here
  return blob
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

export const audioRecorder = new AudioRecordingService()
export const audioPlayer = new AudioPlaybackService()

// Note: Global cleanup is now handled by globalCleanup.ts to avoid duplication
// Individual cleanup methods are called from the global cleanup system