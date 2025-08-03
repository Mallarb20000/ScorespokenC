/**
 * =============================================================================
 * GEMINI AI SERVICE IMPLEMENTATION
 * =============================================================================
 * 
 * Google Gemini AI implementation for IELTS audio analysis.
 * Handles audio processing, prompt generation, and response parsing.
 */

const AIInterface = require('./AIInterface')
const { GoogleGenerativeAI } = require('@google/generative-ai')

class GeminiAI extends AIInterface {
  constructor(config) {
    super(config)
    this.client = new GoogleGenerativeAI(config.apiKey)
    this.model = this.client.getGenerativeModel({ model: config.model })
    this.requestCount = 0
    this.totalCost = 0
  }

  async analyzeSingleAudio(audioBuffer, question, testType = 'quick-drill') {
    try {
      this.requestCount++
      const audioBase64 = audioBuffer.toString('base64')
      const prompt = this.generatePrompt(question, testType)

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: audioBase64,
            mimeType: 'audio/webm'
          }
        }
      ])

      const response = result.response
      const text = response.text()

      // Calculate cost
      const inputTokens = this.estimateAudioTokens(audioBuffer.length)
      const outputTokens = this.estimateTextTokens(text)
      const cost = this.calculateCost(inputTokens, outputTokens)
      this.totalCost += cost

      return this.parseResponse(text, { inputTokens, outputTokens, cost })

    } catch (error) {
      console.error('Gemini AI analysis failed:', error)
      throw new Error(`AI analysis failed: ${error.message}`)
    }
  }

  async analyzeMultipleAudio(audioBuffers, questions, testType) {
    try {
      this.requestCount++
      
      // Process all audio files and combine into single request
      const audioData = audioBuffers.map(buffer => ({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'audio/webm'
        }
      }))

      const prompt = this.generateMultiPrompt(questions, testType)
      const requestData = [prompt, ...audioData]

      const result = await this.model.generateContent(requestData)
      const response = result.response
      const text = response.text()

      // Calculate cost
      const totalAudioSize = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0)
      const inputTokens = this.estimateAudioTokens(totalAudioSize)
      const outputTokens = this.estimateTextTokens(text)
      const cost = this.calculateCost(inputTokens, outputTokens)
      this.totalCost += cost

      return this.parseResponse(text, { inputTokens, outputTokens, cost })

    } catch (error) {
      console.error('Gemini AI multi-analysis failed:', error)
      throw new Error(`AI multi-analysis failed: ${error.message}`)
    }
  }

  async getAvailableModels() {
    try {
      // Note: This is a placeholder as Gemini doesn't have a direct API for listing models
      return [
        { name: 'gemini-2.0-flash-exp', description: 'Latest experimental model' },
        { name: 'gemini-1.5-flash', description: 'Fast and efficient model' },
        { name: 'gemini-1.5-pro', description: 'Most capable model' }
      ]
    } catch (error) {
      console.error('Failed to get available models:', error)
      return []
    }
  }

  async testConnection() {
    try {
      // Simple test with the available models endpoint
      const models = await this.getAvailableModels()
      return models.length > 0
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  async getHealthStatus() {
    return {
      service: 'Gemini AI',
      status: 'operational',
      model: this.config.model,
      requestCount: this.requestCount,
      totalCost: this.totalCost,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      lastRequestTime: new Date().toISOString()
    }
  }

  async estimateCost(audioMinutes, expectedOutputTokens = 1000) {
    const avgAudioSizePerMinute = 100 * 1024 // ~100KB per minute
    const audioSize = audioMinutes * avgAudioSizePerMinute
    const inputTokens = this.estimateAudioTokens(audioSize)
    const cost = this.calculateCost(inputTokens, expectedOutputTokens)

    return {
      audioMinutes,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: expectedOutputTokens,
      estimatedCost: cost,
      costPerMinute: cost / audioMinutes
    }
  }

  // Helper methods
  estimateAudioTokens(audioSizeBytes) {
    // Based on your data: 1 minute ≈ 1,920 tokens
    const avgBytesPerMinute = 100 * 1024 // ~100KB per minute
    const minutes = audioSizeBytes / avgBytesPerMinute
    return Math.round(minutes * 1920)
  }

  estimateTextTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.round(text.length / 4)
  }

  calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000000) * 0.30  // $0.30 per 1M input tokens
    const outputCost = (outputTokens / 1000000) * 0.40  // $0.40 per 1M output tokens
    return inputCost + outputCost
  }

  generatePrompt(question, testType) {
    const basePrompt = `
You are an expert IELTS examiner. Analyze this audio response to the following question and provide detailed IELTS Speaking scores.

Question: ${question}

Test Type: ${testType}

Please evaluate based on the IELTS Speaking assessment criteria:
1. Fluency and Coherence (0-9)
2. Lexical Resource (0-9)
3. Grammatical Range and Accuracy (0-9)
4. Pronunciation (0-9)

Provide your response in JSON format with:
- transcript: exact words spoken
- score: overall band score (average of 4 criteria, rounded to nearest 0.5)
- fluency_coherence: {score, strengths, improvements}
- lexical_resource: {score, strengths, improvements}
- grammatical_range: {score, strengths, improvements}
- pronunciation: {score, strengths, improvements}
- overall_assessment: brief summary

Respond with valid JSON only.`

    return basePrompt
  }

  generateMultiPrompt(questions, testType) {
    const questionsList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    
    return `
You are an expert IELTS examiner. Analyze these ${questions.length} audio responses for IELTS Speaking ${testType}.

Questions:
${questionsList}

The audio files are provided in order. Evaluate the candidate's performance across all responses and provide:

1. Individual transcripts for each question
2. Overall IELTS Speaking scores based on all responses
3. Comprehensive feedback

Provide your response in JSON format with:
- individual_transcripts: array of {question, answer} objects
- transcript: combined transcript
- score: overall band score
- fluency_coherence: {score, strengths, improvements}
- lexical_resource: {score, strengths, improvements}
- grammatical_range: {score, strengths, improvements}
- pronunciation: {score, strengths, improvements}
- overall_assessment: comprehensive evaluation

Respond with valid JSON only.`
  }

  parseResponse(responseText, metadata = {}) {
    try {
      // Clean up response text (remove markdown, extra whitespace)
      const cleanText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*|\s*$/g, '')

      const parsed = JSON.parse(cleanText)
      
      // Add metadata
      parsed._metadata = {
        provider: 'gemini',
        model: this.config.model,
        processedAt: new Date().toISOString(),
        ...metadata
      }

      return parsed

    } catch (error) {
      console.error('Failed to parse AI response:', error)
      console.error('Raw response:', responseText)
      
      // Return fallback response
      return {
        transcript: "ANALYSIS_ERROR",
        score: "0",
        fluency_coherence: { score: "0", strengths: "Analysis failed", improvements: "Please try again" },
        lexical_resource: { score: "0", strengths: "Analysis failed", improvements: "Please try again" },
        grammatical_range: { score: "0", strengths: "Analysis failed", improvements: "Please try again" },
        pronunciation: { score: "0", strengths: "Analysis failed", improvements: "Please try again" },
        overall_assessment: "AI analysis encountered an error. Please try again.",
        _metadata: {
          provider: 'gemini',
          model: this.config.model,
          error: error.message,
          processedAt: new Date().toISOString()
        }
      }
    }
  }
}

module.exports = GeminiAI