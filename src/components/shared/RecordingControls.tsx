/**
 * =============================================================================
 * RECORDING CONTROLS COMPONENT
 * =============================================================================
 * 
 * Unified recording interface with support for toggle/hold modes and mobile optimization
 * Replaces duplicated recording UI across all test components
 */

import React from 'react'
import { RecordingControlsProps } from '../../lib/types'

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  canRecord,
  recordingMode,
  onStartRecording,
  onStopRecording,
  onModeChange,
  isMobile = false
}) => {
  // Mobile detection
  const isMobileDevice = isMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Touch state for mobile
  const [isTouchPressed, setIsTouchPressed] = React.useState(false)

  // Handle touch events for mobile
  const handleTouchStart = (event: React.TouchEvent) => {
    if (!canRecord || isTouchPressed || isRecording) return
    
    event.preventDefault()
    
    if (recordingMode === 'hold') {
      setIsTouchPressed(true)
      onStartRecording()
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (recordingMode === 'hold' && isTouchPressed && isRecording) {
      event.preventDefault()
      setIsTouchPressed(false)
      onStopRecording()
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
    }
  }

  // Handle button click for toggle mode
  const handleButtonClick = () => {
    if (!canRecord) return
    
    if (recordingMode === 'toggle') {
      if (!isRecording) {
        onStartRecording()
      } else {
        onStopRecording()
      }
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      
      {/* Recording Mode Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'inline-flex',
          background: '#f3f4f6',
          borderRadius: '8px',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            onClick={() => onModeChange('toggle')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: recordingMode === 'toggle' ? '#667eea' : 'transparent',
              color: recordingMode === 'toggle' ? 'white' : '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: recordingMode === 'toggle' ? 'bold' : 'normal'
            }}
          >
            📱 Tap Mode
          </button>
          <button
            onClick={() => onModeChange('hold')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: recordingMode === 'hold' ? '#667eea' : 'transparent',
              color: recordingMode === 'hold' ? 'white' : '#6b7280',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: recordingMode === 'hold' ? 'bold' : 'normal'
            }}
          >
            🎙️ Hold Mode
          </button>
        </div>
      </div>

      {/* Recording Button */}
      {!isRecording ? (
        <div>
          <button 
            onClick={handleButtonClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            disabled={!canRecord}
            style={{
              opacity: canRecord ? 1 : 0.5,
              cursor: canRecord ? 'pointer' : 'not-allowed',
              minHeight: '60px',
              minWidth: isMobileDevice ? '200px' : '160px',
              fontSize: '16px',
              background: isTouchPressed 
                ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                : canRecord 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 'bold',
              transform: isTouchPressed ? 'scale(0.95)' : 'scale(1)',
              transition: 'all 0.1s ease',
              marginBottom: '16px'
            }}
          >
            {recordingMode === 'toggle' 
              ? '🎤 Start Recording' 
              : isTouchPressed 
                ? '🔴 Recording...'
                : '🎤 Hold to Record'
            }
          </button>
          
          <div style={{ 
            fontSize: '14px', 
            color: canRecord ? '#6b7280' : '#ef4444',
            marginTop: '8px'
          }}>
            {!canRecord ? (
              <>🔊 Wait for question to finish before recording</>
            ) : recordingMode === 'toggle' ? (
              <>Click to start recording or hold <strong>spacebar</strong></>
            ) : (
              <>Hold button to record or use <strong>spacebar</strong> on desktop</>
            )}
          </div>
        </div>
      ) : (
        <div>
          {recordingMode === 'toggle' && (
            <button 
              onClick={handleButtonClick}
              style={{ 
                marginBottom: '16px',
                minHeight: '60px',
                minWidth: isMobileDevice ? '200px' : '160px',
                fontSize: '16px',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ⏹️ Stop Recording
            </button>
          )}
          
          <div style={{ 
            fontSize: '14px', 
            color: '#059669',
            fontWeight: 'bold'
          }}>
            🔴 Recording... {
              recordingMode === 'toggle' 
                ? '(Click stop button or release spacebar)' 
                : isTouchPressed 
                  ? '(Release button to stop)'
                  : '(Release spacebar or hold button)'
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default RecordingControls