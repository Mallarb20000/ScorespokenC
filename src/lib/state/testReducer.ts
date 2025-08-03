/**
 * =============================================================================
 * TEST STATE REDUCER
 * =============================================================================
 * 
 * Centralized state management for IELTS test flow
 * Replaces multiple useState calls with predictable state transitions
 */

import { TestState, TestAction, TestConfig, QuestionAnswer, RecordingState } from '../types'

// =============================================================================
// INITIAL STATE FACTORY
// =============================================================================

export const createInitialTestState = (config?: TestConfig): TestState => ({
  config: config || {
    type: 'quick',
    title: '',
    description: '',
    questions: [],
    autoAdvance: false,
    autoSubmit: false,
    submitEndpoint: '',
    resultRoute: ''
  },
  testFlow: {
    testStarted: false,
    currentQuestionIndex: 0,
    questionAnswers: config?.questions.map(q => ({
      question: q.text,
      questionId: q.id,
      audioBlob: null,
      audioUrl: null
    })) || [],
    allQuestionsAnswered: false,
    progressPercentage: 0,
    autoSubmit: config?.autoSubmit || false,
    autoAdvance: config?.autoAdvance || false
  },
  audioRecording: {
    isRecording: false,
    recordingMode: 'toggle',
    canRecord: false,
    isTouchPressed: false,
    isSpacePressed: false,
    recordingState: 'idle',
    currentAudioBlob: null,
    currentAudioUrl: null,
    duration: 0
  },
  tts: {
    isSpeaking: false,
    canRecord: false,
    currentUtterance: null,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window
  },
  submission: {
    state: 'idle',
    isProcessing: false,
    error: null,
    retryCount: 0,
    canRetry: false
  },
  results: null
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const calculateProgress = (currentIndex: number, totalQuestions: number): number => {
  return Math.round(((currentIndex + 1) / totalQuestions) * 100)
}

const checkAllQuestionsAnswered = (questionAnswers: QuestionAnswer[]): boolean => {
  return questionAnswers.every(qa => qa.audioBlob !== null)
}

const updateQuestionAnswer = (
  questionAnswers: QuestionAnswer[],
  index: number,
  audioBlob: Blob,
  audioUrl: string
): QuestionAnswer[] => {
  return questionAnswers.map((qa, i) => 
    i === index 
      ? { ...qa, audioBlob, audioUrl, recordedAt: new Date() }
      : qa
  )
}

const clearCurrentQuestionAnswer = (
  questionAnswers: QuestionAnswer[],
  index: number
): QuestionAnswer[] => {
  return questionAnswers.map((qa, i) => 
    i === index 
      ? { ...qa, audioBlob: null, audioUrl: null, recordedAt: undefined }
      : qa
  )
}

// =============================================================================
// MAIN REDUCER
// =============================================================================

export const testReducer = (state: TestState, action: TestAction): TestState => {
  switch (action.type) {
    
    // =============================================================================
    // TEST INITIALIZATION & CONTROL
    // =============================================================================
    
    case 'INIT_TEST':
      return createInitialTestState(action.payload)
    
    case 'START_TEST':
      return {
        ...state,
        testFlow: {
          ...state.testFlow,
          testStarted: true
        }
      }
    
    case 'RESET_TEST':
      return createInitialTestState(state.config)
    
    // =============================================================================
    // QUESTION NAVIGATION
    // =============================================================================
    
    case 'NEXT_QUESTION': {
      const nextIndex = Math.min(
        state.testFlow.currentQuestionIndex + 1,
        state.config.questions.length - 1
      )
      
      return {
        ...state,
        testFlow: {
          ...state.testFlow,
          currentQuestionIndex: nextIndex,
          progressPercentage: calculateProgress(nextIndex, state.config.questions.length)
        },
        audioRecording: {
          ...state.audioRecording,
          recordingState: 'idle',
          currentAudioBlob: null,
          currentAudioUrl: null
        }
      }
    }
    
    case 'PREVIOUS_QUESTION': {
      const prevIndex = Math.max(state.testFlow.currentQuestionIndex - 1, 0)
      
      return {
        ...state,
        testFlow: {
          ...state.testFlow,
          currentQuestionIndex: prevIndex,
          progressPercentage: calculateProgress(prevIndex, state.config.questions.length)
        },
        audioRecording: {
          ...state.audioRecording,
          recordingState: 'idle',
          currentAudioBlob: null,
          currentAudioUrl: null
        }
      }
    }
    
    // =============================================================================
    // AUDIO RECORDING
    // =============================================================================
    
    case 'START_RECORDING':
      return {
        ...state,
        audioRecording: {
          ...state.audioRecording,
          isRecording: true,
          recordingState: 'recording',
          currentAudioBlob: null,
          currentAudioUrl: null
        }
      }
    
    case 'STOP_RECORDING': {
      const updatedQuestionAnswers = updateQuestionAnswer(
        state.testFlow.questionAnswers,
        state.testFlow.currentQuestionIndex,
        action.payload.audioBlob,
        action.payload.audioUrl
      )
      
      const allAnswered = checkAllQuestionsAnswered(updatedQuestionAnswers)
      
      return {
        ...state,
        testFlow: {
          ...state.testFlow,
          questionAnswers: updatedQuestionAnswers,
          allQuestionsAnswered: allAnswered
        },
        audioRecording: {
          ...state.audioRecording,
          isRecording: false,
          recordingState: 'completed',
          currentAudioBlob: action.payload.audioBlob,
          currentAudioUrl: action.payload.audioUrl
        }
      }
    }
    
    case 'RE_RECORD_CURRENT_QUESTION': {
      const clearedQuestionAnswers = clearCurrentQuestionAnswer(
        state.testFlow.questionAnswers,
        state.testFlow.currentQuestionIndex
      )
      
      return {
        ...state,
        testFlow: {
          ...state.testFlow,
          questionAnswers: clearedQuestionAnswers,
          allQuestionsAnswered: false
        },
        audioRecording: {
          ...state.audioRecording,
          recordingState: 'idle',
          currentAudioBlob: null,
          currentAudioUrl: null
        }
      }
    }
    
    case 'SET_RECORDING_MODE':
      return {
        ...state,
        audioRecording: {
          ...state.audioRecording,
          recordingMode: action.payload
        }
      }
    
    // =============================================================================
    // TEXT-TO-SPEECH
    // =============================================================================
    
    case 'START_TTS':
      return {
        ...state,
        tts: {
          ...state.tts,
          isSpeaking: true
        },
        audioRecording: {
          ...state.audioRecording,
          canRecord: false
        }
      }
    
    case 'STOP_TTS':
      return {
        ...state,
        tts: {
          ...state.tts,
          isSpeaking: false
        },
        audioRecording: {
          ...state.audioRecording,
          canRecord: true
        }
      }
    
    // =============================================================================
    // SUBMISSION HANDLING
    // =============================================================================
    
    case 'START_SUBMISSION':
      return {
        ...state,
        submission: {
          ...state.submission,
          state: 'submitting',
          isProcessing: true,
          error: null
        }
      }
    
    case 'SUBMISSION_SUCCESS':
      return {
        ...state,
        submission: {
          ...state.submission,
          state: 'success',
          isProcessing: false,
          error: null
        },
        results: action.payload
      }
    
    case 'SUBMISSION_ERROR':
      return {
        ...state,
        submission: {
          ...state.submission,
          state: 'error',
          isProcessing: false,
          error: action.payload,
          retryCount: state.submission.retryCount + 1,
          canRetry: state.submission.retryCount < 3
        }
      }
    
    // =============================================================================
    // CONFIGURATION UPDATES
    // =============================================================================
    
    case 'SET_AUTO_SUBMIT':
      return {
        ...state,
        testFlow: {
          ...state.testFlow,
          autoSubmit: action.payload
        }
      }
    
    default:
      return state
  }
}

// =============================================================================
// SELECTOR FUNCTIONS
// =============================================================================

export const selectCurrentQuestion = (state: TestState) => {
  const currentIndex = state.testFlow.currentQuestionIndex
  return state.testFlow.questionAnswers[currentIndex]
}

export const selectCanNavigateNext = (state: TestState) => {
  const currentQuestion = selectCurrentQuestion(state)
  return currentQuestion?.audioBlob !== null && 
         state.testFlow.currentQuestionIndex < state.config.questions.length - 1
}

export const selectCanNavigatePrevious = (state: TestState) => {
  return state.testFlow.currentQuestionIndex > 0
}

export const selectIsLastQuestion = (state: TestState) => {
  return state.testFlow.currentQuestionIndex === state.config.questions.length - 1
}

export const selectCanSubmit = (state: TestState) => {
  return state.testFlow.allQuestionsAnswered && 
         state.submission.state !== 'submitting'
}

export const selectRecordingStatus = (state: TestState) => {
  return {
    isRecording: state.audioRecording.isRecording,
    canRecord: state.audioRecording.canRecord && !state.tts.isSpeaking,
    recordingMode: state.audioRecording.recordingMode,
    hasRecording: selectCurrentQuestion(state)?.audioBlob !== null
  }
}