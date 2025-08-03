/**
 * =============================================================================
 * TEXT-TO-SPEECH SERVICE
 * =============================================================================
 * 
 * Centralized text-to-speech functionality with error handling and callbacks
 * Replaces duplicated TTS logic across all components
 */

import { AppError } from '../types'

export interface TTSOptions {
  rate?: number
  pitch?: number
  volume?: number
  voice?: SpeechSynthesisVoice
  lang?: string
}

export interface TTSCallbacks {
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: AppError) => void
  onPause?: () => void
  onResume?: () => void
}

// =============================================================================
// TEXT-TO-SPEECH SERVICE CLASS
// =============================================================================

export class TTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isSupported: boolean
  private voices: SpeechSynthesisVoice[] = []
  private defaultOptions: TTSOptions = {
    rate: 0.8,
    pitch: 1.0,
    volume: 0.9,
    lang: 'en-US'
  }

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
    
    if (this.isSupported) {
      this.loadVoices()
      
      // Handle voice loading (some browsers load voices asynchronously)
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices()
      }
    }
  }

  /**
   * Check if TTS is supported in current browser
   */
  isAvailable(): boolean {
    return this.isSupported
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  /**
   * Get best voice for given language
   */
  getBestVoice(lang: string = 'en-US'): SpeechSynthesisVoice | null {
    // Try to find a voice that matches the language exactly
    const exactMatch = this.voices.find(voice => 
      voice.lang === lang && voice.default
    )
    if (exactMatch) return exactMatch

    // Try to find any voice that matches the language
    const langMatch = this.voices.find(voice => 
      voice.lang.startsWith(lang.split('-')[0])
    )
    if (langMatch) return langMatch

    // Fallback to default voice
    return this.voices.find(voice => voice.default) || this.voices[0] || null
  }

  /**
   * Speak text with options and callbacks
   */
  async speak(
    text: string, 
    options: TTSOptions = {}, 
    callbacks: TTSCallbacks = {}
  ): Promise<void> {
    if (!this.isSupported) {
      const error = this.createTTSError('TTS_NOT_SUPPORTED', 'Text-to-speech not supported in this browser')
      callbacks.onError?.(error)
      throw error
    }

    try {
      // Cancel any ongoing speech first - this is critical!
      this.stop()
      
      // Small delay to ensure previous speech is fully stopped
      await new Promise(resolve => setTimeout(resolve, 100))

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text)
      this.currentUtterance = utterance

      // Apply options
      const finalOptions = { ...this.defaultOptions, ...options }
      utterance.rate = finalOptions.rate!
      utterance.pitch = finalOptions.pitch!
      utterance.volume = finalOptions.volume!
      utterance.lang = finalOptions.lang!

      // Set voice
      if (finalOptions.voice) {
        utterance.voice = finalOptions.voice
      } else {
        const bestVoice = this.getBestVoice(finalOptions.lang)
        if (bestVoice) {
          utterance.voice = bestVoice
        }
      }

      // Set up event handlers
      utterance.onstart = () => {
        callbacks.onStart?.()
      }

      utterance.onend = () => {
        this.currentUtterance = null
        callbacks.onEnd?.()
      }

      utterance.onerror = (event) => {
        const error = this.createTTSError(
          'TTS_PLAYBACK_ERROR', 
          `Speech synthesis error: ${event.error}`,
          event
        )
        this.currentUtterance = null
        callbacks.onError?.(error)
      }

      utterance.onpause = () => {
        callbacks.onPause?.()
      }

      utterance.onresume = () => {
        callbacks.onResume?.()
      }

      // Start speaking
      window.speechSynthesis.speak(utterance)

      // Set up fallback timeout (some browsers don't fire events reliably)
      const timeoutDuration = Math.max(text.length * 100, 10000) // Estimate based on text length
      setTimeout(() => {
        if (this.currentUtterance === utterance && !window.speechSynthesis.speaking) {
          console.warn('TTS fallback timeout triggered')
          this.currentUtterance = null
          callbacks.onEnd?.()
        }
      }, timeoutDuration)

    } catch (error) {
      const ttsError = this.createTTSError('TTS_FAILED', 'Failed to start text-to-speech', error)
      callbacks.onError?.(ttsError)
      throw ttsError
    }
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.isSupported) {
      // Force stop all speech synthesis
      window.speechSynthesis.cancel()
      
      // Additional cleanup for some browsers
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel()
      }
    }
    this.currentUtterance = null
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.isSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.isSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isSupported && window.speechSynthesis.speaking
  }

  /**
   * Check if speech is paused
   */
  isPaused(): boolean {
    return this.isSupported && window.speechSynthesis.paused
  }

  /**
   * Get current utterance
   */
  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance
  }

  /**
   * Load available voices
   */
  private loadVoices(): void {
    if (this.isSupported) {
      this.voices = window.speechSynthesis.getVoices()
    }
  }

  /**
   * Create standardized TTS errors
   */
  private createTTSError(code: string, message: string, originalError?: any): AppError {
    return {
      code,
      message,
      details: originalError,
      recoverable: code !== 'TTS_NOT_SUPPORTED'
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Estimate speech duration based on text length and rate
 */
export function estimateSpeechDuration(text: string, rate: number = 0.8): number {
  // Average speaking rate is about 150 words per minute at rate 1.0
  const wordsPerMinute = 150 * rate
  const wordCount = text.split(/\s+/).length
  const minutes = wordCount / wordsPerMinute
  return Math.max(minutes * 60 * 1000, 1000) // Minimum 1 second, return in milliseconds
}

/**
 * Break long text into chunks for better TTS performance
 */
export function chunkText(text: string, maxLength: number = 200): string[] {
  if (text.length <= maxLength) {
    return [text]
  }

  const chunks: string[] = []
  const sentences = text.split(/[.!?]+/)
  let currentChunk = ''

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue

    if (currentChunk.length + trimmedSentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.')
      }
      currentChunk = trimmedSentence
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk + '.')
  }

  return chunks
}

/**
 * Clean text for better TTS pronunciation
 */
export function cleanTextForTTS(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    // Replace common abbreviations
    .replace(/\bIELTS\b/g, 'I-E-L-T-S')
    .replace(/\bAPI\b/g, 'A-P-I')
    .replace(/\bUI\b/g, 'User Interface')
    .replace(/\bURL\b/g, 'U-R-L')
    // Add pauses for better pacing
    .replace(/:/g, ':,') // Add pause after colons
    .replace(/;/g, ';,') // Add pause after semicolons
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const ttsService = new TTSService()

// Note: Global cleanup is now handled by globalCleanup.ts to avoid duplication
// TTS cleanup is called from the global cleanup system