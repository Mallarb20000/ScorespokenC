/**
 * =============================================================================
 * USE KEYBOARD SHORTCUTS HOOK
 * =============================================================================
 * 
 * Centralized keyboard handling for accessibility and power users
 * Supports push-to-talk, navigation, and test controls
 */

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcuts {
  [key: string]: () => void
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcuts,
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false
  } = options

  const shortcutsRef = useRef(shortcuts)
  const optionsRef = useRef(options)
  
  // Update refs when shortcuts or options change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    optionsRef.current = options
  }, [shortcuts, options])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const { code, key, ctrlKey, metaKey, altKey, shiftKey } = event
    
    // Don't interfere with form inputs unless explicitly specified
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Only allow Space for push-to-talk in inputs if explicitly configured
      if (code !== 'Space' || !shortcutsRef.current['Space']) {
        return
      }
    }

    // Build key combination string
    const modifiers = []
    if (ctrlKey) modifiers.push('Ctrl')
    if (metaKey) modifiers.push('Meta') 
    if (altKey) modifiers.push('Alt')
    if (shiftKey) modifiers.push('Shift')
    
    const keyCombo = modifiers.length > 0 ? `${modifiers.join('+')}+${code}` : code
    const keyName = modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key

    // Try to find matching shortcut
    const handler = shortcutsRef.current[keyCombo] || 
                   shortcutsRef.current[code] || 
                   shortcutsRef.current[keyName] ||
                   shortcutsRef.current[key]

    if (handler) {
      if (preventDefault) {
        event.preventDefault()
      }
      if (stopPropagation) {
        event.stopPropagation()
      }
      
      try {
        handler()
      } catch (error) {
        console.error('Keyboard shortcut handler error:', error)
      }
    }
  }, [enabled, preventDefault, stopPropagation])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const { code, key } = event
    
    // Handle key up events (useful for push-to-talk release)
    const keyUpHandler = shortcutsRef.current[`${code}:up`] || 
                        shortcutsRef.current[`${key}:up`]

    if (keyUpHandler) {
      if (preventDefault) {
        event.preventDefault()
      }
      if (stopPropagation) {
        event.stopPropagation()
      }
      
      try {
        keyUpHandler()
      } catch (error) {
        console.error('Keyboard shortcut (keyup) handler error:', error)
      }
    }
  }, [enabled, preventDefault, stopPropagation])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp, enabled])
}

// =============================================================================
// PUSH-TO-TALK HOOK
// =============================================================================

export interface UsePushToTalkOptions {
  enabled?: boolean
  key?: string
  onPress?: () => void
  onRelease?: () => void
}

export function usePushToTalk({
  enabled = true,
  key = 'Space',
  onPress,
  onRelease
}: UsePushToTalkOptions) {
  const isPressed = useRef(false)

  const shortcuts = {
    [key]: () => {
      if (!isPressed.current) {
        isPressed.current = true
        onPress?.()
      }
    },
    [`${key}:up`]: () => {
      if (isPressed.current) {
        isPressed.current = false
        onRelease?.()
      }
    }
  }

  useKeyboardShortcuts(shortcuts, { 
    enabled,
    preventDefault: true,
    stopPropagation: true
  })

  return {
    isPressed: isPressed.current
  }
}

// =============================================================================
// TEST NAVIGATION HOOK
// =============================================================================

export interface UseTestNavigationOptions {
  enabled?: boolean
  onNext?: () => void
  onPrevious?: () => void
  onSubmit?: () => void
  onReset?: () => void
  onHome?: () => void
}

export function useTestNavigation({
  enabled = true,
  onNext,
  onPrevious,
  onSubmit,
  onReset,
  onHome
}: UseTestNavigationOptions) {
  
  const shortcuts = {
    'ArrowRight': onNext,
    'ArrowLeft': onPrevious,
    'Enter': onSubmit,
    'Escape': onReset,
    'Ctrl+Enter': onSubmit,
    'Ctrl+r': onReset,
    'Ctrl+h': onHome,
    // Alternative keys
    'n': onNext,
    'p': onPrevious,
    's': onSubmit
  }

  // Filter out undefined handlers
  const filteredShortcuts = Object.entries(shortcuts)
    .filter(([, handler]) => handler !== undefined)
    .reduce((acc, [key, handler]) => ({ ...acc, [key]: handler }), {})

  useKeyboardShortcuts(filteredShortcuts, { 
    enabled,
    preventDefault: true 
  })
}

// =============================================================================
// RECORDING CONTROL HOOK
// =============================================================================

export interface UseRecordingControlsOptions {
  enabled?: boolean
  recordingMode?: 'toggle' | 'hold'
  isRecording?: boolean
  canRecord?: boolean
  onStartRecording?: () => void
  onStopRecording?: () => void
  onToggleMode?: () => void
}

export function useRecordingControls({
  enabled = true,
  recordingMode = 'toggle',
  isRecording = false,
  canRecord = true,
  onStartRecording,
  onStopRecording,
  onToggleMode
}: UseRecordingControlsOptions) {
  
  const shortcuts: KeyboardShortcuts = {}

  if (recordingMode === 'toggle') {
    // Toggle mode: Space toggles recording on/off
    shortcuts['Space'] = () => {
      if (!canRecord) return
      if (isRecording) {
        onStopRecording?.()
      } else {
        onStartRecording?.()
      }
    }
  } else {
    // Hold mode: Space down starts, Space up stops
    shortcuts['Space'] = () => {
      if (canRecord && !isRecording) {
        onStartRecording?.()
      }
    }
    shortcuts['Space:up'] = () => {
      if (isRecording) {
        onStopRecording?.()
      }
    }
  }

  // Mode toggle
  if (onToggleMode) {
    shortcuts['m'] = onToggleMode
    shortcuts['Ctrl+m'] = onToggleMode
  }

  useKeyboardShortcuts(shortcuts, { 
    enabled,
    preventDefault: true 
  })
}

// =============================================================================
// TTS CONTROL HOOK
// =============================================================================

export interface UseTTSControlsOptions {
  enabled?: boolean
  onSpeak?: () => void
  onStop?: () => void
  onPause?: () => void
  onResume?: () => void
}

export function useTTSControls({
  enabled = true,
  onSpeak,
  onStop,
  onPause,
  onResume
}: UseTTSControlsOptions) {
  
  const shortcuts = {
    'r': onSpeak,      // Read/Replay
    'Ctrl+r': onSpeak,
    't': onStop,       // sTp
    'Ctrl+t': onStop,
    'Ctrl+p': onPause,
    'Ctrl+u': onResume // Unpause
  }

  // Filter out undefined handlers
  const filteredShortcuts = Object.entries(shortcuts)
    .filter(([, handler]) => handler !== undefined)
    .reduce((acc, [key, handler]) => ({ ...acc, [key]: handler }), {})

  useKeyboardShortcuts(filteredShortcuts, { 
    enabled,
    preventDefault: true 
  })
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get human-readable key combination string
 */
export function getKeyString(event: KeyboardEvent): string {
  const modifiers = []
  if (event.ctrlKey) modifiers.push('Ctrl')
  if (event.metaKey) modifiers.push('Cmd')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  
  const key = event.code.replace(/^(Key|Digit|Arrow)/, '')
  return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key
}

/**
 * Check if key combination is valid for shortcut
 */
export function isValidShortcut(keyCombo: string): boolean {
  const invalidKeys = ['Tab', 'F5', 'F12', 'Alt+Tab', 'Ctrl+Alt+Delete']
  return !invalidKeys.includes(keyCombo)
}

/**
 * Format key combination for display
 */
export function formatKeyCombo(keyCombo: string): string {
  return keyCombo
    .replace('Ctrl+', '⌃')
    .replace('Meta+', '⌘')
    .replace('Alt+', '⌥')
    .replace('Shift+', '⇧')
    .replace('Space', '␣')
    .replace('Enter', '↵')
    .replace('Escape', '⎋')
    .replace('Arrow', '→')
}