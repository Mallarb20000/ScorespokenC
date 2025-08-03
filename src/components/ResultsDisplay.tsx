/**
 * =============================================================================
 * UNIFIED IELTS RESULTS DISPLAY COMPONENT
 * =============================================================================
 * 
 * Shared component for displaying IELTS results across all test types.
 * Combines the best structure from Part 1 with audio playback from Quick Drill.
 */

import { CriteriaCard } from './CriteriaCard'

interface IELTSCriterion {
  score: string
  strengths: string
  improvements: string
}

interface ResultsDisplayProps {
  transcript?: string
  score?: string
  audioUrl?: string // For quick drill single audio
  mergedAudioUrl?: string // For multi-part tests
  fluency_coherence?: IELTSCriterion
  lexical_resource?: IELTSCriterion
  grammatical_range?: IELTSCriterion
  pronunciation?: IELTSCriterion
  overall_assessment?: string
  testType?: 'quick-drill' | 'part1' | 'part2' | 'part3'
  individual_transcripts?: Array<{
    question: string
    answer: string
  }>
  questions?: string[]
}

export const ResultsDisplay = ({
  transcript,
  score,
  audioUrl,
  mergedAudioUrl,
  fluency_coherence,
  lexical_resource,
  grammatical_range,
  pronunciation,
  overall_assessment,
  testType = 'quick-drill',
  individual_transcripts,
  questions
}: ResultsDisplayProps) => {
  
  // Debug logging for criteria
  console.log('ResultsDisplay received props:', {
    testType,
    score,
    fluency_coherence,
    lexical_resource,
    grammatical_range,
    pronunciation,
    overall_assessment
  })
  
  // Determine which audio URL to use
  const playbackUrl = audioUrl || (mergedAudioUrl ? `http://localhost:3002${mergedAudioUrl}` : null)
  
  // Debug criteria condition
  const hasCriteria = !!(fluency_coherence || lexical_resource || grammatical_range || pronunciation)
  console.log('Criteria condition check:', hasCriteria, {
    fluency_coherence: !!fluency_coherence,
    lexical_resource: !!lexical_resource,
    grammatical_range: !!grammatical_range,
    pronunciation: !!pronunciation
  })

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '20px',
      padding: '2px',
      marginTop: '32px'
    }}>
      <div style={{ 
        background: 'white',
        borderRadius: '18px',
        padding: '32px',
        minHeight: '400px'
      }}>
        <div style={{ 
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h2 style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>
            📊 Your IELTS Results
          </h2>
          <p style={{ color: '#6b7280', margin: 0 }}>Comprehensive Speaking Assessment</p>
        </div>

        {/* Band Score */}
        {score && (
          <div style={{ 
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '24px',
              borderRadius: '20px',
              display: 'inline-block',
              minWidth: '160px',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ 
                fontSize: '14px', 
                opacity: '0.9',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px'
              }}>
                Overall Band Score
              </div>
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 'bold',
                lineHeight: '1'
              }}>
                {score}
              </div>
            </div>
          </div>
        )}
        
        {/* Transcript with Audio Playback */}
        {transcript && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '20px' }}>📝</span>
              <h4 style={{ margin: 0, color: '#374151', fontSize: '18px' }}>Transcript</h4>
              {playbackUrl && (
                <button
                  onClick={() => {
                    const audio = new Audio(playbackUrl)
                    audio.play().catch(error => console.error('Error playing audio:', error))
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#4f46e5',
                    fontWeight: '500'
                  }}
                  onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    target.style.background = '#f1f5f9'
                    target.style.color = '#3730a3'
                  }}
                  onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    target.style.background = 'none'
                    target.style.color = '#4f46e5'
                  }}
                  title="Play recorded audio"
                >
                  ▶️ Click to play audio
                </button>
              )}
            </div>
            <div style={{ 
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontStyle: 'italic',
              lineHeight: '1.7',
              fontSize: '16px',
              color: '#4b5563'
            }}>
              &quot;{transcript}&quot;
            </div>
          </div>
        )}
      
        {/* IELTS Criteria Scores */}
        {(fluency_coherence || lexical_resource || grammatical_range || pronunciation) && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px'
            }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <h4 style={{ margin: 0, color: '#374151', fontSize: '18px' }}>IELTS Criteria Breakdown</h4>
            </div>
            
            {/* Criteria Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: '20px',
              marginBottom: '24px'
            }}>
              {/* Fluency & Coherence */}
              {fluency_coherence && (
                <CriteriaCard
                  title="Fluency & Coherence"
                  icon="🗣️"
                  score={fluency_coherence.score}
                  strengths={fluency_coherence.strengths}
                  improvements={fluency_coherence.improvements}
                  gradient="linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)"
                  shadowColor="rgba(59, 130, 246, 0.3)"
                />
              )}

              {/* Lexical Resource */}
              {lexical_resource && (
                <CriteriaCard
                  title="Lexical Resource"
                  icon="📚"
                  score={lexical_resource.score}
                  strengths={lexical_resource.strengths}
                  improvements={lexical_resource.improvements}
                  gradient="linear-gradient(135deg, #34d399 0%, #10b981 100%)"
                  shadowColor="rgba(16, 185, 129, 0.3)"
                />
              )}

              {/* Grammatical Range */}
              {grammatical_range && (
                <CriteriaCard
                  title="Grammatical Range"
                  icon="📝"
                  score={grammatical_range.score}
                  strengths={grammatical_range.strengths}
                  improvements={grammatical_range.improvements}
                  gradient="linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
                  shadowColor="rgba(245, 158, 11, 0.3)"
                />
              )}

              {/* Pronunciation */}
              {pronunciation && (
                <CriteriaCard
                  title="Pronunciation"
                  icon="🔊"
                  score={pronunciation.score}
                  strengths={pronunciation.strengths}
                  improvements={pronunciation.improvements}
                  gradient="linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)"
                  shadowColor="rgba(139, 92, 246, 0.3)"
                />
              )}
            </div>
          </div>
        )}

        {/* Overall Assessment */}
        {overall_assessment && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #d1d5db',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <h4 style={{ 
                  margin: 0, 
                  color: '#374151', 
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}>
                  Overall Assessment
                </h4>
              </div>
              <div style={{ 
                lineHeight: '1.7',
                fontSize: '16px',
                color: '#4b5563'
              }}>
                {overall_assessment}
              </div>
            </div>
          </div>
        )}

        {/* Individual Transcripts for Multi-Part Tests */}
        {individual_transcripts && questions && (
          <div style={{ marginTop: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <h4 style={{ margin: 0, color: '#374151', fontSize: '18px' }}>Question-by-Question Review</h4>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {questions.map((question, index) => (
                <div key={index} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      borderRadius: '8px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ 
                        margin: 0, 
                        color: '#374151', 
                        fontSize: '14px',
                        fontWeight: 'bold',
                        lineHeight: '1.4'
                      }}>
                        {question}
                      </h4>
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    marginLeft: '44px'
                  }}>
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      fontWeight: 'bold',
                      marginBottom: '6px'
                    }}>
                      📝 Your Response:
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#4b5563',
                      lineHeight: '1.5',
                      fontStyle: 'italic'
                    }}>
                      {individual_transcripts[index] 
                        ? `"${individual_transcripts[index].answer}"`
                        : `"[Answer ${index + 1} - transcript being processed...]"`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}