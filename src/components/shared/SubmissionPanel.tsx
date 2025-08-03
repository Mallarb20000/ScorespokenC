/**
 * =============================================================================
 * SUBMISSION PANEL COMPONENT
 * =============================================================================
 * 
 * Unified submission controls with auto-submit toggle and navigation
 * Replaces duplicated submission UI across all test components
 */

import React from 'react'

export interface SubmissionPanelProps {
  // Test state
  allQuestionsAnswered: boolean
  isProcessing: boolean
  autoSubmit: boolean
  onAutoSubmitChange: (enabled: boolean) => void
  
  // Navigation
  currentQuestionIndex: number
  totalQuestions: number
  canNavigateNext: boolean
  canNavigatePrevious: boolean
  onNextQuestion: () => void
  onPreviousQuestion: () => void
  
  // Submission
  onSubmit: () => void
  onReset?: () => void
  onHome?: () => void
  
  // Question management
  hasCurrentRecording?: boolean
  onReRecord?: () => void
  
  // Labels
  submitButtonText?: string
  testName?: string
}

export const SubmissionPanel: React.FC<SubmissionPanelProps> = ({
  allQuestionsAnswered,
  isProcessing,
  autoSubmit,
  onAutoSubmitChange,
  currentQuestionIndex,
  totalQuestions,
  canNavigateNext,
  canNavigatePrevious,
  onNextQuestion,
  onPreviousQuestion,
  onSubmit,
  onReset,
  onHome,
  hasCurrentRecording = false,
  onReRecord,
  submitButtonText,
  testName = 'Test'
}) => {
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1
  const isMultiQuestion = totalQuestions > 1

  return (
    <div>
      {/* Auto-submit Toggle (only for multi-question tests) */}
      {isMultiQuestion && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '24px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input 
              type="checkbox" 
              checked={autoSubmit} 
              onChange={(e) => onAutoSubmitChange(e.target.checked)}
              style={{ 
                marginRight: '4px',
                transform: 'scale(1.2)'
              }}
            />
            🚀 Auto-advance questions and auto-submit when complete
          </label>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginTop: '8px',
            fontStyle: 'italic'
          }}>
            {autoSubmit 
              ? 'Questions will advance automatically after recording. Test submits when all questions are answered.' 
              : 'Use navigation buttons to move between questions. Submit manually when ready.'
            }
          </div>
        </div>
      )}

      {/* Re-record Option */}
      {hasCurrentRecording && onReRecord && (
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ 
            marginBottom: '16px',
            padding: '12px',
            background: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            color: '#15803d'
          }}>
            ✅ Answer recorded for Question {currentQuestionIndex + 1}
          </div>
          <button 
            onClick={onReRecord}
            style={{ 
              background: '#6b7280', 
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Re-record Answer
          </button>
        </div>
      )}

      {/* Navigation Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        gap: '12px'
      }}>
        {/* Back to Home Button */}
        {onHome && (
          <button 
            onClick={onHome}
            style={{ 
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🏠 Back to Home
          </button>
        )}
        
        {/* Question Navigation (only for multi-question tests) */}
        {isMultiQuestion && (
          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
            <button 
              onClick={onPreviousQuestion}
              disabled={!canNavigatePrevious}
              style={{ 
                background: canNavigatePrevious ? '#6b7280' : '#e5e7eb',
                color: canNavigatePrevious ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: canNavigatePrevious ? 'pointer' : 'not-allowed'
              }}
            >
              ← Previous Question
            </button>

            {/* Next Question or Submit Button */}
            {!isLastQuestion ? (
              <button 
                onClick={onNextQuestion}
                disabled={!canNavigateNext}
                style={{ 
                  background: canNavigateNext ? '#6b7280' : '#e5e7eb',
                  color: canNavigateNext ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: canNavigateNext ? 'pointer' : 'not-allowed'
                }}
              >
                Next Question →
              </button>
            ) : (
              <button 
                onClick={onSubmit}
                disabled={!allQuestionsAnswered || isProcessing}
                style={{ 
                  background: (allQuestionsAnswered && !isProcessing) 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#e5e7eb',
                  color: (allQuestionsAnswered && !isProcessing) ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: (allQuestionsAnswered && !isProcessing) ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold'
                }}
              >
                {isProcessing 
                  ? '🤖 Analyzing...' 
                  : autoSubmit 
                    ? '🔄 Resubmit Test' 
                    : `📤 Submit ${testName}`
                }
              </button>
            )}
          </div>
        )}
        
        {/* Single Submit Button (for single-question tests) */}
        {!isMultiQuestion && (
          <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
            {onReset && (
              <button 
                onClick={onReset}
                disabled={isProcessing}
                style={{ 
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >
                🔄 Reset
              </button>
            )}
            
            <button 
              onClick={onSubmit}
              disabled={!allQuestionsAnswered || isProcessing}
              style={{ 
                background: (allQuestionsAnswered && !isProcessing) 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#e5e7eb',
                color: (allQuestionsAnswered && !isProcessing) ? 'white' : '#9ca3af',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '16px',
                cursor: (allQuestionsAnswered && !isProcessing) ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              {isProcessing 
                ? '🤖 Analyzing...' 
                : submitButtonText || `📤 Submit ${testName}`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubmissionPanel