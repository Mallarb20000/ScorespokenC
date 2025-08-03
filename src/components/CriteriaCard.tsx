/**
 * =============================================================================
 * REUSABLE CRITERIA CARD COMPONENT
 * =============================================================================
 * 
 * Shared component for displaying IELTS scoring criteria across all test types.
 * Used in Quick Drill, Part 1, Part 2, and Part 3 results.
 */

interface CriteriaCardProps {
  title: string      // e.g., "Fluency & Coherence"
  icon: string       // e.g., "🗣️"
  score: string      // e.g., "6.5"
  strengths: string  // Positive feedback text
  improvements: string // Areas for improvement text
  gradient: string   // CSS gradient for styling
  shadowColor: string // Shadow color for visual effects
}

export const CriteriaCard = ({ title, icon, score, strengths, improvements, gradient, shadowColor }: CriteriaCardProps) => {
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