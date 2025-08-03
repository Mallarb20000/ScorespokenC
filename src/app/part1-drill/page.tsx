/*
 * =============================================================================
 * IELTS PART 1 DRILL COMPONENT
 * =============================================================================
 * 
 * This component handles IELTS Speaking Part 1 - Personal Questions
 * 
 * PART 1 STRUCTURE:
 * - 5 questions about personal topics (work, study, hometown, hobbies, etc.)
 * - Each answer recorded individually (20-30 seconds each)
 * - All answers merged with 2-second beeps between them
 * - Comprehensive analysis of all responses together
 * 
 * DATA FLOW:
 * 1. Show question 1 → Record answer → Show question 2 → etc.
 * 2. Collect all 5 audio recordings
 * 3. Send all recordings + questions to backend
 * 4. Backend merges audio with beeps → Gemini analysis
 * 5. Display comprehensive Part 1 results
 * 
 * LEARNING OBJECTIVES:
 * - Multi-step form state management
 * - Array-based audio recording collection
 * - Sequential user interface flows
 * - Batch data processing and submission
 */

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * TypeScript interface for individual question-answer pairs
 */
interface QuestionAnswer {
  question: string
  audioBlob: Blob | null
  audioUrl: string | null
}

/**
 * TypeScript interface for IELTS Part 1 results
 */
interface Part1Results {
  transcript: string
  individual_transcripts?: Array<{
    question: string
    answer: string
  }>
  score: string
  merged_audio_url?: string
  individual_audio_urls?: string[]
  audio_note?: string
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
 * Reusable Criteria Card Component (same as quick-drill)
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
      {/* Gradient accent */}
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

export default function Part1DrillPage() {
  
  // =============================================================================
  // AUDIO PLAYBACK WITH BEEPS
  // =============================================================================
  
  /**
   * Play all audio files in sequence with 2-second beeps between them
   */
  const playSequentialAudio = async (audioUrls: string[]) => {
    // Create beep sound using Web Audio API
    const createBeep = (frequency: number, duration: number) => {
      return new Promise<void>((resolve) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + duration)
        
        setTimeout(() => resolve(), duration * 1000)
      })
    }
    
    // Play each audio file with beep in between
    for (let i = 0; i < audioUrls.length; i++) {
      // Play audio file
      const audio = new Audio(`http://localhost:3002${audioUrls[i]}`)
      
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve()
        audio.onerror = () => resolve() // Continue even if one fails
        audio.play()
      })
      
      // Play beep between files (except after last file)
      if (i < audioUrls.length - 1) {
        await createBeep(800, 2) // 800Hz beep for 2 seconds
      }
    }
  }
  
  // =============================================================================
  // PART 1 QUESTION SET
  // =============================================================================
  
  /**
   * Typical IELTS Part 1 questions covering personal topics
   * In a real app, these would come from a question bank/database
   */
  const part1Questions = [
    "Let's talk about your hometown. Where are you from?",
    "Do you work or are you a student?", 
    "What do you like to do in your free time?",
    "How often do you use social media?",
    "What kind of weather do you prefer and why?"
  ]

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================
  
  /**
   * Current question index (0-4 for 5 questions)
   */
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  
  /**
   * Array to store all question-answer pairs
   */
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswer[]>(
    part1Questions.map(question => ({
      question,
      audioBlob: null,
      audioUrl: null
    }))
  )
  
  /**
   * Recording state for current question
   */
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<Part1Results | null>(null)
  const [autoSubmit, setAutoSubmit] = useState<boolean>(true) // Auto-submit toggle
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false) // TTS is playing
  const [canRecord, setCanRecord] = useState<boolean>(true) // Recording allowed after TTS
  const [isTouchPressed, setIsTouchPressed] = useState<boolean>(false) // Track touch & hold state
  const [mobileRecordingMode, setMobileRecordingMode] = useState<'toggle' | 'hold'>('toggle') // Mobile recording mode
  
  /**
   * Recording mode - simplified to push-to-talk only
   */
  // const [showNoiseTest, setShowNoiseTest] = useState(true)
  // const [isTestingNoise, setIsTestingNoise] = useState(false)
  // const [noiseLevel, setNoiseLevel] = useState<'low' | 'medium' | 'high' | null>(null)
  const [recordingMode] = useState<'push'>('push') // Fixed to push-to-talk only
  // const [noiseTestComplete, setNoiseTestComplete] = useState(false)
  
  /**
   * Refs for MediaRecorder management
   */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null) // TTS instance
  
  /**
   * Push-to-talk state (voice activation features commented out)
   */
  // const [isListening, setIsListening] = useState(false)
  // const [voiceDetected, setVoiceDetected] = useState(false)
  // const [silenceTimeout, setSilenceTimeout] = useState<NodeJS.Timeout | null>(null)
  const [spacebarPressed, setSpacebarPressed] = useState(false)
  // const [voiceListeningInitialized, setVoiceListeningInitialized] = useState(false)
  // const [voiceActivationTimeout, setVoiceActivationTimeout] = useState<NodeJS.Timeout | null>(null)
  
  /**
   * Audio analysis refs for voice detection
   */
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  
  // =============================================================================
  // NOISE DETECTION FUNCTIONS (COMMENTED OUT - VOICE ACTIVATION DISABLED)
  // =============================================================================
  
  /*
  const testAmbientNoise = async () => {
    setIsTestingNoise(true)
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      
      microphone.connect(analyser)
      analyser.fftSize = 256
      
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      // Sample noise for 5 seconds
      const samples: number[] = []
      const sampleDuration = 5000 // 5 seconds
      const sampleInterval = 100 // Sample every 100ms
      
      const startTime = Date.now()
      
      const sampleNoise = () => {
        analyser.getByteFrequencyData(dataArray)
        
        // Calculate RMS (Root Mean Square) for volume level
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / bufferLength)
        samples.push(rms)
        
        if (Date.now() - startTime < sampleDuration) {
          setTimeout(sampleNoise, sampleInterval)
        } else {
          // Analysis complete
          analyzeNoiseSamples(samples)
          
          // Clean up
          stream.getTracks().forEach(track => track.stop())
          audioContext.close()
        }
      }
      
      sampleNoise()
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      // Fallback to manual mode selection
      handleNoiseTestError()
    }
  }
  
  const analyzeNoiseSamples = (samples: number[]) => {
    const avgNoise = samples.reduce((a, b) => a + b, 0) / samples.length
    const maxNoise = Math.max(...samples)
    const minNoise = Math.min(...samples)
    const noiseVariation = maxNoise - minNoise
    
    console.log('Noise Analysis:', { avgNoise, maxNoise, minNoise, noiseVariation })
    
    let detectedLevel: 'low' | 'medium' | 'high'
    let recommendedMode: 'voice' | 'push'
    
    // Classify noise level and recommend mode
    if (avgNoise < 15 && noiseVariation < 20) {
      detectedLevel = 'low'
      recommendedMode = 'voice'
    } else if (avgNoise < 30 && noiseVariation < 40) {
      detectedLevel = 'medium'
      recommendedMode = 'voice' // Still try voice mode but with warning
    } else {
      detectedLevel = 'high'
      recommendedMode = 'push' // Recommend push-to-talk for noisy environments
    }
    
    setNoiseLevel(detectedLevel)
    setRecordingMode(recommendedMode)
    setIsTestingNoise(false)
    setNoiseTestComplete(true)
  }
  
  const handleNoiseTestError = () => {
    setIsTestingNoise(false)
    setNoiseTestComplete(true)
    setNoiseLevel('medium')
    setRecordingMode('push') // Default to more reliable mode
  }
  
  const skipNoiseTest = () => {
    setShowNoiseTest(false)
    setNoiseTestComplete(true)
    setNoiseLevel('medium')
    setRecordingMode('voice') // Default choice
  }
  */

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
      
      // Fallback timeout in case TTS events don't fire
      setTimeout(() => {
        if (isSpeaking) {
          setIsSpeaking(false)
          setCanRecord(true)
        }
      }, 10000) // 10 second fallback
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
    
    if (mobileRecordingMode === 'hold') {
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
    if (mobileRecordingMode === 'hold' && isTouchPressed && isRecording) {
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
    
    if (mobileRecordingMode === 'toggle') {
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
  const startRecording = useCallback(async () => {
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
        
        // Auto-advance and auto-submit logic
        if (autoSubmit) {
          if (currentQuestionIndex === part1Questions.length - 1) {
            // Last question completed - auto-submit after delay
            setTimeout(async () => {
              console.log('🚀 Auto-submitting Part 1 test...')
              
              // Check if all questions have been answered
              const allAnswered = questionAnswers.every((qa, index) => 
                index <= currentQuestionIndex ? true : qa.audioBlob
              )
              
              if (allAnswered) {
                setIsProcessing(true)
                
                try {
                  // Create FormData with all audio files and questions
                  const formData = new FormData()
                  
                  // Add all audio files
                  questionAnswers.forEach((qa, index) => {
                    if (qa.audioBlob || index === currentQuestionIndex) {
                      const blob = index === currentQuestionIndex ? audioBlob : qa.audioBlob
                      if (blob) {
                        formData.append(`audio_${index}`, blob, `question_${index + 1}.webm`)
                      }
                    }
                  })
                  
                  // Add all questions as a JSON string
                  formData.append('questions', JSON.stringify(part1Questions))
                  formData.append('testType', 'part1')

                  const response = await fetch('http://localhost:3002/api/analyze-part1', {
                    method: 'POST',
                    body: formData,
                  })

                  if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`)
                  }

                  const data = await response.json()
                  
                  // Redirect to results page with data
                  const resultsData = encodeURIComponent(JSON.stringify(data))
                  const questionsData = encodeURIComponent(JSON.stringify(part1Questions))
                  
                  window.location.href = `/part1-results?data=${resultsData}&questions=${questionsData}`

                } catch (error) {
                  console.error('Error submitting Part 1 test:', error)
                  alert('Error processing your answers. Please try again.')
                } finally {
                  setIsProcessing(false)
                }
              }
            }, 2000) // 2 second delay
          } else {
            // Auto-advance to next question after recording
            setTimeout(() => {
              setCurrentQuestionIndex(prev => prev + 1)
            }, 1000) // 1 second delay
          }
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Error accessing microphone')
    }
  }, [currentQuestionIndex, autoSubmit, part1Questions.length])

  // =============================================================================
  // SUBMISSION FUNCTION
  // =============================================================================
  
  /**
   * Submit all answers for Part 1 analysis
   */
  const submitPart1Test = useCallback(async () => {
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
      
      // Add all questions as a JSON string
      formData.append('questions', JSON.stringify(part1Questions))
      formData.append('testType', 'part1')

      const response = await fetch('http://localhost:3002/api/analyze-part1', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()
      
      // Redirect to results page with data
      const resultsData = encodeURIComponent(JSON.stringify(data))
      const questionsData = encodeURIComponent(JSON.stringify(part1Questions))
      
      window.location.href = `/part1-results?data=${resultsData}&questions=${questionsData}`

    } catch (error) {
      console.error('Error submitting Part 1 test:', error)
      alert('Error processing your answers. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }, [questionAnswers, part1Questions])

  /**
   * Stop recording for current question
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  // Forward reference for startVoiceListening to avoid circular dependency
  const startVoiceListeningRef = useRef<(() => Promise<void>) | null>(null)

  // =============================================================================
  // VOICE DETECTION FUNCTIONS (COMMENTED OUT - VOICE ACTIVATION DISABLED)
  // =============================================================================
  
  /*
  const startVoiceListening = useCallback(async () => {
    console.log('🎤 startVoiceListening called', { recordingMode, isListening })
    
    if (recordingMode !== 'voice') {
      console.log('❌ Not in voice mode, skipping')
      return
    }
    if (isListening) {
      console.log('❌ Already listening, skipping')
      return
    }
    
    try {
      console.log('🎤 Starting voice detection...')
      
      // Clean up any existing resources first
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume audio context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      
      microphone.connect(analyser)
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.3
      
      // Store refs for cleanup
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      microphoneRef.current = microphone
      
      setIsListening(true)
      setVoiceListeningInitialized(true)
      
      console.log('🎤 Voice detection started successfully')
      
      // Start voice detection loop
      detectVoice(stream)
      
    } catch (error) {
      console.error('Error starting voice detection:', error)
      setVoiceListeningInitialized(false)
      setIsListening(false)
      alert('Error accessing microphone for voice detection. Please check your microphone permissions.')
    }
  }, [recordingMode, isListening])

  // Update the ref when the function changes
  useEffect(() => {
    startVoiceListeningRef.current = startVoiceListening
  }, [startVoiceListening])
  
  const detectVoice = (stream: MediaStream) => {
    if (!analyserRef.current) return
    
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    let animationFrameId: number | null = null
    let lastVoiceTime = 0
    
    const checkVoice = () => {
      // Check if we should continue
      if (!analyserRef.current || !isListening) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
        }
        return
      }
      
      try {
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Calculate RMS (Root Mean Square) for better voice detection
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / bufferLength)
        
        // Adaptive threshold based on detected noise level
        let voiceThreshold = 20
        if (noiseLevel === 'high') voiceThreshold = 40
        else if (noiseLevel === 'medium') voiceThreshold = 30
        
        const currentTime = Date.now()
        
        if (rms > voiceThreshold) {
          // Voice detected
          lastVoiceTime = currentTime
          
          if (!voiceDetected && !isRecording && !voiceActivationTimeout) {
            // Add debouncing - only start if voice is consistently detected
            const timeout = setTimeout(() => {
              if (!isRecording && !voiceDetected) {
                console.log('🗣️ Voice detected, starting recording...', { rms, threshold: voiceThreshold })
                setVoiceDetected(true)
                startRecording()
              }
              setVoiceActivationTimeout(null)
            }, 300) // 300ms debounce
            
            setVoiceActivationTimeout(timeout)
          }
          
          // Clear silence timeout
          if (silenceTimeout) {
            clearTimeout(silenceTimeout)
            setSilenceTimeout(null)
          }
          
        } else {
          // No voice detected - clear activation timeout if it exists
          if (voiceActivationTimeout) {
            clearTimeout(voiceActivationTimeout)
            setVoiceActivationTimeout(null)
          }
          
          if (voiceDetected && isRecording && currentTime - lastVoiceTime > 2000) {
            // Silence detected for more than 2 seconds during recording
            if (!silenceTimeout) {
              const timeout = setTimeout(() => {
                console.log('🔇 Silence detected, stopping recording...')
                stopRecording()
                setVoiceDetected(false)
                setSilenceTimeout(null)
              }, 1500) // 1.5 seconds of silence to stop
              
              setSilenceTimeout(timeout)
            }
          }
        }
        
      } catch (error) {
        console.error('Voice detection error:', error)
      }
      
      // Continue the loop with throttled frequency for better performance
      animationFrameId = requestAnimationFrame(checkVoice)
    }
    
    // Start the detection loop
    animationFrameId = requestAnimationFrame(checkVoice)
    
    // Cleanup function
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }
  
  const stopVoiceListening = useCallback(() => {
    setIsListening(false)
    setVoiceDetected(false)
    setVoiceListeningInitialized(false)
    
    // Clear all timeouts
    if (silenceTimeout) {
      clearTimeout(silenceTimeout)
      setSilenceTimeout(null)
    }
    
    if (voiceActivationTimeout) {
      clearTimeout(voiceActivationTimeout)
      setVoiceActivationTimeout(null)
    }
    
    // Clean up audio context
    if (microphoneRef.current) {
      microphoneRef.current.disconnect()
      microphoneRef.current = null
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    analyserRef.current = null
  }, [silenceTimeout, voiceActivationTimeout])
  
  const initializeRecordingMode = useCallback(() => {
    if (recordingMode === 'voice') {
      startVoiceListening()
    } else {
      stopVoiceListening()
    }
  }, [recordingMode, startVoiceListening, stopVoiceListening])
  */

  // =============================================================================
  // KEYBOARD EVENT HANDLING (Push-to-Talk)
  // =============================================================================
  
  useEffect(() => {
    if (recordingMode !== 'push') return
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !spacebarPressed && !isRecording && canRecord) {
        event.preventDefault()
        setSpacebarPressed(true)
        startRecording()
      }
    }
    
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && spacebarPressed && isRecording) {
        event.preventDefault()
        setSpacebarPressed(false)
        stopRecording()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [recordingMode, spacebarPressed, isRecording, canRecord, startRecording, stopRecording])
  
  // Auto-play question when component loads or question changes
  useEffect(() => {
    speakQuestion(part1Questions[currentQuestionIndex])
  }, [currentQuestionIndex])
  
  // Keyboard event handling for push-to-talk (no voice mode initialization needed)

  // =============================================================================
  // NAVIGATION FUNCTIONS
  // =============================================================================
  
  /**
   * Move to next question
   */
  const nextQuestion = () => {
    if (currentQuestionIndex < part1Questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      // Auto-play next question
      setTimeout(() => {
        speakQuestion(part1Questions[nextIndex])
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
        speakQuestion(part1Questions[prevIndex])
      }, 500)
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
  const progressPercentage = ((currentQuestionIndex + 1) / part1Questions.length) * 100

  // =============================================================================
  // RENDER COMPONENT
  // =============================================================================
  
  return (
    <div className="container">
      <div className="card">
        
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            IELTS Part 1 - Personal Questions
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Answer questions about yourself and your experiences (4-5 minutes)
          </p>
        </div>


        {/* Main Test Interface */}
        {/* Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Question {currentQuestionIndex + 1} of {part1Questions.length}
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              height: '100%',
              width: `${progressPercentage}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

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
            📝 Question {currentQuestionIndex + 1}:
          </h3>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.6',
            margin: 0,
            color: '#4b5563'
          }}>
            {currentQuestion.question}
          </p>
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

        {/* Auto-submit Toggle */}
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
              onChange={(e) => setAutoSubmit(e.target.checked)}
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
              ? 'Questions will advance automatically after recording. Test submits when all 5 questions are answered.' 
              : 'Use navigation buttons to move between questions. Submit manually when ready.'
            }
          </div>
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
              onClick={() => setMobileRecordingMode('toggle')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: mobileRecordingMode === 'toggle' ? '#667eea' : 'transparent',
                color: mobileRecordingMode === 'toggle' ? 'white' : '#6b7280',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: mobileRecordingMode === 'toggle' ? 'bold' : 'normal'
              }}
            >
              📱 Tap Mode
            </button>
            <button
              onClick={() => setMobileRecordingMode('hold')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: mobileRecordingMode === 'hold' ? '#667eea' : 'transparent',
                color: mobileRecordingMode === 'hold' ? 'white' : '#6b7280',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: mobileRecordingMode === 'hold' ? 'bold' : 'normal'
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
                  opacity: canRecord ? 1 : 0.5,
                  cursor: canRecord ? 'pointer' : 'not-allowed',
                  minHeight: '60px',
                  minWidth: isMobile ? '200px' : '160px',
                  fontSize: '16px',
                  background: isTouchPressed 
                    ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                    : canRecord 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  transform: isTouchPressed ? 'scale(0.95)' : 'scale(1)',
                  transition: 'all 0.1s ease',
                  marginBottom: '16px'
                }}
              >
                {mobileRecordingMode === 'toggle' 
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
                ) : mobileRecordingMode === 'toggle' ? (
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
              {mobileRecordingMode === 'toggle' && (
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
                  spacebarPressed ? '(Release spacebar to stop)' :
                  isTouchPressed ? '(Release button to stop)' :
                  mobileRecordingMode === 'toggle' ? '(Click stop button)' :
                  '(Release hold button)'
                }
              </div>
            </div>
          )}

          {/* Re-record Option - Only show when answer is recorded */}
          {currentQuestion.audioUrl && (
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
                onClick={() => setQuestionAnswers(prev => 
                  prev.map((qa, index) => 
                    index === currentQuestionIndex 
                      ? { ...qa, audioBlob: null, audioUrl: null }
                      : qa
                  )
                )}
                className="btn"
                style={{ background: '#6b7280', color: 'white' }}
              >
                🔄 Re-record Answer
              </button>
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
          {/* Back to Home Button */}
          <button 
            onClick={() => window.location.href = '/'}
            className="btn"
            style={{ 
              background: '#dc2626',
              color: 'white',
              fontSize: '14px'
            }}
          >
            🏠 Back to Home
          </button>
          
          {/* Question Navigation */}
          <div style={{ display: 'flex', gap: '12px' }}>
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

          {/* Navigation Controls */}
          {currentQuestionIndex < part1Questions.length - 1 ? (
            <button 
              onClick={nextQuestion}
              disabled={!currentQuestion.audioBlob}
              className="btn"
              style={{ 
                background: !currentQuestion.audioBlob ? '#e5e7eb' : '#6b7280',
                color: !currentQuestion.audioBlob ? '#9ca3af' : 'white'
              }}
            >
              Next Question →
            </button>
          ) : (
            <button 
              onClick={submitPart1Test}
              disabled={!allQuestionsAnswered || isProcessing}
              className="btn btn-primary"
              style={{ 
                opacity: !allQuestionsAnswered || isProcessing ? 0.6 : 1
              }}
            >
              {isProcessing ? '🤖 Analyzing...' : autoSubmit ? '🔄 Resubmit Test' : '📤 Submit Part 1 Test'}
            </button>
          )}
          </div>
        </div>

      </div>
    </div>
  )
}