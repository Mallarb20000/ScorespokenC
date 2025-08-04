/**
 * =============================================================================
 * DATABASE CONNECTION AND SETUP
 * =============================================================================
 * 
 * Centralized database connection management using Prisma ORM.
 * Handles connection pooling, error handling, and graceful shutdowns.
 */

const { PrismaClient } = require('@prisma/client')
const config = require('../config')

class DatabaseService {
  constructor() {
    this.prisma = null
    this.isConnected = false
  }

  async initialize() {
    try {
      // Only initialize if database is configured
      if (config.database.type === 'none') {
        console.log('📊 Database: Disabled (using in-memory storage)')
        return true
      }

      console.log('📊 Initializing database connection...')
      
      this.prisma = new PrismaClient({
        log: config.server.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        errorFormat: 'pretty',
      })

      // Test the connection
      await this.prisma.$connect()
      await this.prisma.$queryRaw`SELECT 1`
      
      this.isConnected = true
      console.log('✅ Database connected successfully')
      
      return true

    } catch (error) {
      console.error('❌ Database connection failed:', error.message)
      this.isConnected = false
      
      if (config.server.env === 'production') {
        throw error // Fail hard in production
      }
      
      console.warn('⚠️  Continuing without database (development mode)')
      return false
    }
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect()
      this.isConnected = false
      console.log('✅ Database disconnected')
    }
  }

  // Health check
  async isHealthy() {
    if (!this.isConnected || !this.prisma) {
      return false
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  // Get database statistics
  async getStats() {
    if (!this.isConnected || !this.prisma) {
      return { status: 'disabled' }
    }

    try {
      const [userCount, sessionCount, responseCount] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.testSession.count(),
        this.prisma.testResponse.count()
      ])

      return {
        status: 'connected',
        userCount,
        sessionCount,
        responseCount,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      }
    }
  }

  // Get Prisma client instance
  getClient() {
    if (!this.isConnected) {
      throw new Error('Database not connected')
    }
    return this.prisma
  }

  // Safe operation wrapper
  async safeOperation(operation, fallback = null) {
    if (!this.isConnected || !this.prisma) {
      console.warn('Database operation attempted without connection, using fallback')
      return fallback
    }

    try {
      return await operation(this.prisma)
    } catch (error) {
      console.error('Database operation failed:', error)
      
      if (config.server.env === 'production') {
        throw error
      }
      
      console.warn('Using fallback value in development mode')
      return fallback
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService()

module.exports = databaseService