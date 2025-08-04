/**
 * =============================================================================
 * FIREBASE AUTHENTICATION MIDDLEWARE
 * =============================================================================
 * 
 * Firebase Admin SDK integration for token verification and user management.
 * Handles Google and email authentication with automatic user creation.
 */

const admin = require('firebase-admin')
const { AppError } = require('./errorHandler')
const databaseService = require('../lib/database')
const config = require('../config')

// Initialize Firebase Admin SDK
let firebaseApp = null

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp

  try {
    // Initialize with service account (in production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      })
    } 
    // Initialize with default credentials (for development)
    else if (process.env.FIREBASE_PROJECT_ID) {
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      })
    } else {
      console.warn('⚠️  Firebase not configured - authentication disabled')
      return null
    }

    console.log('✅ Firebase Admin SDK initialized')
    return firebaseApp
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message)
    return null
  }
}

// Initialize on module load
initializeFirebase()

/**
 * Extract Firebase ID token from request
 */
const extractFirebaseToken = (req) => {
  const authHeader = req.headers.authorization
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Also check cookies for web sessions
  if (req.cookies && req.cookies.firebaseToken) {
    return req.cookies.firebaseToken
  }
  
  return null
}

/**
 * Verify Firebase ID token
 */
const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) {
    throw new AppError('Firebase not initialized', 500, 'FIREBASE_NOT_INITIALIZED')
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    console.error('Firebase token verification failed:', error.message)
    
    if (error.code === 'auth/id-token-expired') {
      throw new AppError('Token expired', 401, 'TOKEN_EXPIRED')
    }
    if (error.code === 'auth/id-token-revoked') {
      throw new AppError('Token revoked', 401, 'TOKEN_REVOKED')
    }
    if (error.code === 'auth/invalid-id-token') {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN')
    }
    
    throw new AppError('Token verification failed', 401, 'TOKEN_VERIFICATION_FAILED')
  }
}

/**
 * Get or create user in database from Firebase user data
 */
const getOrCreateUser = async (firebaseUser) => {
  if (!databaseService.isConnected) {
    // Return minimal user object if no database
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.name || 'Anonymous User',
      avatar: firebaseUser.picture,
      firebaseUid: firebaseUser.uid,
      provider: getAuthProvider(firebaseUser)
    }
  }

  const prisma = databaseService.getClient()
  
  try {
    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { id: firebaseUser.uid },
      include: { preferences: true }
    })

    if (!user) {
      // Create new user
      console.log('Creating new user:', firebaseUser.email)
      
      user = await prisma.user.create({
        data: {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.name || 'Anonymous User',
          avatar: firebaseUser.picture,
          authProvider: getAuthProvider(firebaseUser),
          authId: firebaseUser.uid,
          preferences: {
            create: {
              targetScore: 6.5,
              preferredPart: 'all',
              difficultyLevel: 'intermediate',
              recordingMode: 'voice-activated',
              theme: 'light',
              language: 'en',
              notifications: true
            }
          }
        },
        include: { preferences: true }
      })
    } else {
      // Update user info if changed
      const updates = {}
      if (user.email !== firebaseUser.email) updates.email = firebaseUser.email
      if (user.name !== firebaseUser.name && firebaseUser.name) updates.name = firebaseUser.name
      if (user.avatar !== firebaseUser.picture && firebaseUser.picture) updates.avatar = firebaseUser.picture

      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: firebaseUser.uid },
          data: { ...updates, updatedAt: new Date() },
          include: { preferences: true }
        })
      }
    }

    return user
  } catch (error) {
    console.error('Database user operation failed:', error)
    throw new AppError('User creation/update failed', 500, 'USER_OPERATION_FAILED')
  }
}

/**
 * Determine auth provider from Firebase user
 */
const getAuthProvider = (firebaseUser) => {
  if (firebaseUser.firebase?.sign_in_provider) {
    return firebaseUser.firebase.sign_in_provider
  }
  if (firebaseUser.provider_id) {
    return firebaseUser.provider_id
  }
  return 'firebase'
}

/**
 * Firebase authentication middleware
 */
const authenticateFirebase = async (req, res, next) => {
  try {
    if (!firebaseApp) {
      return next(new AppError('Authentication service unavailable', 503, 'AUTH_SERVICE_UNAVAILABLE'))
    }

    const idToken = extractFirebaseToken(req)
    
    if (!idToken) {
      return next(new AppError('Firebase ID token required', 401, 'MISSING_TOKEN'))
    }

    // Verify the Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken)
    
    // Get or create user in our database
    const user = await getOrCreateUser(decodedToken)
    
    // Attach user to request
    req.user = user
    req.firebaseUser = decodedToken
    req.token = idToken
    
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Optional Firebase authentication - doesn't fail if no token
 */
const optionalFirebaseAuth = async (req, res, next) => {
  try {
    if (!firebaseApp) {
      req.user = null
      return next()
    }

    const idToken = extractFirebaseToken(req)
    
    if (!idToken) {
      req.user = null
      return next()
    }

    try {
      const decodedToken = await verifyFirebaseToken(idToken)
      const user = await getOrCreateUser(decodedToken)
      
      req.user = user
      req.firebaseUser = decodedToken
      req.token = idToken
    } catch (error) {
      console.warn('Optional auth failed:', error.message)
      req.user = null
    }
    
    next()
  } catch (error) {
    req.user = null
    next()
  }
}

/**
 * Create guest session for anonymous usage
 */
const createGuestSession = async (req, res, next) => {
  try {
    if (req.user) {
      return next() // User already authenticated
    }

    // Create anonymous Firebase user (if needed)
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const guestUser = {
      id: guestId,
      email: null,
      name: 'Guest User',
      isGuest: true,
      createdAt: new Date().toISOString(),
      preferences: {
        targetScore: 6.5,
        preferredPart: 'all',
        difficultyLevel: 'intermediate',
        recordingMode: 'voice-activated',
        theme: 'light'
      }
    }

    req.user = guestUser
    
    // Add guest identifier to response headers
    res.set('X-Guest-Session', guestId)

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Firebase user rate limiting (per user)
 */
const firebaseUserRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequestCounts = new Map()
  
  return (req, res, next) => {
    const userId = req.user?.id || req.ip
    const now = Date.now()
    
    // Clean old entries
    for (const [key, data] of userRequestCounts.entries()) {
      if (data.resetTime < now) {
        userRequestCounts.delete(key)
      }
    }
    
    // Get or create user request data
    let userData = userRequestCounts.get(userId)
    if (!userData || userData.resetTime < now) {
      userData = {
        count: 0,
        resetTime: now + windowMs
      }
      userRequestCounts.set(userId, userData)
    }
    
    // Check if limit exceeded
    if (userData.count >= maxRequests) {
      return next(new AppError('Rate limit exceeded', 429, 'USER_RATE_LIMIT_EXCEEDED'))
    }
    
    // Increment counter
    userData.count++
    
    // Add headers
    res.set({
      'X-RateLimit-User-Limit': maxRequests,
      'X-RateLimit-User-Remaining': Math.max(0, maxRequests - userData.count),
      'X-RateLimit-User-Reset': Math.ceil(userData.resetTime / 1000)
    })
    
    next()
  }
}

/**
 * Get Firebase health status
 */
const getFirebaseHealth = async () => {
  if (!firebaseApp) {
    return {
      status: 'disabled',
      message: 'Firebase not configured'
    }
  }

  try {
    // Try to get user count as health check
    const listUsers = await admin.auth().listUsers(1)
    return {
      status: 'healthy',
      initialized: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      lastChecked: new Date().toISOString()
    }
  }
}

module.exports = {
  initializeFirebase,
  authenticateFirebase,
  optionalFirebaseAuth,
  createGuestSession,
  firebaseUserRateLimit,
  getFirebaseHealth,
  verifyFirebaseToken,
  
  // Utility functions
  isAuthenticated: (req) => !!req.user && !req.user.isGuest,
  isGuest: (req) => !!req.user?.isGuest,
  getUserId: (req) => req.user?.id || null,
  getFirebaseUid: (req) => req.firebaseUser?.uid || null
}