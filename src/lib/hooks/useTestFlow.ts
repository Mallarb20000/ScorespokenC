/**
 * =============================================================================
 * USE TEST FLOW HOOK
 * =============================================================================
 * 
 * Master hook that orchestrates the entire IELTS test flow
 * Replaces complex state management across all test components
 */

import { useReducer, useCallback, useEffect, useRef } from 'react'
import { testReducer, createInitialTestState, selectCurrentQuestion, selectCanSubmit, selectRecordingStatus } from '../state/testReducer'
import { TestConfig, TestState, TestAction } from '../types'
import { audioRecorder } from '../services/AudioService'
import { ttsService, cleanTextForTTS } from '../services/TTSService'
import { submissionService, autoSubmissionService, SubmissionResult } from '../services/SubmissionService'
import { cleanupAllResources } from '../utils/globalCleanup'

export interface UseTestFlowOptions {
  config: TestConfig
  onSubmissionComplete?: (result: SubmissionResult) => void
  onError?: (error: Error) => void
}

export interface UseTestFlowReturn {
  // State
  state: TestState
  
  // Current question info
  currentQuestion: ReturnType<typeof selectCurrentQuestion>
  canSubmit: boolean
  recordingStatus: ReturnType<typeof selectRecordingStatus>
  
  // Test control actions
  startTest: () => void
  resetTest: () => void
  nextQuestion: () => void
  previousQuestion: () => void
  
  // Recording actions
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  reRecordCurrentQuestion: () => void
  setRecordingMode: (mode: 'toggle' | 'hold') => void
  
  // TTS actions
  speakCurrentQuestion: () => void
  stopSpeaking: () => void
  
  // Submission actions  
  submitTest: () => Promise<void>
  setAutoSubmit: (enabled: boolean) => void
  
  // Utility functions
  getProgressPercentage: () => number
  canNavigateNext: () => boolean
  canNavigatePrevious: () => boolean
  isLastQuestion: () => boolean
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useTestFlow({ 
  config, 
  onSubmissionComplete, 
  onError 
}: UseTestFlowOptions): UseTestFlowReturn {
  
  // State management with reducer
  const [state, dispatch] = useReducer(testReducer, createInitialTestState(config))
  
  // Refs for cleanup and persistence
  const autoSubmissionIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  
  // Initialize test with config
  useEffect(() => {
    dispatch({ type: 'INIT_TEST', payload: config })
  }, [config])
  
  // Cleanup on unmount - global cleanup handles navigation
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (autoSubmissionIdRef.current) {
        autoSubmissionService.cancelAutoSubmission(autoSubmissionIdRef.current)
      }
      // Use centralized cleanup to avoid duplication
      cleanupAllResources()
    }
  }, [])
  
  // =============================================================================
  // DERIVED STATE SELECTORS
  // =============================================================================
  
  const currentQuestion = selectCurrentQuestion(state)
  const canSubmit = selectCanSubmit(state)
  const recordingStatus = selectRecordingStatus(state)
  
  // =============================================================================
  // TEST CONTROL ACTIONS
  // =============================================================================
  
  const startTest = useCallback(() => {
    console.log('startTest called, config:', config)
    console.log('testStarted before:', state.testFlow.testStarted)
    dispatch({ type: 'START_TEST' })
    console.log('START_TEST dispatched')
  }, [config, state.testFlow.testStarted])
  
  const resetTest = useCallback(() => {
    // Cancel any auto-submission
    if (autoSubmissionIdRef.current) {
      autoSubmissionService.cancelAutoSubmission(autoSubmissionIdRef.current)
      autoSubmissionIdRef.current = null
    }
    
    // Stop audio services
    audioRecorder.cleanup()
    ttsService.stop()
    
    // Reset state
    dispatch({ type: 'RESET_TEST' })
  }, [])
  
  const nextQuestion = useCallback(() => {
    if (state.testFlow.currentQuestionIndex < config.questions.length - 1) {
      dispatch({ type: 'NEXT_QUESTION' })
      
      // Auto-play next question after short delay
      setTimeout(() => {
        const nextIndex = state.testFlow.currentQuestionIndex + 1
        const nextQuestionText = config.questions[nextIndex]?.text
        if (nextQuestionText) {
          speakQuestion(nextQuestionText)
        }
      }, 500)
    }
  }, [state.testFlow.currentQuestionIndex, config.questions.length])
  
  const previousQuestion = useCallback(() => {
    if (state.testFlow.currentQuestionIndex > 0) {
      dispatch({ type: 'PREVIOUS_QUESTION' })
      
      // Auto-play previous question after short delay
      setTimeout(() => {
        const prevIndex = state.testFlow.currentQuestionIndex - 1
        const prevQuestionText = config.questions[prevIndex]?.text
        if (prevQuestionText) {
          speakQuestion(prevQuestionText)
        }
      }, 500)
    }
  }, [state.testFlow.currentQuestionIndex])
  
  // =============================================================================
  // RECORDING ACTIONS
  // =============================================================================
  
  const startRecording = useCallback(async () => {
    try {
      dispatch({ type: 'START_RECORDING' })
      await audioRecorder.startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
      onError?.(error as Error)
      // Reset recording state on error
      dispatch({ type: 'STOP_RECORDING', payload: { audioBlob: new Blob(), audioUrl: '' } })
    }
  }, [onError])
  
  const stopRecording = useCallback(async () => {
    try {
      const { audioBlob, audioUrl } = await audioRecorder.stopRecording()
      
      dispatch({ 
        type: 'STOP_RECORDING', 
        payload: { audioBlob, audioUrl } 
      })
      
      // Handle auto-advance and auto-submit logic
      if (config.autoAdvance) {
        const isLastQuestion = state.testFlow.currentQuestionIndex === config.questions.length - 1
        
        if (isLastQuestion && config.autoSubmit) {
          // Schedule auto-submission for last question
          autoSubmissionIdRef.current = autoSubmissionService.scheduleAutoSubmission(
            {
              endpoint: config.submitEndpoint,
              testType: config.type,
              questions: config.questions.map(q => q.text),
              questionAnswers: [...state.testFlow.questionAnswers.slice(0, -1), { 
                ...currentQuestion, 
                audioBlob, 
                audioUrl 
              }]
            },
            2000, // 2 second delay
            handleSubmissionResult
          )
        } else if (!isLastQuestion) {
          // Auto-advance to next question
          setTimeout(() => {
            nextQuestion()
          }, 1000)
        }
      }
      
    } catch (error) {
      console.error('Failed to stop recording:', error)
      onError?.(error as Error)
    }
  }, [config, state.testFlow, currentQuestion, nextQuestion, onError])
  
  const reRecordCurrentQuestion = useCallback(() => {
    dispatch({ type: 'RE_RECORD_CURRENT_QUESTION' })
  }, [])
  
  const setRecordingMode = useCallback((mode: 'toggle' | 'hold') => {
    dispatch({ type: 'SET_RECORDING_MODE', payload: mode })
  }, [])
  
  // =============================================================================
  // TTS ACTIONS
  // =============================================================================
  
  const speakQuestion = useCallback(async (questionText: string) => {
    try {
      dispatch({ type: 'START_TTS', payload: questionText })
      
      const cleanedText = cleanTextForTTS(questionText)
      
      await ttsService.speak(cleanedText, {
        rate: 0.8,
        pitch: 1.0,
        volume: 0.9
      }, {
        onEnd: () => {
          if (mountedRef.current) {
            dispatch({ type: 'STOP_TTS' })
          }
        },
        onError: (error) => {
          if (mountedRef.current) {
            dispatch({ type: 'STOP_TTS' })
            console.warn('TTS error:', error)
          }
        }
      })
      
    } catch (error) {
      dispatch({ type: 'STOP_TTS' })
      console.warn('Failed to speak question:', error)
    }
  }, [])
  
  const speakCurrentQuestion = useCallback(() => {
    if (currentQuestion?.question) {
      speakQuestion(currentQuestion.question)
    }
  }, [currentQuestion?.question, speakQuestion])
  
  const stopSpeaking = useCallback(() => {
    ttsService.stop()
    dispatch({ type: 'STOP_TTS' })
  }, [])
  
  // =============================================================================
  // SUBMISSION ACTIONS
  // =============================================================================
  
  const handleSubmissionResult = useCallback((result: SubmissionResult) => {
    if (result.success) {
      dispatch({ type: 'SUBMISSION_SUCCESS', payload: result.data! })
      
      // Navigate to results page
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
      }
    } else {
      dispatch({ type: 'SUBMISSION_ERROR', payload: result.error!.message })
    }
    
    onSubmissionComplete?.(result)
  }, [onSubmissionComplete])
  
  const submitTest = useCallback(async () => {
    try {
      dispatch({ type: 'START_SUBMISSION' })
      
      const result = await submissionService.submitTest({
        endpoint: config.submitEndpoint,
        testType: config.type,
        questions: config.questions.map(q => q.text),
        questionAnswers: state.testFlow.questionAnswers
      })
      
      handleSubmissionResult(result)
      
    } catch (error) {
      dispatch({ type: 'SUBMISSION_ERROR', payload: (error as Error).message })
      onError?.(error as Error)
    }
  }, [config, state.testFlow.questionAnswers, handleSubmissionResult, onError])
  
  const setAutoSubmit = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_SUBMIT', payload: enabled })
  }, [])
  
  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  const getProgressPercentage = useCallback(() => {
    return Math.round(((state.testFlow.currentQuestionIndex + 1) / config.questions.length) * 100)
  }, [state.testFlow.currentQuestionIndex, config.questions.length])
  
  const canNavigateNext = useCallback(() => {
    return currentQuestion?.audioBlob !== null && 
           state.testFlow.currentQuestionIndex < config.questions.length - 1
  }, [currentQuestion?.audioBlob, state.testFlow.currentQuestionIndex, config.questions.length])
  
  const canNavigatePrevious = useCallback(() => {
    return state.testFlow.currentQuestionIndex > 0
  }, [state.testFlow.currentQuestionIndex])
  
  const isLastQuestion = useCallback(() => {
    return state.testFlow.currentQuestionIndex === config.questions.length - 1
  }, [state.testFlow.currentQuestionIndex, config.questions.length])
  
  // =============================================================================
  // RETURN INTERFACE
  // =============================================================================
  
  return {
    // State
    state,
    
    // Current question info
    currentQuestion,
    canSubmit,
    recordingStatus,
    
    // Test control actions
    startTest,
    resetTest,
    nextQuestion,
    previousQuestion,
    
    // Recording actions
    startRecording,
    stopRecording,
    reRecordCurrentQuestion,
    setRecordingMode,
    
    // TTS actions
    speakCurrentQuestion,
    stopSpeaking,
    
    // Submission actions
    submitTest,
    setAutoSubmit,
    
    // Utility functions
    getProgressPercentage,
    canNavigateNext,
    canNavigatePrevious,
    isLastQuestion
  }
}