/**
 * =============================================================================
 * QUESTION DISPLAY COMPONENT
 * =============================================================================
 * 
 * Unified question display with TTS controls and progress indication
 * Replaces duplicated question UI across all test components
 */

import React from 'react'
import { QuestionDisplayProps } from '../../lib/types'

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  questionNumber,
  totalQuestions,
  progress,
  onPlayTTS,
  onStopTTS,
  isSpeaking
}) => {
  return (
    <div>
      {/* Progress Bar */}
      {totalQuestions > 1 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Question {questionNumber} of {totalQuestions}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div style={{ 
            background: '#e5e7eb', 
            borderRadius: '10px', 
            height: '8px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Question Display */}
      <div style={{ 
        background: '#f8fafc',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#374151',
          fontSize: '18px'
        }}>
          {totalQuestions > 1 ? (
            <>📝 Question {questionNumber}:</>
          ) : (
            <>📝 Question:</>
          )}
        </h3>
        <p style={{ 
          fontSize: '16px', 
          lineHeight: '1.6',
          margin: 0,
          color: '#4b5563'
        }}>
          {question}
        </p>
      </div>

      {/* TTS Controls */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {isSpeaking ? (
          <div>
            <button 
              onClick={onStopTTS}
              style={{ 
                background: '#f59e0b', 
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              🔇 Stop Audio
            </button>
            <div style={{ 
              fontSize: '14px', 
              color: '#f59e0b',
              marginTop: '8px',
              fontWeight: 'bold'
            }}>
              🔊 Playing question... (Recording will be available after audio finishes)
            </div>
          </div>
        ) : (
          <button 
            onClick={onPlayTTS}
            style={{ 
              background: '#10b981', 
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🔊 {totalQuestions > 1 ? 'Replay Question' : 'Play Question'}
          </button>
        )}
      </div>
    </div>
  )
}

export default QuestionDisplay