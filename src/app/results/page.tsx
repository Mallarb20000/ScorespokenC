/*
 * =============================================================================
 * UNIVERSAL RESULTS PAGE
 * =============================================================================
 * 
 * Single results page that handles all test types dynamically
 * Replaces all individual result pages
 */

'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { UnifiedResults } from '../../components/shared/UnifiedResults'
import type { TestType } from '../../lib/types'

function ResultsContent() {
  const searchParams = useSearchParams()
  const testType = (searchParams.get('type') || 'quick') as TestType
  
  const testConfig = {
    quick: { title: 'Quick Drill', backRoute: '/quick-drill' },
    part1: { title: 'Part 1 Practice', backRoute: '/part1-drill' },
    part2: { title: 'Part 2 Cue Card', backRoute: '/part2-drill' },
    part3: { title: 'Part 3 Discussion', backRoute: '/part3-drill' }
  }

  const config = testConfig[testType] || testConfig.quick

  return (
    <UnifiedResults
      testType={testType}
      testTitle={config.title}
      backRoute={config.backRoute}
      homeRoute="/"
    />
  )
}

export default function UniversalResults() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h2>Loading Results...</h2>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}