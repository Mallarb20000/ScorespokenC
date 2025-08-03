'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { ResultsDisplay } from '../../components/ResultsDisplay'

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


function Part1ResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [results, setResults] = useState<Part1Results | null>(null)
  const [questions, setQuestions] = useState<string[]>([])

  useEffect(() => {
    // Get results from URL parameters
    const resultsParam = searchParams.get('data')
    const questionsParam = searchParams.get('questions')
    
    if (resultsParam) {
      try {
        const decodedResults = JSON.parse(decodeURIComponent(resultsParam))
        setResults(decodedResults)
      } catch (error) {
        console.error('Error parsing results:', error)
      }
    }
    
    if (questionsParam) {
      try {
        const decodedQuestions = JSON.parse(decodeURIComponent(questionsParam))
        setQuestions(decodedQuestions)
      } catch (error) {
        console.error('Error parsing questions:', error)
      }
    }

  }, [searchParams])

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

  if (!results) {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h1 style={{ color: '#6b7280', marginBottom: '16px' }}>No Results Found</h1>
            <p style={{ color: '#9ca3af', marginBottom: '32px' }}>
              It looks like you accessed this page directly. Please complete a Part 1 test first.
            </p>
            <button 
              onClick={() => router.push('/part1-drill')}
              className="btn btn-primary"
            >
              Take Part 1 Test
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        
        {/* Header Section with Progress Badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px',
          padding: '16px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '4px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold',
              margin: 0
            }}>
              IELTS Part 1 Assessment Results
            </h1>
            <p style={{ 
              color: '#6b7280', 
              margin: 0, 
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Personal Questions • 5 Questions Completed
            </p>
          </div>
          
          {/* Progress Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
          }}>
            ✓
          </div>
        </div>

        {/* Unified Results Display */}
        <ResultsDisplay
          transcript={results.transcript}
          score={results.score}
          mergedAudioUrl={results.merged_audio_url}
          fluency_coherence={results.fluency_coherence}
          lexical_resource={results.lexical_resource}
          grammatical_range={results.grammatical_range}
          pronunciation={results.pronunciation}
          overall_assessment={results.overall_assessment}
          testType="part1"
          individual_transcripts={results.individual_transcripts}
          questions={questions}
        />


        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'center',
          marginTop: '24px'
        }}>
          <button 
            onClick={() => router.push('/part1-drill')}
            className="btn"
            style={{ 
              background: '#6b7280', 
              color: 'white',
              padding: '8px 16px',
              fontSize: '14px'
            }}
          >
            Take Another Test
          </button>
          <button 
            onClick={() => router.push('/')}
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '14px'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Part1ResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Part1ResultsContent />
    </Suspense>
  )
}