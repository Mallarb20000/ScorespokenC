/**
 * =============================================================================
 * UNIFIED RESULTS COMPONENT
 * =============================================================================
 * 
 * Single component that handles all IELTS test results with audio playback
 * Replaces duplicated results logic across all test result pages
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CriteriaCard } from '../CriteriaCard'
import { audioPlayer } from '../../lib/services/AudioService'
import { TestResults, TestType } from '../../lib/types'
import { cleanupAllResources } from '../../lib/utils/globalCleanup'

export interface UnifiedResultsProps {
  testType: TestType
  testTitle: string
  backRoute?: string
  homeRoute?: string
}

export const UnifiedResults: React.FC<UnifiedResultsProps> = ({
  testType,
  testTitle,
  backRoute = '/',
  homeRoute = '/'
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // State management
  const [results, setResults] = useState<TestResults | null>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cleanup on component unmount - use centralized cleanup
  useEffect(() => {
    return () => {
      cleanupAllResources()
      setIsPlayingAudio(false)
    }
  }, [])

  // Extract data from URL parameters
  useEffect(() => {
    try {
      const resultsParam = searchParams.get('data')
      const questionsParam = searchParams.get('questions')
      
      if (resultsParam) {
        const decodedResults = JSON.parse(decodeURIComponent(resultsParam))
        setResults(decodedResults)
      } else {
        setError('No results data found')
      }
      
      if (questionsParam) {
        const decodedQuestions = JSON.parse(decodeURIComponent(questionsParam))
        setQuestions(decodedQuestions)
      }
      
    } catch (error) {
      console.error('Error parsing results:', error)
      setError('Failed to load results data')
    }
  }, [searchParams])

  // Audio playback handler
  const handlePlayAudio = async () => {
    if (!results || isPlayingAudio) return

    try {
      // Stop any currently playing audio first
      audioPlayer.stopAll()
      setIsPlayingAudio(true)

      if (results.individual_audio_urls && results.individual_audio_urls.length > 1) {
        // Multi-part test: play sequential audio with beeps
        await audioPlayer.playSequentialAudio(results.individual_audio_urls)
      } else if (results.merged_audio_url) {
        // Single merged audio file
        await audioPlayer.playAudio(`http://localhost:3002${results.merged_audio_url}`)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    } finally {
      setIsPlayingAudio(false)
    }
  }

  // Navigation handlers
  const handleRetakeTest = () => {
    router.push(backRoute)
  }

  const handleGoHome = () => {
    router.push(homeRoute)
  }

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Error Loading Results</h2>
          <p style={{ color: '#6b7280', marginBottom: '32px' }}>{error}</p>
          <button
            onClick={handleGoHome}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (!results) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2>Loading Results...</h2>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '4px', margin: 0 }}>
            🎉 {testTitle} Complete!
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.9, margin: 0 }}>
            Your detailed IELTS assessment
          </p>
        </div>

        {/* Main Results Container */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px'
        }}>
          
          {/* Overall Score */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              padding: '16px',
              display: 'inline-block',
              minWidth: '160px'
            }}>
              <div style={{ fontSize: '12px', opacity: '0.9', marginBottom: '4px' }}>
                Overall Band Score
              </div>
              <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                {results.score}
              </div>
            </div>
          </div>

          {/* Audio Playback */}
          {(results.merged_audio_url || results.individual_audio_urls) && (
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '18px' }}>
                🔊 Your Recording
              </h3>
              <button
                onClick={handlePlayAudio}
                disabled={isPlayingAudio}
                style={{
                  background: isPlayingAudio ? '#6b7280' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  cursor: isPlayingAudio ? 'not-allowed' : 'pointer',
                  opacity: isPlayingAudio ? 0.7 : 1
                }}
              >
                {isPlayingAudio ? '🔄 Playing...' : '▶️ Play Your Answer'}
              </button>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', margin: '6px 0 0 0' }}>
                {results.individual_audio_urls && results.individual_audio_urls.length > 1
                  ? 'Plays all questions with beeps'
                  : 'Listen to your response'
                }
              </p>
            </div>
          )}

          {/* Criteria Cards */}
          {(results.fluency_coherence || results.lexical_resource || results.grammatical_range || results.pronunciation) && (
            <div>
              <h3 style={{
                textAlign: 'center',
                color: '#374151',
                marginBottom: '16px',
                fontSize: '20px'
              }}>
                📋 Detailed Assessment
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
              }}>
                {results.fluency_coherence && (
                  <CriteriaCard
                    title="Fluency & Coherence"
                    icon="🗣️"
                    score={results.fluency_coherence.score}
                    strengths={results.fluency_coherence.strengths}
                    improvements={results.fluency_coherence.improvements}
                    gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    shadowColor="rgba(102, 126, 234, 0.25)"
                  />
                )}
                
                {results.lexical_resource && (
                  <CriteriaCard
                    title="Lexical Resource"
                    icon="📚"
                    score={results.lexical_resource.score}
                    strengths={results.lexical_resource.strengths}
                    improvements={results.lexical_resource.improvements}
                    gradient="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
                    shadowColor="rgba(6, 182, 212, 0.25)"
                  />
                )}
                
                {results.grammatical_range && (
                  <CriteriaCard
                    title="Grammatical Range"
                    icon="📝"
                    score={results.grammatical_range.score}
                    strengths={results.grammatical_range.strengths}
                    improvements={results.grammatical_range.improvements}
                    gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    shadowColor="rgba(16, 185, 129, 0.25)"
                  />
                )}
                
                {results.pronunciation && (
                  <CriteriaCard
                    title="Pronunciation"
                    icon="🎵"
                    score={results.pronunciation.score}
                    strengths={results.pronunciation.strengths}
                    improvements={results.pronunciation.improvements}
                    gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    shadowColor="rgba(245, 158, 11, 0.25)"
                  />
                )}
              </div>
            </div>
          )}

          {/* Transcript Section */}
          {results.transcript && (
            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '18px' }}>
                📄 Transcript
              </h3>
              
              {results.individual_transcripts && results.individual_transcripts.length > 0 ? (
                // Multi-question transcript
                <div>
                  {results.individual_transcripts.map((item, index) => (
                    <div key={index} style={{ marginBottom: '16px' }}>
                      <h4 style={{ 
                        color: '#667eea', 
                        margin: '0 0 6px 0',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        Q{index + 1}: {item.question}
                      </h4>
                      <p style={{ 
                        color: '#4b5563',
                        lineHeight: '1.5',
                        margin: '0 0 12px 0',
                        padding: '10px',
                        background: 'white',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        fontSize: '14px'
                      }}>
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                // Single transcript
                <p style={{
                  color: '#4b5563',
                  lineHeight: '1.5',
                  margin: 0,
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px'
                }}>
                  {results.transcript}
                </p>
              )}
            </div>
          )}

          {/* Overall Assessment */}
          {results.overall_assessment && (
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
                🎯 Overall Assessment
              </h3>
              <p style={{ margin: 0, lineHeight: '1.5', fontSize: '14px' }}>
                {results.overall_assessment}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleRetakeTest}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Take Test Again
          </button>
          
          <button
            onClick={handleGoHome}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🏠 Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnifiedResults