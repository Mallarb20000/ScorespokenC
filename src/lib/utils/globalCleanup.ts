/**
 * =============================================================================
 * GLOBAL CLEANUP UTILITIES
 * =============================================================================
 * 
 * Utilities to clean up audio and TTS when navigating between pages
 */

import { audioPlayer, audioRecorder } from '../services/AudioService'
import { ttsService } from '../services/TTSService'
import { autoSubmissionService } from '../services/SubmissionService'

/**
 * Clean up all resources (audio, TTS, submissions)
 * SINGLE SOURCE OF TRUTH for all cleanup operations
 */
export function cleanupAllResources(): void {
  try {
    // Stop all audio playback
    audioPlayer.stopAll()
    
    // Stop any recording
    audioRecorder.cleanup()
    
    // Stop TTS
    ttsService.stop()
    
    // Cancel any pending submissions
    autoSubmissionService.cancelAllAutoSubmissions()
    
    // Force stop speech synthesis (extra safety)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    
    console.log('🧹 Resource cleanup completed')
  } catch (error) {
    console.warn('Resource cleanup error:', error)
  }
}

// Alias for backward compatibility
export const cleanupAllAudio = cleanupAllResources

/**
 * Initialize global cleanup listeners
 */
export function initializeGlobalCleanup(): (() => void) | undefined {
  if (typeof window === 'undefined') return

  // Cleanup on page unload
  const handleBeforeUnload = () => {
    cleanupAllResources()
  }

  // Cleanup when tab becomes hidden (user switches tabs or minimizes)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      cleanupAllResources()
    }
  }

  // Cleanup on focus loss (additional safety)
  const handleBlur = () => {
    cleanupAllResources()
  }

  // Add event listeners
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('pagehide', handleBeforeUnload) // For mobile browsers
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('blur', handleBlur)

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('pagehide', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('blur', handleBlur)
  }
}

/**
 * Hook for Next.js route changes
 */
export function setupNextJSCleanup(): (() => void) | undefined {
  if (typeof window === 'undefined') return

  // Listen for Next.js route changes
  const handleRouteChange = () => {
    // Skip cleanup when navigating TO results page to preserve sessionStorage
    const currentPath = window.location.pathname
    if (currentPath === '/results' || currentPath.startsWith('/results')) {
      console.log('🔄 Skipping cleanup for results page navigation')
      return
    }
    
    cleanupAllResources()
  }

  // For Next.js App Router, we need to listen to popstate and pushstate
  const originalPushState = window.history.pushState
  const originalReplaceState = window.history.replaceState

  window.history.pushState = function(...args) {
    handleRouteChange()
    return originalPushState.apply(this, args)
  }

  window.history.replaceState = function(...args) {
    handleRouteChange()
    return originalReplaceState.apply(this, args)
  }

  window.addEventListener('popstate', handleRouteChange)

  // Return cleanup function
  return () => {
    window.history.pushState = originalPushState
    window.history.replaceState = originalReplaceState
    window.removeEventListener('popstate', handleRouteChange)
  }
}