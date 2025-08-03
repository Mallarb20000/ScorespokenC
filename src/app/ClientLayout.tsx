/**
 * =============================================================================
 * CLIENT LAYOUT COMPONENT
 * =============================================================================
 * 
 * Client-side layout that handles global audio cleanup
 */

'use client'

import { useEffect } from 'react'
import { initializeGlobalCleanup, setupNextJSCleanup } from '../lib/utils/globalCleanup'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  useEffect(() => {
    // Initialize global cleanup listeners
    const cleanup1 = initializeGlobalCleanup()
    const cleanup2 = setupNextJSCleanup()
    
    console.log('🎧 Global audio cleanup initialized')
    
    return () => {
      cleanup1?.()
      cleanup2?.()
    }
  }, [])

  return <>{children}</>
}