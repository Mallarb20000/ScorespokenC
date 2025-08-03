/**
 * =============================================================================
 * SHARED TYPE DEFINITIONS
 * =============================================================================
 * 
 * Comprehensive TypeScript interfaces for the IELTS testing platform
 * Centralized type definitions to prevent duplication and ensure consistency
 */

// =============================================================================
// CORE ENTITIES
// =============================================================================

export interface Question {
  id: string
  text: string
  category?: string
  timeLimit?: number
  preparationTime?: number
  metadata?: Record<string, any>
}

export interface QuestionAnswer {
  question: string
  questionId?: string
  audioBlob: Blob | null
  audioUrl: string | null
  recordedAt?: Date
  duration?: number
}

// =============================================================================
// TEST CONFIGURATIONS
// =============================================================================

export type TestType = 'quick' | 'part1' | 'part2' | 'part3'

export interface TestConfig {
  type: TestType
  title: string
  description: string
  questions: Question[]
  timeLimit?: number
  autoAdvance: boolean
  autoSubmit: boolean
  submitEndpoint: string
  resultRoute: string
  instructions?: string
}

// =============================================================================
// AUDIO RECORDING STATES
// =============================================================================

export type RecordingMode = 'toggle' | 'hold'
export type RecordingState = 'idle' | 'recording' | 'paused' | 'completed'

export interface AudioRecordingState {
  isRecording: boolean
  recordingMode: RecordingMode
  canRecord: boolean
  isTouchPressed: boolean
  isSpacePressed: boolean
  recordingState: RecordingState
  currentAudioBlob: Blob | null
  currentAudioUrl: string | null
  duration: number
}

// =============================================================================
// TEXT-TO-SPEECH STATES
// =============================================================================

export interface TTSState {
  isSpeaking: boolean
  canRecord: boolean
  currentUtterance: SpeechSynthesisUtterance | null
  isSupported: boolean
}

// =============================================================================
// TEST FLOW STATES
// =============================================================================

export interface TestFlowState {
  testStarted: boolean
  currentQuestionIndex: number
  questionAnswers: QuestionAnswer[]
  allQuestionsAnswered: boolean
  progressPercentage: number
  autoSubmit: boolean
  autoAdvance: boolean
}

// =============================================================================
// SUBMISSION STATES
// =============================================================================

export type SubmissionState = 'idle' | 'preparing' | 'submitting' | 'success' | 'error'

export interface SubmissionStatus {
  state: SubmissionState
  isProcessing: boolean
  error: string | null
  retryCount: number
  canRetry: boolean
}

// =============================================================================
// RESULTS INTERFACES
// =============================================================================

export interface CriterionScore {
  score: string
  strengths: string
  improvements: string
}

export interface TestResults {
  transcript: string
  individual_transcripts?: Array<{
    question: string
    answer: string
  }>
  score: string
  merged_audio_url?: string
  individual_audio_urls?: string[]
  audio_note?: string
  fluency_coherence: CriterionScore
  lexical_resource: CriterionScore
  grammatical_range: CriterionScore
  pronunciation: CriterionScore
  overall_assessment: string
}

// =============================================================================
// COMBINED STATE INTERFACES
// =============================================================================

export interface TestState {
  config: TestConfig
  testFlow: TestFlowState
  audioRecording: AudioRecordingState
  tts: TTSState
  submission: SubmissionStatus
  results: TestResults | null
}

// =============================================================================
// ACTION TYPES FOR STATE MANAGEMENT
// =============================================================================

export type TestAction =
  | { type: 'INIT_TEST'; payload: TestConfig }
  | { type: 'START_TEST' }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREVIOUS_QUESTION' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING'; payload: { audioBlob: Blob; audioUrl: string } }
  | { type: 'START_TTS'; payload: string }
  | { type: 'STOP_TTS' }
  | { type: 'SET_RECORDING_MODE'; payload: RecordingMode }
  | { type: 'SET_AUTO_SUBMIT'; payload: boolean }
  | { type: 'START_SUBMISSION' }
  | { type: 'SUBMISSION_SUCCESS'; payload: TestResults }
  | { type: 'SUBMISSION_ERROR'; payload: string }
  | { type: 'RESET_TEST' }
  | { type: 'RE_RECORD_CURRENT_QUESTION' }

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface AppError {
  code: string
  message: string
  details?: any
  recoverable: boolean
}

export type ErrorType = 
  | 'MICROPHONE_ACCESS_DENIED'
  | 'RECORDING_FAILED'
  | 'SUBMISSION_FAILED'
  | 'TTS_FAILED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'

// =============================================================================
// API INTERFACES
// =============================================================================

export interface SubmissionPayload {
  testType: TestType
  questions: string[]
  audioFiles: File[]
  metadata?: Record<string, any>
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// =============================================================================
// COMPONENT PROPS INTERFACES
// =============================================================================

export interface CriteriaCardProps {
  title: string
  icon: string
  score: string
  strengths: string
  improvements: string
  gradient: string
  shadowColor: string
}

export interface RecordingControlsProps {
  isRecording: boolean
  canRecord: boolean
  recordingMode: RecordingMode
  onStartRecording: () => void
  onStopRecording: () => void
  onModeChange: (mode: RecordingMode) => void
  isMobile?: boolean
}

export interface QuestionDisplayProps {
  question: string
  questionNumber: number
  totalQuestions: number
  progress: number
  onPlayTTS: () => void
  onStopTTS: () => void
  isSpeaking: boolean
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}