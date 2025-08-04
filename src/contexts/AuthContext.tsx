/**
 * =============================================================================
 * AUTHENTICATION CONTEXT
 * =============================================================================
 * 
 * React Context for managing Firebase authentication state across the app.
 * Provides user data and authentication functions to all components.
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { authService } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  signInWithGoogle: () => Promise<any>
  signInWithEmail: (email: string, password: string) => Promise<any>
  signUpWithEmail: (email: string, password: string) => Promise<any>
  signOut: () => Promise<any>
  refreshToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email || 'No user')
      
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken()
          setUser(firebaseUser)
          setToken(idToken)
          
          // Store token in localStorage for API calls
          localStorage.setItem('firebaseToken', idToken)
        } catch (error) {
          console.error('Failed to get ID token:', error)
          setUser(null)
          setToken(null)
          localStorage.removeItem('firebaseToken')
        }
      } else {
        setUser(null)
        setToken(null)
        localStorage.removeItem('firebaseToken')
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Refresh token function
  const refreshToken = async (): Promise<string | null> => {
    const currentUser = authService.getCurrentUser()
    if (currentUser) {
      try {
        const newToken = await currentUser.getIdToken(true) // Force refresh
        setToken(newToken)
        localStorage.setItem('firebaseToken', newToken)
        return newToken
      } catch (error) {
        console.error('Failed to refresh token:', error)
        return null
      }
    }
    return null
  }

  // Wrapped auth functions that update local state
  const signInWithGoogle = async () => {
    setLoading(true)
    const result = await authService.signInWithGoogle()
    setLoading(false)
    return result
  }

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true)
    const result = await authService.signInWithEmail(email, password)
    setLoading(false)
    return result
  }

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true)
    const result = await authService.signUpWithEmail(email, password)
    setLoading(false)
    return result
  }

  const signOut = async () => {
    setLoading(true)
    const result = await authService.signOut()
    setLoading(false)
    return result
  }

  const value = {
    user,
    token,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext