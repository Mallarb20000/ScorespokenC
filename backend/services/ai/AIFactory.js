/**
 * =============================================================================
 * AI SERVICE FACTORY
 * =============================================================================
 * 
 * Factory pattern for creating AI service instances based on configuration.
 * Makes it easy to switch between different AI providers.
 */

const GeminiAI = require('./GeminiAI')
// const OpenAIService = require('./OpenAIService') // Future implementation
// const ClaudeAI = require('./ClaudeAI') // Future implementation

class AIFactory {
  static create(config) {
    const { provider } = config

    switch (provider.toLowerCase()) {
      case 'gemini':
        return new GeminiAI(config)
      
      case 'openai':
        // return new OpenAIService(config) // Future implementation
        throw new Error('OpenAI service not yet implemented')
      
      case 'claude':
        // return new ClaudeAI(config) // Future implementation
        throw new Error('Claude AI service not yet implemented')
      
      default:
        throw new Error(`Unknown AI provider: ${provider}`)
    }
  }

  static async createWithHealthCheck(config) {
    const aiService = AIFactory.create(config)
    
    try {
      const isHealthy = await aiService.testConnection()
      if (!isHealthy) {
        console.warn(`⚠️ AI service (${config.provider}) health check failed`)
      } else {
        console.log(`✅ AI service (${config.provider}) connected successfully`)
      }
    } catch (error) {
      console.error(`❌ AI service (${config.provider}) initialization failed:`, error.message)
    }

    return aiService
  }

  static getSupportedProviders() {
    return [
      {
        name: 'gemini',
        displayName: 'Google Gemini',
        status: 'available',
        features: ['audio-analysis', 'text-generation', 'multimodal'],
        models: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro']
      },
      {
        name: 'openai',
        displayName: 'OpenAI',
        status: 'planned',
        features: ['audio-analysis', 'text-generation'],
        models: ['whisper-1', 'gpt-4']
      },
      {
        name: 'claude',
        displayName: 'Anthropic Claude',
        status: 'planned',
        features: ['text-generation'],
        models: ['claude-3-sonnet', 'claude-3-haiku']
      }
    ]
  }
}

module.exports = AIFactory