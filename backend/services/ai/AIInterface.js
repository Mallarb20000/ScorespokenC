/**
 * =============================================================================
 * AI SERVICE INTERFACE
 * =============================================================================
 * 
 * Abstract interface for AI processing services.
 * This allows us to easily switch between different AI providers
 * (Gemini, OpenAI, Claude, etc.) without changing the core application logic.
 */

class AIInterface {
  /**
   * Initialize the AI service with configuration
   * @param {Object} config - AI service configuration
   */
  constructor(config) {
    this.config = config
  }

  /**
   * Analyze a single audio file for IELTS scoring
   * @param {Buffer} audioBuffer - Audio file data
   * @param {string} question - The IELTS question
   * @param {string} testType - Type of test (quick-drill, part1, part2, part3)
   * @returns {Promise<Object>} - IELTS analysis results
   */
  async analyzeSingleAudio(audioBuffer, question, testType = 'quick-drill') {
    throw new Error('analyzeSingleAudio() method must be implemented')
  }

  /**
   * Analyze multiple audio files for comprehensive IELTS scoring
   * @param {Array<Buffer>} audioBuffers - Array of audio file data
   * @param {Array<string>} questions - Array of IELTS questions
   * @param {string} testType - Type of test (part1, part2, part3)
   * @returns {Promise<Object>} - Comprehensive IELTS analysis results
   */
  async analyzeMultipleAudio(audioBuffers, questions, testType) {
    throw new Error('analyzeMultipleAudio() method must be implemented')
  }

  /**
   * Get available models for this AI provider
   * @returns {Promise<Array>} - List of available models
   */
  async getAvailableModels() {
    throw new Error('getAvailableModels() method must be implemented')
  }

  /**
   * Test the AI service connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    throw new Error('testConnection() method must be implemented')
  }

  /**
   * Get service health and usage statistics
   * @returns {Promise<Object>} - Health status and stats
   */
  async getHealthStatus() {
    throw new Error('getHealthStatus() method must be implemented')
  }

  /**
   * Estimate cost for a given request
   * @param {number} audioMinutes - Total audio duration in minutes
   * @param {number} expectedOutputTokens - Expected output token count
   * @returns {Promise<Object>} - Cost estimation
   */
  async estimateCost(audioMinutes, expectedOutputTokens = 1000) {
    throw new Error('estimateCost() method must be implemented')
  }
}

module.exports = AIInterface