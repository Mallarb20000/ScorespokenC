/*
 * =============================================================================
 * IELTS PART 2 DRILL COMPONENT - CUE CARD TASK
 * =============================================================================
 * 
 * This component handles IELTS Speaking Part 2 - Individual Long Turn
 * 
 * PART 2 STRUCTURE:
 * - Display cue card with topic and bullet points
 * - 1 minute preparation time (can make notes)
 * - 2 minutes speaking time (sustained monologue)
 * - AI analysis focused on sustained speech and topic development
 * 
 * TIMER IMPLEMENTATION:
 * - useEffect with setInterval for countdown
 * - Visual progress indicators
 * - Automatic transitions between phases
 * - Audio recording only during speaking phase
 * 
 * LEARNING OBJECTIVES:
 * - Timer implementation with React hooks
 * - Multi-phase user interface (prep → speak → results)
 * - Sustained audio recording with time limits
 * - Different AI prompting for longer speech analysis
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { ResultsDisplay } from '../../components/ResultsDisplay'

/**
 * Cue card topics - typical IELTS Part 2 subjects
 */
const cueCards = [
  {
    topic: "Describe a person who has influenced you",
    points: [
      "who this person is",
      "how you know them", 
      "what influence they have had on you",
      "and explain why this person is important to you"
    ]
  },
  {
    topic: "Describe a place you would like to visit", 
    points: [
      "where this place is",
      "what you would do there",
      "who you would go with",
      "and explain why you want to visit this place"
    ]
  },
  {
    topic: "Describe a skill you would like to learn",
    points: [
      "what the skill is",
      "where you would learn it",
      "how long it would take to learn",
      "and explain why you want to learn this skill"
    ]
  },
  {
    topic: "Describe a memorable event from your childhood",
    points: [
      "what the event was",
      "when and where it happened", 
      "who was involved",
      "and explain why this event was memorable"
    ]
  },
  {
    topic: "Describe a book or movie that made an impression on you",
    points: [
      "what the book/movie was about",
      "when you read/watched it",
      "what you liked about it",
      "and explain why it made an impression on you"
    ]
  }
]

/**
 * Test phases enum for clear state management
 */
type TestPhase = 'setup' | 'preparation' | 'speaking' | 'processing' | 'results'

/**
 * Part 2 results interface
 */
interface Part2Results {
  transcript: string
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


export default function Part2DrillPage() {
  
  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================
  
  /**
   * Current test phase
   */
  const [currentPhase, setCurrentPhase] = useState<TestPhase>('setup')
  
  /**
   * Selected cue card (randomly chosen or user selected)
   */
  const [selectedCueCard, setSelectedCueCard] = useState(cueCards[0])
  
  /**
   * Timer states
   */
  const [preparationTime, setPreparationTime] = useState(60) // 1 minute prep
  const [speakingTime, setSpeakingTime] = useState(120)     // 2 minutes speaking
  
  /**
   * Audio recording states
   */
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [results, setResults] = useState<Part2Results | null>(null)
  
  /**
   * MediaRecorder refs
   */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  // =============================================================================
  // TIMER EFFECTS
  // =============================================================================
  
  /**
   * Preparation timer effect
   */
  useEffect(() => {
    if (currentPhase === 'preparation' && preparationTime > 0) {
      timerRef.current = setTimeout(() => {
        setPreparationTime(prev => prev - 1)
      }, 1000)
    } else if (currentPhase === 'preparation' && preparationTime === 0) {
      // Preparation time ended, start speaking phase
      setCurrentPhase('speaking')
      startRecording()
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentPhase, preparationTime])
  
  /**
   * Speaking timer effect
   */
  useEffect(() => {
    if (currentPhase === 'speaking' && speakingTime > 0) {
      timerRef.current = setTimeout(() => {
        setSpeakingTime(prev => prev - 1)
      }, 1000)
    } else if (currentPhase === 'speaking' && speakingTime === 0) {
      // Speaking time ended, stop recording
      stopRecording()
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentPhase, speakingTime])
  
  // =============================================================================
  // PHASE CONTROL FUNCTIONS
  // =============================================================================
  
  /**
   * Start the Part 2 test (move to preparation phase)
   */
  const startTest = () => {
    // Randomly select a cue card
    const randomCard = cueCards[Math.floor(Math.random() * cueCards.length)]
    setSelectedCueCard(randomCard)
    
    // Reset timers
    setPreparationTime(60)
    setSpeakingTime(120)
    
    // Move to preparation phase
    setCurrentPhase('preparation')
  }
  
  /**
   * Reset test to start over
   */
  const resetTest = () => {
    setCurrentPhase('setup')
    setAudioBlob(null)
    setAudioUrl(null)
    setResults(null)
    setPreparationTime(60)
    setSpeakingTime(120)
  }
  
  // =============================================================================
  // AUDIO RECORDING FUNCTIONS
  // =============================================================================
  
  /**
   * Start recording (automatically called when speaking phase begins)
   */
  const startRecording = async () => {
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
        setAudioBlob(audioBlob)
        setAudioUrl(audioUrl)
        stream.getTracks().forEach(track => track.stop())
        
        // Move to processing phase
        setCurrentPhase('processing')
        submitPart2Test(audioBlob)
      }

      mediaRecorder.start()
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Error accessing microphone')
    }
  }

  /**
   * Stop recording (automatically called when time runs out)
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
  }
  
  // =============================================================================
  // SUBMISSION FUNCTION
  // =============================================================================
  
  /**
   * Submit Part 2 response for analysis
   */
  const submitPart2Test = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'part2_response.webm')
      formData.append('topic', selectedCueCard.topic)
      formData.append('points', JSON.stringify(selectedCueCard.points))
      formData.append('testType', 'part2')

      const response = await fetch('http://localhost:3002/api/analyze-part2', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()
      console.log('Part 2 Results received:', data)
      console.log('Criteria check:', {
        fluency_coherence: data.fluency_coherence,
        lexical_resource: data.lexical_resource,
        grammatical_range: data.grammatical_range,
        pronunciation: data.pronunciation
      })
      setResults(data)
      setCurrentPhase('results')

    } catch (error) {
      console.error('Error submitting Part 2 test:', error)
      alert('Error processing your response. Please try again.')
      setCurrentPhase('setup')
    }
  }
  
  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
  
  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  /**
   * Get progress percentage for timers
   */
  const getPreparationProgress = () => ((60 - preparationTime) / 60) * 100
  const getSpeakingProgress = () => ((120 - speakingTime) / 120) * 100
  
  // =============================================================================
  // RENDER FUNCTIONS BY PHASE
  // =============================================================================
  
  /**
   * Setup Phase - Choose cue card and start
   */
  const renderSetupPhase = () => (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ 
        fontSize: '2.5rem', 
        marginBottom: '16px',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        IELTS Part 2 - Cue Card Task
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '18px' }}>
        Individual Long Turn (3-4 minutes total)
      </p>
      
      <div style={{ 
        background: '#fef3f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <h3 style={{ color: '#dc2626', marginBottom: '16px' }}>📋 Part 2 Instructions</h3>
        <div style={{ textAlign: 'left', color: '#7f1d1d' }}>
          <p>✅ <strong>1 minute</strong> to prepare (you can make notes)</p>
          <p>✅ <strong>2 minutes</strong> to speak about the topic</p>
          <p>✅ Cover all the points on the cue card</p>
          <p>✅ Speak continuously - don't stop early</p>
        </div>
      </div>
      
      <button 
        onClick={startTest}
        className="btn btn-primary"
        style={{ 
          fontSize: '18px',
          padding: '16px 32px',
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        }}
      >
        🎯 Start Part 2 Test
      </button>
    </div>
  )
  
  /**
   * Preparation Phase - Show cue card and countdown
   */
  const renderPreparationPhase = () => (
    <div>
      {/* Timer Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ 
          color: '#f59e0b',
          fontSize: '2rem',
          marginBottom: '8px'
        }}>
          ⏱️ Preparation Time
        </h2>
        <div style={{ 
          fontSize: '3rem',
          fontWeight: 'bold',
          color: preparationTime <= 10 ? '#dc2626' : '#f59e0b',
          marginBottom: '16px'
        }}>
          {formatTime(preparationTime)}
        </div>
        
        {/* Progress Bar */}
        <div style={{ 
          background: '#fed7aa',
          borderRadius: '10px',
          height: '12px',
          overflow: 'hidden',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            height: '100%',
            width: `${getPreparationProgress()}%`,
            transition: 'width 1s ease'
          }} />
        </div>
      </div>
      
      {/* Cue Card */}
      <div style={{ 
        background: 'white',
        border: '3px solid #f59e0b',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 10px 25px rgba(245, 158, 11, 0.2)'
      }}>
        <div style={{ 
          background: '#f59e0b',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '18px'
        }}>
          📝 CUE CARD
        </div>
        
        <h3 style={{ 
          color: '#92400e',
          fontSize: '20px',
          marginBottom: '24px',
          lineHeight: '1.4'
        }}>
          {selectedCueCard.topic}
        </h3>
        
        <div style={{ color: '#78350f' }}>
          <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>You should say:</p>
          <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
            {selectedCueCard.points.map((point, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div style={{ 
        textAlign: 'center',
        marginTop: '24px',
        color: '#78350f',
        fontStyle: 'italic'
      }}>
        💡 Use this time to think about your answer and make notes
      </div>
    </div>
  )
  
  /**
   * Speaking Phase - Show timer and recording indicator with cue card toggle
   */
  const [showCueCardDuringSpeaking, setShowCueCardDuringSpeaking] = useState(false)
  
  const renderSpeakingPhase = () => (
    <div style={{ textAlign: 'center' }}>
      {/* Timer Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          color: '#dc2626',
          fontSize: '2rem',
          marginBottom: '8px'
        }}>
          🎤 Speaking Time
        </h2>
        <div style={{ 
          fontSize: '3rem',
          fontWeight: 'bold',
          color: speakingTime <= 30 ? '#dc2626' : '#f59e0b',
          marginBottom: '16px'
        }}>
          {formatTime(speakingTime)}
        </div>
        
        {/* Progress Bar */}
        <div style={{ 
          background: '#fecaca',
          borderRadius: '10px',
          height: '12px',
          overflow: 'hidden',
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            height: '100%',
            width: `${getSpeakingProgress()}%`,
            transition: 'width 1s ease'
          }} />
        </div>
      </div>
      
      {/* Recording Indicator */}
      <div style={{ 
        background: '#fef2f2',
        border: '2px solid #dc2626',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        margin: '0 auto',
        marginBottom: '32px'
      }}>
        <div style={{ 
          fontSize: '48px',
          marginBottom: '16px',
          animation: 'pulse 1.5s infinite'
        }}>
          🔴
        </div>
        <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>Recording in Progress</h3>
        <p style={{ color: '#7f1d1d', margin: '0 0 16px 0' }}>
          Speak continuously about the topic. Cover all the points from the cue card.
        </p>
        
        {/* Early End Button */}
        <button
          onClick={() => {
            if (mediaRecorderRef.current) {
              mediaRecorderRef.current.stop()
            }
          }}
          className="btn"
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            color: 'white',
            padding: '8px 16px',
            fontSize: '14px'
          }}
        >
          ⏹️ End Recording Early
        </button>
      </div>
      
      {/* Cue Card Reference with Toggle */}
      <div style={{ 
        background: '#f3f4f6',
        borderRadius: '12px',
        padding: '20px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h4 style={{ color: '#374151', margin: 0 }}>📝 Your Topic:</h4>
          <button
            onClick={() => setShowCueCardDuringSpeaking(!showCueCardDuringSpeaking)}
            style={{
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {showCueCardDuringSpeaking ? '🔼 Hide Cue Card' : '🔽 Show Cue Card'}
          </button>
        </div>
        <p style={{ color: '#6b7280', fontWeight: 'bold', margin: 0 }}>{selectedCueCard.topic}</p>
        
        {showCueCardDuringSpeaking && (
          <div style={{ 
            marginTop: '16px',
            background: 'white',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ 
              background: '#f59e0b',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              📝 CUE CARD POINTS
            </div>
            
            <div style={{ color: '#78350f' }}>
              <p style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' }}>You should say:</p>
              <ul style={{ paddingLeft: '16px', lineHeight: '1.6', fontSize: '14px' }}>
                {selectedCueCard.points.map((point, index) => (
                  <li key={index} style={{ marginBottom: '6px' }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
  
  /**
   * Processing Phase - Show loading
   */
  const renderProcessingPhase = () => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🤖</div>
        <h2 style={{ color: '#6366f1', marginBottom: '16px' }}>Analyzing Your Response</h2>
        <p style={{ color: '#6b7280' }}>Our AI is evaluating your Part 2 performance...</p>
      </div>
      
      <div style={{ 
        background: '#eef2ff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        <div style={{ 
          width: '40px',
          height: '40px',
          border: '4px solid #c7d2fe',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: '#4338ca', margin: 0 }}>This may take a few moments...</p>
      </div>
    </div>
  )
  
  // =============================================================================
  // MAIN RENDER
  // =============================================================================
  
  return (
    <div className="container">
      <div className="card">
        
        {/* Phase-based rendering */}
        {currentPhase === 'setup' && renderSetupPhase()}
        {currentPhase === 'preparation' && renderPreparationPhase()}
        {currentPhase === 'speaking' && renderSpeakingPhase()}
        {currentPhase === 'processing' && renderProcessingPhase()}
        
        {/* Results Phase */}
        {currentPhase === 'results' && results && (
          <div>
            <ResultsDisplay
              transcript={results.transcript}
              score={results.score}
              audioUrl={audioUrl || undefined}
              fluency_coherence={results.fluency_coherence}
              lexical_resource={results.lexical_resource}
              grammatical_range={results.grammatical_range}
              pronunciation={results.pronunciation}
              overall_assessment={results.overall_assessment}
              testType="part2"
            />
            
            {/* Reset Button */}
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <button 
                onClick={() => {
                  setCurrentPhase('setup')
                  setResults(null)
                  setAudioBlob(null)
                  setAudioUrl(null)
                  setPreparationTime(60)
                  setSpeakingTime(120)
                }}
                className="btn"
                style={{ 
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  padding: '12px 24px'
                }}
              >
                🔄 Try Another Cue Card
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}