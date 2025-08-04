/**
 * =============================================================================
 * FIREBASE CLIENT CONFIGURATION
 * =============================================================================
 * 
 * Firebase client SDK setup for authentication.
 * Handles Google OAuth and email/password authentication.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth'

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Initialize Firebase only if config is present and in browser
let app: FirebaseApp | null = null
let auth: Auth | null = null

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  auth = getAuth(app)
}

// Configure Google Auth Provider
let googleProvider: GoogleAuthProvider | null = null
if (typeof window !== 'undefined' && auth) {
  googleProvider = new GoogleAuthProvider()
  googleProvider.addScope('email')
  googleProvider.addScope('profile')
}

// Auth functions
export const authService = {
  // Google Sign In
  signInWithGoogle: async () => {
    if (!auth || !googleProvider) {
      return {
        user: null,
        token: null,
        success: false,
        error: 'Firebase not initialized'
      }
    }
    
    try {
      const result = await signInWithPopup(auth, googleProvider)
      return {
        user: result.user,
        token: await result.user.getIdToken(),
        success: true
      }
    } catch (error: any) {
      console.error('Google sign in error:', error)
      return {
        user: null,
        token: null,
        success: false,
        error: error.message
      }
    }
  },

  // Email/Password Sign In
  signInWithEmail: async (email: string, password: string) => {
    if (!auth) {
      return {
        user: null,
        token: null,
        success: false,
        error: 'Firebase not initialized'
      }
    }
    
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return {
        user: result.user,
        token: await result.user.getIdToken(),
        success: true
      }
    } catch (error: any) {
      console.error('Email sign in error:', error)
      return {
        user: null,
        token: null,
        success: false,
        error: error.message
      }
    }
  },

  // Email/Password Sign Up
  signUpWithEmail: async (email: string, password: string) => {
    if (!auth) {
      return {
        user: null,
        token: null,
        success: false,
        error: 'Firebase not initialized'
      }
    }
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      return {
        user: result.user,
        token: await result.user.getIdToken(),
        success: true
      }
    } catch (error: any) {
      console.error('Email sign up error:', error)
      return {
        user: null,
        token: null,
        success: false,
        error: error.message
      }
    }
  },

  // Sign Out
  signOut: async () => {
    if (!auth) {
      return { success: false, error: 'Firebase not initialized' }
    }
    
    try {
      await signOut(auth)
      return { success: true }
    } catch (error: any) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }
  },

  // Get current user token
  getCurrentToken: async () => {
    if (!auth) return null
    
    const user = auth.currentUser
    if (user) {
      try {
        return await user.getIdToken()
      } catch (error) {
        console.error('Failed to get token:', error)
        return null
      }
    }
    return null
  },

  // Get current user
  getCurrentUser: () => {
    return auth?.currentUser || null
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (!auth) {
      callback(null)
      return () => {} // Return empty unsubscribe function
    }
    return onAuthStateChanged(auth, callback)
  }
}

export { auth }
export default app