/**
 * =============================================================================
 * PART 2 DRILL PAGE - NEW
 * =============================================================================
 * 
 * Part 2 (Cue Card) implementation using unified TestInterface
 */

'use client'

import React from 'react'
import { TestInterface } from '../../components/shared'
import { TestConfig } from '../../lib/types'

// Part 2 cue card questions
const part2Questions = [
  {
    id: 'part2-1',
    text: `Describe a memorable trip you have taken.

You should say:
• Where you went
• Who you went with
• What you did there
• And explain why this trip was memorable for you

You have 1 minute to prepare and then speak for 2 minutes.`,
    category: 'travel',
    timeLimit: 180 // 3 minutes (1 min prep + 2 min speaking)
  }
]

const part2Config: TestConfig = {
  type: 'part2',
  title: 'IELTS Part 2 - Cue Card Task',
  description: 'Individual long turn: 1 minute preparation, 2 minutes speaking',
  questions: part2Questions,
  autoAdvance: false,
  autoSubmit: true,
  submitEndpoint: '/api/analyze-part2',
  resultRoute: '/part2-results-new',
  instructions: 'Read the cue card carefully. You have 1 minute to prepare notes, then speak for 2 minutes continuously. Cover all the points mentioned.'
}

export default function Part2DrillNewPage() {
  
  const handleTestComplete = (results: any) => {
    console.log('Part 2 test completed:', results)
  }

  const handleError = (error: Error) => {
    console.error('Part 2 test error:', error)
    alert(`Error: ${error.message}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <TestInterface
        config={part2Config}
        onComplete={handleTestComplete}
        onError={handleError}
      />
    </div>
  )
}