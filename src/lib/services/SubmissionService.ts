/**
 * =============================================================================
 * SUBMISSION SERVICE
 * =============================================================================
 * 
 * Centralized submission handling with retry logic and error recovery
 * Replaces duplicated submission logic across all components
 */

import { TestType, QuestionAnswer, TestResults, AppError } from '../types'

export interface SubmissionConfig {
  endpoint: string
  testType: TestType
  questions: string[]
  questionAnswers: QuestionAnswer[]
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export interface SubmissionResult {
  success: boolean
  data?: TestResults
  error?: AppError
  redirectUrl?: string
}

// =============================================================================
// SUBMISSION SERVICE CLASS
// =============================================================================

export class SubmissionService {
  private readonly DEFAULT_TIMEOUT = 30000 // 30 seconds
  private readonly DEFAULT_MAX_RETRIES = 3
  private readonly DEFAULT_RETRY_DELAY = 1000 // 1 second

  /**
   * Submit test answers with retry logic
   */
  async submitTest(config: SubmissionConfig): Promise<SubmissionResult> {
    const maxRetries = config.maxRetries ?? this.DEFAULT_MAX_RETRIES
    let lastError: AppError | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.attemptSubmission(config)
        
        if (result.success) {
          return result
        }
        
        lastError = result.error!
        
        // If it's the last attempt, don't wait
        if (attempt < maxRetries) {
          await this.delay(this.calculateRetryDelay(attempt, config.retryDelay))
        }
        
      } catch (error) {
        lastError = this.createSubmissionError(
          'SUBMISSION_FAILED',
          'Network or processing error during submission',
          error
        )
        
        // If it's the last attempt, don't wait
        if (attempt < maxRetries) {
          await this.delay(this.calculateRetryDelay(attempt, config.retryDelay))
        }
      }
    }

    return {
      success: false,
      error: lastError || this.createSubmissionError(
        'SUBMISSION_FAILED',
        'All submission attempts failed'
      )
    }
  }

  /**
   * Single submission attempt
   */
  private async attemptSubmission(config: SubmissionConfig): Promise<SubmissionResult> {
    // Validate submission data
    const validationError = this.validateSubmission(config)
    if (validationError) {
      return { success: false, error: validationError }
    }

    try {
      // Create form data
      const formData = this.createFormData(config)
      
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(), 
        config.timeout ?? this.DEFAULT_TIMEOUT
      )

      // Make request
      const response = await fetch(`http://localhost:3002${config.endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Handle response
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        return {
          success: false,
          error: this.createSubmissionError(
            'SERVER_ERROR',
            `Server error: ${response.status} - ${errorText}`
          )
        }
      }

      const data = await response.json()
      
      // Create redirect URL based on test type
      const redirectUrl = this.createRedirectUrl(config.testType, data, config.questions)

      return {
        success: true,
        data,
        redirectUrl
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: this.createSubmissionError(
            'TIMEOUT_ERROR',
            'Submission timed out. Please try again.'
          )
        }
      }

      if (error.message?.includes('fetch')) {
        return {
          success: false,
          error: this.createSubmissionError(
            'NETWORK_ERROR',
            'Network error. Please check your connection and try again.'
          )
        }
      }

      return {
        success: false,
        error: this.createSubmissionError(
          'SUBMISSION_FAILED',
          'Unexpected error during submission',
          error
        )
      }
    }
  }

  /**
   * Validate submission data
   */
  private validateSubmission(config: SubmissionConfig): AppError | null {
    // Check if all questions have answers
    const unansweredQuestions = config.questionAnswers.filter(qa => !qa.audioBlob)
    if (unansweredQuestions.length > 0) {
      return this.createSubmissionError(
        'VALIDATION_ERROR',
        `Please answer all questions. ${unansweredQuestions.length} questions remaining.`
      )
    }

    // Check audio blob sizes
    const invalidAudio = config.questionAnswers.find(qa => 
      qa.audioBlob && qa.audioBlob.size === 0
    )
    if (invalidAudio) {
      return this.createSubmissionError(
        'VALIDATION_ERROR',
        'One or more audio recordings are empty. Please re-record your answers.'
      )
    }

    // Check if endpoint is valid
    if (!config.endpoint || !config.endpoint.startsWith('/api/')) {
      return this.createSubmissionError(
        'VALIDATION_ERROR',
        'Invalid submission endpoint'
      )
    }

    return null
  }

  /**
   * Create FormData for submission
   */
  private createFormData(config: SubmissionConfig): FormData {
    const formData = new FormData()

    // Handle single question tests (quick drill, part2) vs multiple question tests (part1, part3)
    if (config.testType === 'quick' || config.testType === 'part2') {
      // Single question format
      if (config.questionAnswers[0]?.audioBlob) {
        formData.append('audio', config.questionAnswers[0].audioBlob, `${config.testType}_answer.webm`)
      }
      formData.append('question', config.questions[0])
      formData.append('testType', config.testType)
    } else {
      // Multiple questions format
      config.questionAnswers.forEach((qa, index) => {
        if (qa.audioBlob) {
          const filename = `${config.testType}_q${index + 1}.webm`
          formData.append(`audio_${index}`, qa.audioBlob, filename)
        }
      })
      
      formData.append('questions', JSON.stringify(config.questions))
      formData.append('testType', config.testType)
      
      // Add metadata
      formData.append('metadata', JSON.stringify({
        timestamp: new Date().toISOString(),
        questionCount: config.questionAnswers.length,
        totalDuration: config.questionAnswers.reduce((total, qa) => {
          return total + (qa.duration || 0)
        }, 0)
      }))
    }

    return formData
  }

  /**
   * Create redirect URL based on test type
   */
  private createRedirectUrl(
    testType: TestType,
    data: TestResults,
    questions: string[]
  ): string {
    const resultsData = encodeURIComponent(JSON.stringify(data))
    const questionsData = encodeURIComponent(JSON.stringify(questions))
    
    // All test types now use the universal results page
    return `/results?type=${testType}&data=${resultsData}&questions=${questionsData}`
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseDelay?: number): number {
    const base = baseDelay ?? this.DEFAULT_RETRY_DELAY
    return base * Math.pow(2, attempt) + Math.random() * 1000 // Add jitter
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create standardized submission errors
   */
  private createSubmissionError(
    code: string, 
    message: string, 
    originalError?: any
  ): AppError {
    return {
      code,
      message,
      details: originalError,
      recoverable: !['VALIDATION_ERROR'].includes(code)
    }
  }
}

// =============================================================================
// AUTO-SUBMISSION SERVICE
// =============================================================================

export class AutoSubmissionService {
  private submissionService: SubmissionService
  private timeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor(submissionService: SubmissionService) {
    this.submissionService = submissionService
  }

  /**
   * Schedule auto-submission after recording completion
   */
  scheduleAutoSubmission(
    config: SubmissionConfig,
    delay: number = 2000,
    onSubmission: (result: SubmissionResult) => void
  ): string {
    const submissionId = Math.random().toString(36).substr(2, 9)
    
    const timeout = setTimeout(async () => {
      console.log('🚀 Auto-submitting test...')
      
      try {
        const result = await this.submissionService.submitTest(config)
        onSubmission(result)
      } catch (error) {
        onSubmission({
          success: false,
          error: {
            code: 'AUTO_SUBMISSION_FAILED',
            message: 'Auto-submission failed',
            details: error,
            recoverable: true
          }
        })
      } finally {
        this.timeouts.delete(submissionId)
      }
    }, delay)

    this.timeouts.set(submissionId, timeout)
    return submissionId
  }

  /**
   * Cancel scheduled auto-submission
   */
  cancelAutoSubmission(submissionId: string): boolean {
    const timeout = this.timeouts.get(submissionId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(submissionId)
      return true
    }
    return false
  }

  /**
   * Cancel all scheduled auto-submissions
   */
  cancelAllAutoSubmissions(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.timeouts.clear()
  }

  /**
   * Check if auto-submission is scheduled
   */
  hasScheduledSubmission(submissionId: string): boolean {
    return this.timeouts.has(submissionId)
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check server connectivity
 */
export async function checkServerConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3002/health', {
      method: 'GET',
      timeout: 5000
    } as any)
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Estimate submission time based on audio file sizes
 */
export function estimateSubmissionTime(questionAnswers: QuestionAnswer[]): number {
  const totalSize = questionAnswers.reduce((total, qa) => {
    return total + (qa.audioBlob?.size || 0)
  }, 0)
  
  // Rough estimate: 1MB takes about 2-5 seconds to upload
  const uploadTime = (totalSize / 1024 / 1024) * 3 * 1000 // 3 seconds per MB
  const processingTime = questionAnswers.length * 2000 // 2 seconds per question for AI processing
  
  return Math.max(uploadTime + processingTime, 5000) // Minimum 5 seconds
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

export const submissionService = new SubmissionService()
export const autoSubmissionService = new AutoSubmissionService(submissionService)

// Note: Global cleanup is now handled by globalCleanup.ts to avoid duplication
// Submission cleanup is called from the global cleanup system