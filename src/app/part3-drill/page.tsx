/*
 * =============================================================================
 * IELTS PART 3 DRILL COMPONENT - DISCUSSION QUESTIONS
 * =============================================================================
 * 
 * This component handles IELTS Speaking Part 3 - Two-way Discussion
 * 
 * PART 3 STRUCTURE:
 * - 4-6 abstract discussion questions (follow-up to Part 2 topic)
 * - Questions require analytical thinking and complex opinions
 * - Longer, more detailed answers than Part 1
 * - Focus on abstract concepts, opinions, comparisons, speculation
 * 
 * PART 3 CHARACTERISTICS:
 * - Questions are more complex and require deeper thinking
 * - Candidates should give extended responses (not just short answers)
 * - Topics are more abstract (society, trends, changes, comparisons)
 * - Requires opinion justification and examples
 * 
 * LEARNING OBJECTIVES:
 * - Sequential question flow with progress tracking
 * - Extended answer recording (30-60 seconds per question)
 * - AI analysis focused on abstract thinking and argumentation
 * - Discussion-style question progression
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { ResultsDisplay } from '../../components/ResultsDisplay'

/**
 * TypeScript interface for individual question-answer pairs
 */
interface QuestionAnswer {
  question: string
  audioBlob: Blob | null
  audioUrl: string | null
}

/**
 * TypeScript interface for IELTS Part 3 results
 */
interface Part3Results {
  transcript: string
  individual_transcripts?: Array<{
    question: string
    answer: string
  }>
  score: string
  fluency_coherence: {
    score: string
    strengths: string
    improvements: string
  }
  lexical_resource: {
    score: string
    strengths: string
    improvements: string
  }
  grammatical_range: {
    score: string
    strengths: string
    improvements: string
  }
  pronunciation: {
    score: string
    strengths: string
    improvements: string
  }
  overall_assessment: string
}

/**
 * Reusable Criteria Card Component
 */
const CriteriaCard = ({ title, icon, score, strengths, improvements, gradient, shadowColor }: {
  title: string
  icon: string
  score: string
  strengths: string
  improvements: string
  gradient: string
  shadowColor: string
}) => {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid #e5e7eb',
      boxShadow: `0 4px 6px ${shadowColor}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: gradient
      }} />
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <h4 style={{ 
          margin: 0, 
          color: '#374151', 
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          {title}
        </h4>
      </div>
      
      <div style={{
        background: gradient,
        color: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '12px', opacity: '0.9', marginBottom: '4px' }}>
          Band Score
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          {score}
        </div>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ 
          margin: '0 0 8px 0', 
          color: '#059669', 
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          ✅ Strengths
        </h5>
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          lineHeight: '1.5',
          color: '#4b5563'
        }}>
          {strengths}
        </p>
      </div>
      
      <div>
        <h5 style={{ 
          margin: '0 0 8px 0', 
          color: '#dc2626', 
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          🔧 Areas for Improvement
        </h5>
        <p style={{ 
          margin: 0, 
          fontSize: '14px', 
          lineHeight: '1.5',
          color: '#4b5563'
        }}>
          {improvements}
        </p>
      </div>
    </div>
  )
}

export default function Part3DrillPage() {
  
  // =============================================================================
  // PART 3 QUESTION SETS
  // =============================================================================
  
  /**
   * Part 3 discussion questions - abstract and analytical
   * These questions require extended responses and complex thinking
   */
  const part3QuestionSets = [
    {
      theme: "Technology and Society",
      questions: [
        "How has technology changed the way people communicate compared to the past?",
        "Do you think social media has a positive or negative impact on relationships? Why?",
        "What role should technology play in education?",
        "How might artificial intelligence affect employment in the future?",
        "Should there be more regulation of technology companies? Why or why not?"
      ]
    },
    {
      theme: "Work and Career",
      questions: [
        "What factors do you think are most important when choosing a career?",
        "How has the concept of work-life balance changed in recent years?",
        "Do you believe people should work in jobs they're passionate about, even if they pay less?",
        "What impact does globalization have on employment opportunities?",
        "How important is job security compared to job satisfaction?"
      ]
    },
    {
      theme: "Environment and Sustainability",
      questions: [
        "What do you think are the most effective ways to address climate change?",
        "Should individuals or governments be primarily responsible for environmental protection?",
        "How can we balance economic development with environmental conservation?",
        "Do you think younger generations are more environmentally conscious than older ones? Why?",
        "What role should education play in promoting environmental awareness?"
      ]
    },
    {
      theme: "Culture and Globalization",
      questions: [
        "How important is it to preserve traditional cultures in a globalized world?",
        "Do you think globalization leads to cultural homogenization or diversity?",
        "What are the benefits and drawbacks of people migrating to different countries?",
        "How has international travel affected people's understanding of other cultures?",
        "Should schools teach more about different cultures and global issues?"
      ]
    }
  ]

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================
  
  /**
   * Current question index and selected question set
   */
  const [selectedQuestionSet, setSelectedQuestionSet] = useState(part3QuestionSets[0])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  /**
   * Array to store all question-answer pairs
   */
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswer[]>(
    selectedQuestionSet.questions.map(question => ({
      question,
      audioBlob: null,
      audioUrl: null
    }))
  )
  
  /**
   * Component states
   */
  const [testStarted, setTestStarted] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<Part3Results | null>(null)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false) // TTS is playing
  const [canRecord, setCanRecord] = useState<boolean>(false) // Recording allowed after TTS
  const [isTouchPressed, setIsTouchPressed] = useState<boolean>(false) // Track touch & hold state
  const [recordingMode, setRecordingMode] = useState<'toggle' | 'hold'>('toggle') // Recording mode
  
  /**
   * Refs for MediaRecorder management
   */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null) // TTS instance
  
  /**
   * Push-to-talk state
   */
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  
  // =============================================================================
  // TEST CONTROL FUNCTIONS
  // =============================================================================
  
  /**
   * Start Part 3 test with selected theme
   */
  const startTest = (questionSetIndex: number) => {
    const selectedSet = part3QuestionSets[questionSetIndex]
    setSelectedQuestionSet(selectedSet)
    setQuestionAnswers(selectedSet.questions.map(question => ({
      question,
      audioBlob: null,
      audioUrl: null
    })))
    setCurrentQuestionIndex(0)
    setTestStarted(true)
    // Auto-play first question after test starts
    setTimeout(() => {
      speakQuestion(selectedSet.questions[0])
    }, 1000)
  }
  
  /**
   * Reset test to selection screen
   */
  const resetTest = () => {
    setTestStarted(false)
    setCurrentQuestionIndex(0)
    setResults(null)
    setIsRecording(false)
    setIsProcessing(false)
  }
  
  // =============================================================================
  // TEXT-TO-SPEECH FUNCTIONS
  // =============================================================================
  
  const speakQuestion = (questionText: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(questionText)
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
  // AUDIO RECORDING FUNCTIONS
  // =============================================================================
  
  /**
   * Start recording for current question
   */
  const startRecording = async () => {
    // Don't allow recording while TTS is playing
    if (!canRecord) {
      console.log('⏸️ Recording blocked - waiting for question to finish')
      return
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Update the current question's audio data
        setQuestionAnswers(prev => 
          prev.map((qa, index) => 
            index === currentQuestionIndex 
              ? { ...qa, audioBlob, audioUrl }
              : qa
          )
        )
        
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Error accessing microphone')
    }
  }

  /**
   * Stop recording for current question
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

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

  // =============================================================================
  // NAVIGATION FUNCTIONS
  // =============================================================================
  
  /**
   * Move to next question
   */
  const nextQuestion = () => {
    if (currentQuestionIndex < selectedQuestionSet.questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      // Auto-play next question
      setTimeout(() => {
        speakQuestion(selectedQuestionSet.questions[nextIndex])
      }, 500)
    }
  }

  /**
   * Move to previous question
   */
  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(prevIndex)
      // Auto-play previous question
      setTimeout(() => {
        speakQuestion(selectedQuestionSet.questions[prevIndex])
      }, 500)
    }
  }

  // =============================================================================
  // SUBMISSION FUNCTION
  // =============================================================================
  
  /**
   * Submit all answers for Part 3 analysis
   */
  const submitPart3Test = async () => {
    // Check if all questions have been answered
    const unansweredQuestions = questionAnswers.filter(qa => !qa.audioBlob)
    if (unansweredQuestions.length > 0) {
      alert(`Please answer all questions. ${unansweredQuestions.length} questions remaining.`)
      return
    }

    setIsProcessing(true)

    try {
      // Create FormData with all audio files and questions
      const formData = new FormData()
      
      // Add all audio files
      questionAnswers.forEach((qa, index) => {
        if (qa.audioBlob) {
          formData.append(`audio_${index}`, qa.audioBlob, `question_${index + 1}.webm`)
        }
      })
      
      // Add all questions and theme
      formData.append('questions', JSON.stringify(selectedQuestionSet.questions))
      formData.append('theme', selectedQuestionSet.theme)
      formData.append('testType', 'part3')

      const response = await fetch('http://localhost:3002/api/analyze-part3', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()
      setResults(data)

    } catch (error) {
      console.error('Error submitting Part 3 test:', error)
      alert('Error processing your answers. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  /**
   * Get current question data
   */
  const currentQuestion = questionAnswers[currentQuestionIndex]
  
  /**
   * Check if all questions are answered
   */
  const allQuestionsAnswered = questionAnswers.every(qa => qa.audioBlob !== null)
  
  /**
   * Get progress percentage
   */
  const progressPercentage = ((currentQuestionIndex + 1) / selectedQuestionSet.questions.length) * 100

  // =============================================================================
  // RENDER COMPONENT
  // =============================================================================
  
  return (
    <div className="container">
      <div className="card">
        
        {/* Theme Selection Phase */}
        {!testStarted && !results && (
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              IELTS Part 3 - Discussion Questions
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '18px' }}>
              Two-way Discussion (4-5 minutes)
            </p>
            
            <div style={{ 
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px'
            }}>
              <h3 style={{ color: '#15803d', marginBottom: '16px' }}>💭 Part 3 Guidelines</h3>
              <div style={{ textAlign: 'left', color: '#166534' }}>
                <p>✅ <strong>Extended responses</strong> - Give detailed, thoughtful answers</p>
                <p>✅ <strong>Abstract thinking</strong> - Discuss concepts, opinions, and ideas</p>
                <p>✅ <strong>Examples and justification</strong> - Support your opinions with reasons</p>
                <p>✅ <strong>Complex language</strong> - Use sophisticated vocabulary and grammar</p>
              </div>
            </div>
            
            <h3 style={{ marginBottom: '24px', color: '#374151' }}>Choose a Discussion Theme:</h3>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              {part3QuestionSets.map((set, index) => (
                <button
                  key={index}
                  onClick={() => startTest(index)}
                  style={{
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#8b5cf6'
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.15)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ 
                    fontSize: '32px', 
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    {index === 0 ? '💻' : index === 1 ? '💼' : index === 2 ? '🌱' : '🌍'}
                  </div>
                  <h4 style={{ 
                    margin: '0 0 12px 0', 
                    color: '#374151',
                    fontSize: '18px',
                    textAlign: 'center'
                  }}>
                    {set.theme}
                  </h4>
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '14px',
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    {set.questions.length} discussion questions
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question Drill Phase */}
        {testStarted && !results && (
          <div>
            {/* Header Section */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ 
                fontSize: '2rem', 
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Part 3: {selectedQuestionSet.theme}
              </h1>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Discussion Questions - Give extended, thoughtful responses
              </p>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  Question {currentQuestionIndex + 1} of {selectedQuestionSet.questions.length}
                </span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {Math.round(progressPercentage)}% Complete
                </span>
              </div>
              <div style={{ 
                background: '#e5e7eb', 
                borderRadius: '10px', 
                height: '8px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
                  height: '100%',
                  width: `${progressPercentage}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Question Display */}
            <div style={{ 
              background: '#faf5ff',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #e9d5ff'
            }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                color: '#374151',
                fontSize: '18px'
              }}>
                💭 Question {currentQuestionIndex + 1}:
              </h3>
              <p style={{ 
                fontSize: '16px', 
                lineHeight: '1.6',
                margin: 0,
                color: '#4b5563'
              }}>
                {currentQuestion.question}
              </p>
              <div style={{ 
                marginTop: '16px',
                padding: '12px',
                background: '#f3e8ff',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#7c3aed'
              }}>
                💡 Tip: Give a detailed response with examples, reasons, and personal opinions
              </div>
            </div>

            {/* TTS Controls */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
                <button onClick={() => speakQuestion(currentQuestion.question)} className="btn" style={{ background: '#10b981', color: 'white' }}>
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
                    background: recordingMode === 'toggle' ? '#8b5cf6' : 'transparent',
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
                    background: recordingMode === 'hold' ? '#8b5cf6' : 'transparent',
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

            {/* Audio Recording Section */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              
              {/* Recording Controls */}
              {!currentQuestion.audioBlob && !isRecording && (
                <div>
                  <button 
                    onClick={handleButtonClick}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="btn btn-primary"
                    disabled={!canRecord}
                    style={{ 
                      marginBottom: '16px',
                      minHeight: '60px',
                      minWidth: isMobile ? '200px' : '160px',
                      fontSize: '16px',
                      background: isTouchPressed 
                        ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                        : canRecord 
                          ? 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)'
                          : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      opacity: canRecord ? 1 : 0.6,
                      cursor: canRecord ? 'pointer' : 'not-allowed',
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
              )}

              {/* Recording in Progress */}
              {isRecording && (
                <div>
                  {recordingMode === 'toggle' && (
                    <button 
                      onClick={handleButtonClick}
                      className="btn btn-primary recording"
                      style={{ 
                        marginBottom: '16px',
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

            </div>

            {/* Navigation Controls */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px' 
            }}>
              <button 
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="btn"
                style={{ 
                  background: currentQuestionIndex === 0 ? '#e5e7eb' : '#6b7280',
                  color: currentQuestionIndex === 0 ? '#9ca3af' : 'white'
                }}
              >
                ← Previous Question
              </button>

              {currentQuestionIndex < selectedQuestionSet.questions.length - 1 ? (
                <button 
                  onClick={nextQuestion}
                  className="btn"
                  style={{ background: '#6b7280', color: 'white' }}
                >
                  Next Question →
                </button>
              ) : (
                <button 
                  onClick={submitPart3Test}
                  disabled={!allQuestionsAnswered || isProcessing}
                  className="btn btn-primary"
                  style={{ 
                    opacity: !allQuestionsAnswered || isProcessing ? 0.6 : 1,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)'
                  }}
                >
                  {isProcessing ? '🤖 Analyzing...' : '📤 Submit Part 3 Test'}
                </button>
              )}
            </div>

            {/* Question Overview */}
            <div style={{ 
              background: '#f3f4f6',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#374151' }}>
                📋 Question Overview
              </h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedQuestionSet.questions.map((question, index) => (
                  <div 
                    key={index}
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px',
                      borderRadius: '6px',
                      background: index === currentQuestionIndex ? '#e0e7ff' : 'transparent'
                    }}
                  >
                    <span style={{ 
                      fontSize: '16px',
                      color: questionAnswers[index].audioBlob ? '#059669' : '#6b7280'
                    }}>
                      {questionAnswers[index].audioBlob ? '✅' : '⭕'}
                    </span>
                    <span style={{ 
                      fontSize: '14px',
                      color: index === currentQuestionIndex ? '#4338ca' : '#6b7280',
                      fontWeight: index === currentQuestionIndex ? 'bold' : 'normal'
                    }}>
                      Q{index + 1}: {question.substring(0, 60)}...
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div>
            <ResultsDisplay
              transcript={results.transcript}
              score={results.score}
              fluency_coherence={results.fluency_coherence}
              lexical_resource={results.lexical_resource}
              grammatical_range={results.grammatical_range}
              pronunciation={results.pronunciation}
              overall_assessment={results.overall_assessment}
              testType="part3"
              individual_transcripts={results.individual_transcripts}
              questions={selectedQuestionSet.questions}
            />
            
            {/* Reset Button */}
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button 
                onClick={() => window.location.reload()}
                className="btn"
                style={{ 
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  padding: '12px 24px'
                }}
              >
                🔄 Try Another Theme
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}