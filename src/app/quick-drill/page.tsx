/*
 * =============================================================================
 * IELTS QUICK DRILL COMPONENT
 * =============================================================================
 * 
 * This component handles a single IELTS speaking question practice session.
 * 
 * DATA FLOW OVERVIEW:
 * 1. User clicks "Start Recording" → startRecording() → Browser MediaRecorder API
 * 2. Audio data streams → chunks array → audioBlob state
 * 3. User submits → submitAnswer() → HTTP POST to backend
 * 4. Backend processes with Gemini AI → Returns structured results
 * 5. Results rendered in UI with individual criteria scores
 * 
 * LEARNING OBJECTIVES:
 * - React state management with useState hook
 * - Browser APIs (MediaRecorder, URL.createObjectURL)
 * - HTTP requests with fetch API
 * - TypeScript interfaces and type safety
 * - Component composition and reusability
 * - CSS-in-JS styling patterns
 */

'use client' // Next.js directive: This component runs on the client side (browser)

import { useState, useRef, useEffect } from 'react'
import { ResultsDisplay } from '../../components/ResultsDisplay'

/**
 * MAIN COMPONENT: QuickDrillPage
 * ==============================
 * 
 * This is the main container component that manages the entire IELTS practice session.
 * 
 * STATE MANAGEMENT ARCHITECTURE:
 * - Uses React hooks for state management (no external state library needed)
 * - Each state variable has a specific purpose in the audio recording/processing workflow
 * - useRef hooks manage browser API objects that don't trigger re-renders
 */
export default function QuickDrillPage() {
  
  // =============================================================================
  // STATE VARIABLES - Each controls a specific aspect of the user interface
  // =============================================================================
  
  /**
   * UI State Management:
   * These boolean states control which UI elements are visible/interactive
   */
  const [isRecording, setIsRecording] = useState<boolean>(false)  // Controls record button state
  const [isProcessing, setIsProcessing] = useState<boolean>(false) // Shows loading during AI analysis
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false) // Track spacebar state
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true) // Auto-submit toggle
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false) // TTS is playing
  const [canRecord, setCanRecord] = useState<boolean>(false) // Recording allowed after TTS
  const [isTouchPressed, setIsTouchPressed] = useState<boolean>(false) // Track touch & hold state
  const [recordingMode, setRecordingMode] = useState<'toggle' | 'hold'>('toggle') // Recording mode
  
  /**
   * Audio Data Management:
   * These states hold the actual audio data in different formats
   */
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)    // Raw audio data for upload
  const [audioUrl, setAudioUrl] = useState<string | null>(null)    // Browser URL for audio playback
  
  /**
   * Result Data Management:
   * Stores the AI analysis results from the backend
   */
  const [result, setResult] = useState<any>(null) // TODO: Replace 'any' with proper TypeScript interface
  
  // =============================================================================
  // REF OBJECTS - For managing browser APIs without causing re-renders
  // =============================================================================
  
  /**
   * Browser API References:
   * useRef allows us to store mutable objects that persist across renders
   * but don't trigger re-renders when changed (unlike useState)
   */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)  // MediaRecorder API instance
  const chunksRef = useRef<Blob[]>([])                        // Temporary audio data storage
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null) // TTS instance
  
  // =============================================================================
  // STATIC DATA
  // =============================================================================
  
  /**
   * IELTS Question:
   * In a real app, this would come from a database or API
   * Part 2 questions typically include: situation, requirements, and explanation
   */
  const question = "Describe a place you would like to visit. You should say: where it is, what you would do there, and why you would like to visit this place."

  // =============================================================================
  // TEXT-TO-SPEECH FUNCTIONS
  // =============================================================================
  
  const speakQuestion = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(question)
      speechSynthesisRef.current = utterance
      
      // Configure voice settings
      utterance.rate = 0.8  // Slightly slower for clarity
      utterance.pitch = 1.0
      utterance.volume = 0.9
      
      // Set up event handlers
      utterance.onstart = () => {
        setIsSpeaking(true)
        setCanRecord(false)
      }
      
      utterance.onend = () => {
        setIsSpeaking(false)
        setCanRecord(true)
      }
      
      utterance.onerror = () => {
        setIsSpeaking(false)
        setCanRecord(true)
      }
      
      // Start speaking
      window.speechSynthesis.speak(utterance)
    } else {
      // Fallback if TTS not supported
      alert('Text-to-speech not supported in this browser')
      setCanRecord(true)
    }
  }
  
  const stopSpeaking = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setCanRecord(true)
    }
  }

  // =============================================================================
  // AUDIO RECORDING FUNCTIONS
  // =============================================================================
  
  /**
   * START RECORDING FUNCTION
   * ========================
   * 
   * This async function handles the complex process of browser audio recording.
   * 
   * DATA FLOW:
   * 1. Request microphone permission from browser
   * 2. Create MediaRecorder instance with audio stream
   * 3. Set up event handlers for data collection
   * 4. Start recording and update UI state
   * 
   * BROWSER APIS USED:
   * - navigator.mediaDevices.getUserMedia() - Gets microphone access
   * - MediaRecorder API - Records audio streams
   * - Blob API - Handles binary audio data
   * - URL.createObjectURL() - Creates browser-playable URL
   * 
   * ERROR HANDLING:
   * - Catches permission denied errors
   * - Handles microphone access failures
   * - Provides user feedback via alerts
   */
  const startRecording = async () => {
    // Don't allow recording while TTS is playing
    if (!canRecord) {
      console.log('⏸️ Recording blocked - waiting for question to finish')
      return
    }
    
    try {
      // Step 1: Request microphone access from the browser
      // This will show a permission dialog to the user
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Step 2: Create MediaRecorder instance to capture audio
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder  // Store in ref for later access
      chunksRef.current = []  // Reset audio chunks array
      
      // Step 3: Set up event handlers for the MediaRecorder
      
      /**
       * ondataavailable: Fired periodically during recording
       * Collects audio data chunks as they become available
       */
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)  // Add chunk to our collection
        }
      }
      
      /**
       * onstop: Fired when recording stops
       * Combines all chunks into a single Blob and creates playback URL
       */
      mediaRecorder.onstop = () => {
        // Combine all audio chunks into a single Blob
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)  // Store for later upload to backend
        
        // Create a browser URL for audio playback
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioUrl(audioUrl)  // Store for audio player component
        
        // Clean up: Stop microphone stream to free resources
        stream.getTracks().forEach(track => track.stop())
        
        // Auto-submit when recording stops (if enabled)
        if (autoSubmit) {
          setTimeout(() => {
            console.log('🚀 Auto-submitting audio for analysis...')
            submitAnswerWithBlob(audioBlob)
          }, 500) // Small delay to ensure state updates
        }
      }
      
      // Step 4: Start recording and update UI
      mediaRecorder.start()  // Begin capturing audio
      setIsRecording(true)   // Update UI to show recording state
      
    } catch (error) {
      // Handle various errors (permission denied, no microphone, etc.)
      console.error('Error starting recording:', error)
      alert('Error accessing microphone')  // TODO: Replace with better UI feedback
    }
  }

  /**
   * STOP RECORDING FUNCTION
   * =======================
   * 
   * Simple function to stop the active recording session.
   * This triggers the MediaRecorder's 'onstop' event handler.
   * 
   * DATA FLOW: User clicks stop → MediaRecorder.stop() → onstop event → Blob creation
   */
  const stopRecording = () => {
    // Safety check: Ensure we have an active recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()  // This triggers the 'onstop' event
      setIsRecording(false)             // Update UI immediately
    }
  }

  // =============================================================================
  // MOBILE TOUCH & HOLD FUNCTIONALITY  
  // =============================================================================

  /**
   * Handle touch start for mobile push-to-talk
   */
  const handleTouchStart = (event: React.TouchEvent) => {
    if (!canRecord || isTouchPressed || isRecording) return
    
    event.preventDefault()
    
    if (recordingMode === 'hold') {
      setIsTouchPressed(true)
      startRecording()
      
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }
  }

  /**
   * Handle touch end for mobile push-to-talk
   */
  const handleTouchEnd = (event: React.TouchEvent) => {
    if (recordingMode === 'hold' && isTouchPressed && isRecording) {
      event.preventDefault()
      setIsTouchPressed(false)
      stopRecording()
      
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
    }
  }

  /**
   * Handle click for toggle mode
   */
  const handleButtonClick = () => {
    if (!canRecord) return
    
    if (recordingMode === 'toggle') {
      if (!isRecording) {
        startRecording()
      } else {
        stopRecording()
      }
    }
    // For hold mode, clicks are ignored (only touch events work)
  }

  /**
   * Detect if user is on mobile device
   */
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // =============================================================================
  // PUSH-TO-TALK FUNCTIONALITY
  // =============================================================================
  
  /**
   * Push-to-talk keyboard event handlers
   * Spacebar press starts recording, release stops recording
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle spacebar for push-to-talk
      if (event.code !== 'Space') return
      
      // Prevent default spacebar behavior (page scroll)
      event.preventDefault()
      
      // Start recording if not already recording and spacebar just pressed
      if (!isSpacePressed && !isRecording && canRecord) {
        setIsSpacePressed(true)
        startRecording()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      // Only handle spacebar for push-to-talk
      if (event.code !== 'Space') return
      
      // Stop recording when spacebar is released (only if started with spacebar)
      if (isSpacePressed && isRecording) {
        setIsSpacePressed(false)
        stopRecording()
      }
    }

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed, isRecording, canRecord, startRecording, stopRecording])

  // Auto-play question when component loads
  useEffect(() => {
    speakQuestion()
  }, [])

  // =============================================================================
  // API COMMUNICATION FUNCTIONS
  // =============================================================================
  
  /**
   * SUBMIT ANSWER FUNCTION WITH BLOB
   * =================================
   * 
   * This function handles auto-submission with a provided audio blob
   */
  const submitAnswerWithBlob = async (blob: Blob) => {
    // Step 1: Set loading state for better user experience
    setIsProcessing(true)
    console.log('📤 Submitting audio to backend...', { blobSize: blob.size, question })
    
    try {
      // Step 2: Prepare data for upload using FormData
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')  // Audio file
      formData.append('question', question)             // Question text
      
      console.log('📡 Sending request to backend...')
      
      // Step 3: Send HTTP POST request to our backend API
      const response = await fetch('http://localhost:3002/api/analyze-answer', {
        method: 'POST',
        body: formData,  // FormData automatically sets correct headers
      })
      
      console.log('📥 Backend response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`)
      }
      
      // Step 4: Parse JSON response from backend
      const data = await response.json()
      console.log('✅ Analysis complete:', data)
      
      // Step 5: Store results in state, triggering UI re-render
      setResult(data)
      
    } catch (error) {
      // Handle network errors, server errors, parsing errors, etc.
      console.error('❌ Error submitting answer:', error)
      alert(`Error processing your answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      // Always reset loading state, regardless of success or failure
      setIsProcessing(false)
      console.log('🏁 Processing complete')
    }
  }

  /**
   * SUBMIT ANSWER FUNCTION
   * ======================
   * 
   * This function handles manual submission using the existing audioBlob
   */
  const submitAnswer = async () => {
    // Guard clause: Don't proceed without audio data
    if (!audioBlob) return
    
    await submitAnswerWithBlob(audioBlob)
  }

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ fontSize: '2rem', marginBottom: '24px', textAlign: 'center' }}>
          Quick Drill - Part 1
        </h1>
        
        <div className="question-text">
          <strong>Question:</strong> {question}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          {isSpeaking ? (
            <div>
              <button onClick={stopSpeaking} className="btn" style={{ background: '#f59e0b', color: 'white' }}>
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
            <button onClick={speakQuestion} className="btn" style={{ background: '#10b981', color: 'white' }}>
              🔊 Replay Question
            </button>
          )}
        </div>


        {/* Recording Mode Toggle */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ 
            display: 'inline-flex',
            background: '#f3f4f6',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              onClick={() => setRecordingMode('toggle')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: recordingMode === 'toggle' ? '#3b82f6' : 'transparent',
                color: recordingMode === 'toggle' ? 'white' : '#6b7280',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: recordingMode === 'toggle' ? 'bold' : 'normal'
              }}
            >
              📱 Tap Mode
            </button>
            <button
              onClick={() => setRecordingMode('hold')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: recordingMode === 'hold' ? '#3b82f6' : 'transparent',
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

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {!isRecording && !audioBlob && (
            <div>
              <button 
                onClick={handleButtonClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="btn btn-primary"
                disabled={!canRecord}
                style={{
                  opacity: canRecord ? 1 : 0.5,
                  cursor: canRecord ? 'pointer' : 'not-allowed',
                  minHeight: '60px',
                  minWidth: isMobile ? '200px' : '160px',
                  fontSize: '16px',
                  background: isTouchPressed 
                    ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                    : canRecord 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  transform: isTouchPressed ? 'scale(0.95)' : 'scale(1)',
                  transition: 'all 0.1s ease'
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
                marginTop: '12px'
              }}>
                {!canRecord ? (
                  <>🔊 Wait for question to finish before recording</>
                ) : recordingMode === 'toggle' ? (
                  <>Click to start/stop recording or hold <strong>spacebar</strong></>
                ) : (
                  <>Hold button to record or use <strong>spacebar</strong> on desktop</>
                )}
              </div>
            </div>
          )}
          
          {isRecording && (
            <div>
              {recordingMode === 'toggle' && (
                <button 
                  onClick={handleButtonClick}
                  className="btn btn-primary recording"
                  style={{ 
                    marginBottom: '12px',
                    minHeight: '60px',
                    minWidth: isMobile ? '200px' : '160px',
                    fontSize: '16px',
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
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
                  isSpacePressed ? '(Release spacebar to stop)' :
                  isTouchPressed ? '(Release button to stop)' :
                  recordingMode === 'toggle' ? '(Click stop button)' :
                  '(Release hold button)'
                }
              </div>
            </div>
          )}
          
          {audioBlob && !isProcessing && !result && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {!autoSubmit && (
                <button onClick={submitAnswer} className="btn btn-primary">
                  📤 Submit Answer
                </button>
              )}
              {autoSubmit && (
                <button onClick={submitAnswer} className="btn btn-primary">
                  🔄 Resubmit Analysis
                </button>
              )}
              <button 
                onClick={() => {
                  setAudioBlob(null)
                  setAudioUrl(null)
                  setResult(null)
                }} 
                className="btn"
                style={{ background: '#6b7280', color: 'white' }}
              >
                🔄 Record Again
              </button>
            </div>
          )}
          
          {isProcessing && (
            <div style={{ color: '#666' }}>
              <div style={{ marginBottom: '8px' }}>🤖 AI is analyzing your answer...</div>
              <div style={{ fontSize: '14px' }}>This may take a few moments</div>
            </div>
          )}
        </div>

        {result && (
          <ResultsDisplay
            transcript={result.transcript}
            score={result.score}
            audioUrl={audioUrl || undefined}
            fluency_coherence={result.fluency_coherence}
            lexical_resource={result.lexical_resource}
            grammatical_range={result.grammatical_range}
            pronunciation={result.pronunciation}
            overall_assessment={result.overall_assessment}
            testType="quick-drill"
          />
        )}
      </div>
    </div>
  )
}