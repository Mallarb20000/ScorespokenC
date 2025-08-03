/**
 * =============================================================================
 * UNIFIED TEST INTERFACE COMPONENT
 * =============================================================================
 * 
 * Single configurable component that handles all IELTS test types
 * Replaces separate part1-drill, part3-drill, and quick-drill components
 */

import React, { useEffect } from 'react'
import { TestConfig } from '../../lib/types'
import { useTestFlow, useKeyboardShortcuts, usePushToTalk, useTestNavigation } from '../../lib/hooks'
import QuestionDisplay from './QuestionDisplay'
import RecordingControls from './RecordingControls'
import SubmissionPanel from './SubmissionPanel'

export interface TestInterfaceProps {
  config: TestConfig
  onComplete?: (results: any) => void
  onError?: (error: Error) => void
  className?: string
  style?: React.CSSProperties
}

export const TestInterface: React.FC<TestInterfaceProps> = ({
  config,
  onComplete,
  onError,
  className,
  style
}) => {
  // Main test flow hook
  const {
    state,
    currentQuestion,
    canSubmit,
    recordingStatus,
    startTest,
    resetTest,
    nextQuestion,
    previousQuestion,
    startRecording,
    stopRecording,
    reRecordCurrentQuestion,
    setRecordingMode,
    speakCurrentQuestion,
    stopSpeaking,
    submitTest,
    setAutoSubmit,
    getProgressPercentage,
    canNavigateNext,
    canNavigatePrevious,
    isLastQuestion
  } = useTestFlow({
    config,
    onSubmissionComplete: onComplete,
    onError
  })

  // Keyboard shortcuts
  usePushToTalk({
    enabled: state.testFlow.testStarted,
    onPress: startRecording,
    onRelease: stopRecording
  })

  useTestNavigation({
    enabled: state.testFlow.testStarted,
    onNext: canNavigateNext() ? nextQuestion : undefined,
    onPrevious: canNavigatePrevious() ? previousQuestion : undefined,
    onSubmit: canSubmit ? submitTest : undefined,
    onReset: resetTest,
    onHome: () => window.location.href = '/'
  })

  // Auto-start test when component mounts
  useEffect(() => {
    if (!state.testFlow.testStarted) {
      startTest()
    }
  }, [state.testFlow.testStarted, startTest])

  // Test not started - show loading screen
  if (!state.testFlow.testStarted) {
    return (
      <div className={className} style={style}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#374151' }}>
            Starting {config.title}...
          </h2>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Preparing your test environment
          </p>
        </div>
      </div>
    )
  }

  // Test in progress - show main interface
  return (
    <div className={className} style={style}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {config.title}
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            {config.description}
          </p>
        </div>

        {/* Question Display */}
        <QuestionDisplay
          question={currentQuestion?.question || ''}
          questionNumber={state.testFlow.currentQuestionIndex + 1}
          totalQuestions={config.questions.length}
          progress={getProgressPercentage()}
          onPlayTTS={speakCurrentQuestion}
          onStopTTS={stopSpeaking}
          isSpeaking={state.tts.isSpeaking}
        />

        {/* Recording Controls */}
        <RecordingControls
          isRecording={recordingStatus.isRecording}
          canRecord={recordingStatus.canRecord}
          recordingMode={recordingStatus.recordingMode}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onModeChange={setRecordingMode}
        />

        {/* Submission Panel */}
        <SubmissionPanel
          allQuestionsAnswered={state.testFlow.allQuestionsAnswered}
          isProcessing={state.submission.isProcessing}
          autoSubmit={state.testFlow.autoSubmit}
          onAutoSubmitChange={setAutoSubmit}
          currentQuestionIndex={state.testFlow.currentQuestionIndex}
          totalQuestions={config.questions.length}
          canNavigateNext={canNavigateNext()}
          canNavigatePrevious={canNavigatePrevious()}
          onNextQuestion={nextQuestion}
          onPreviousQuestion={previousQuestion}
          onSubmit={submitTest}
          onReset={resetTest}
          onHome={() => window.location.href = '/'}
          hasCurrentRecording={recordingStatus.hasRecording}
          onReRecord={reRecordCurrentQuestion}
          testName={config.type.toUpperCase()}
        />

        {/* Error Display */}
        {state.submission.error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '20px'
          }}>
            <div style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '8px' }}>
              ❌ Error
            </div>
            <div style={{ color: '#7f1d1d' }}>
              {state.submission.error}
            </div>
            {state.submission.canRetry && (
              <button
                onClick={submitTest}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  marginTop: '12px',
                  cursor: 'pointer'
                }}
              >
                🔄 Retry Submission
              </button>
            )}
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
            <strong>Keyboard Shortcuts:</strong> Space (record), Enter (submit), 
            ← → (navigate), R (replay question), Esc (reset)
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestInterface