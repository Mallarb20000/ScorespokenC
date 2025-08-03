/**
 * =============================================================================
 * IELTS PROMPTS MANAGEMENT
 * =============================================================================
 * 
 * Centralized prompt templates for IELTS analysis.
 * Supports different test types and customizable prompt variations.
 * Easy to modify prompts without touching core AI logic.
 */

class IELTSPrompts {
  constructor() {
    this.bandDescriptors = this.getBandDescriptors()
    this.commonInstructions = this.getCommonInstructions()
  }

  /**
   * Generate prompt for single question analysis
   */
  getSingleQuestionPrompt(question, testType = 'quick-drill') {
    const specificInstructions = this.getTestTypeInstructions(testType)
    
    return `${this.commonInstructions}

${specificInstructions}

Question: ${question}
Test Type: ${testType}

${this.getResponseFormat()}

${this.getSpecialCases()}

Respond with valid JSON only. Do not include any text before or after the JSON.`
  }

  /**
   * Generate prompt for multiple question analysis
   */
  getMultiQuestionPrompt(questions, testType) {
    const questionsList = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    const specificInstructions = this.getTestTypeInstructions(testType)
    
    return `${this.commonInstructions}

${specificInstructions}

Questions (${questions.length} total):
${questionsList}

The audio files are provided in sequential order corresponding to the questions above.

${this.getMultiResponseFormat()}

${this.getSpecialCases()}

Respond with valid JSON only. Do not include any text before or after the JSON.`
  }

  /**
   * Get test-type specific instructions
   */
  getTestTypeInstructions(testType) {
    const instructions = {
      'quick-drill': `
QUICK DRILL ANALYSIS:
- Focus on immediate feedback for single question practice
- Provide concise but actionable advice
- Emphasize areas for quick improvement`,

      'part1': `
IELTS PART 1 ANALYSIS:
- Personal questions about familiar topics
- Expected response length: 20-30 seconds per question
- Focus on fluency, natural conversation, and basic vocabulary
- Answers should be direct and relevant to personal experience`,

      'part2': `
IELTS PART 2 ANALYSIS:
- Cue card topic with 2-minute speaking time
- Evaluate topic development, coherence, and sustained speech
- Look for structured response covering all bullet points
- Assess ability to speak at length without prompting`,

      'part3': `
IELTS PART 3 ANALYSIS:
- Abstract discussion questions requiring higher-level thinking
- Evaluate complex ideas, speculation, and abstract concepts
- Look for sophisticated vocabulary and advanced grammar structures
- Assess ability to develop arguments and express opinions with justification`
    }

    return instructions[testType] || instructions['quick-drill']
  }

  /**
   * Common instructions for all test types
   */
  getCommonInstructions() {
    return `You are an expert IELTS examiner with extensive experience in Speaking assessment.

Analyze the provided audio response(s) according to the official IELTS Speaking band descriptors.

ASSESSMENT CRITERIA (each scored 0-9):
1. Fluency and Coherence
2. Lexical Resource  
3. Grammatical Range and Accuracy
4. Pronunciation

${this.bandDescriptors}`
  }

  /**
   * IELTS band descriptors for accurate scoring
   */
  getBandDescriptors() {
    return `
BAND DESCRIPTORS SUMMARY:

Band 9: Expert user - native-like fluency, wide range of vocabulary and grammar, clear pronunciation
Band 8: Very good user - fluent with occasional hesitation, flexible use of language, wide range of pronunciation features
Band 7: Good user - flexible use of language, some hesitation but doesn't affect coherence, clear pronunciation
Band 6: Competent user - able to keep going with some hesitation, sufficient vocabulary, generally appropriate pronunciation
Band 5: Modest user - relies on repetition, limited flexibility, requires effort to understand at times
Band 4: Limited user - frequent pauses, basic sentence forms, limited vocabulary, frequent pronunciation issues
Band 3: Extremely limited user - very limited vocabulary, numerous errors, difficult to understand
Band 2: Intermittent user - isolated words only, little communication possible
Band 1: Non-user - essentially no usable language
Band 0: Did not attempt - no scoreable language`
  }

  /**
   * Response format for single question
   */
  getResponseFormat() {
    return `
REQUIRED JSON FORMAT:
{
  "transcript": "exact words spoken by candidate",
  "score": "overall band score (average of 4 criteria, rounded to nearest 0.5)",
  "fluency_coherence": {
    "score": "band score 0-9",
    "strengths": "specific positive observations",
    "improvements": "specific areas for development"
  },
  "lexical_resource": {
    "score": "band score 0-9", 
    "strengths": "vocabulary usage highlights",
    "improvements": "vocabulary development areas"
  },
  "grammatical_range": {
    "score": "band score 0-9",
    "strengths": "grammar usage highlights", 
    "improvements": "grammar development areas"
  },
  "pronunciation": {
    "score": "band score 0-9",
    "strengths": "pronunciation highlights",
    "improvements": "pronunciation development areas"
  },
  "overall_assessment": "brief summary of performance and main development priorities"
}`
  }

  /**
   * Response format for multiple questions
   */
  getMultiResponseFormat() {
    return `
REQUIRED JSON FORMAT:
{
  "individual_transcripts": [
    {"question": "question text", "answer": "candidate response"},
    ...
  ],
  "transcript": "combined transcript of all responses",
  "score": "overall band score (average of 4 criteria, rounded to nearest 0.5)",
  "fluency_coherence": {
    "score": "band score 0-9",
    "strengths": "specific positive observations across all responses",
    "improvements": "specific areas for development"
  },
  "lexical_resource": {
    "score": "band score 0-9",
    "strengths": "vocabulary usage highlights across responses",
    "improvements": "vocabulary development areas"
  },
  "grammatical_range": {
    "score": "band score 0-9", 
    "strengths": "grammar usage highlights across responses",
    "improvements": "grammar development areas"
  },
  "pronunciation": {
    "score": "band score 0-9",
    "strengths": "pronunciation highlights across responses", 
    "improvements": "pronunciation development areas"
  },
  "overall_assessment": "comprehensive evaluation of performance across all responses and main development priorities"
}`
  }

  /**
   * Special cases handling
   */
  getSpecialCases() {
    return `
SPECIAL CASES:
- If audio is silent, empty, or unintelligible: set transcript to "AUDIO NOT CLEAR" and all scores to "0"
- If response is too short (under 10 words): set transcript to exact words heard and overall score to "1"
- If response is completely unrelated to question: set transcript to exact words and score to "1-2"
- If candidate uses memorized responses: reduce fluency score and note in assessment`
  }

  /**
   * Get custom prompt variations for different scenarios
   */
  getCustomPrompt(type, options = {}) {
    const prompts = {
      'diagnostic': this.getDiagnosticPrompt(options),
      'practice': this.getPracticePrompt(options),
      'mock-exam': this.getMockExamPrompt(options),
      'progress-tracking': this.getProgressTrackingPrompt(options)
    }

    return prompts[type] || this.getSingleQuestionPrompt(options.question, options.testType)
  }

  /**
   * Diagnostic assessment prompt for skill identification
   */
  getDiagnosticPrompt(options) {
    return `${this.getCommonInstructions()}

DIAGNOSTIC ASSESSMENT MODE:
Focus on identifying specific strengths and weaknesses for personalized learning path.

Question: ${options.question}

Provide detailed diagnostic feedback with:
1. Current proficiency level per criterion
2. Specific skills to develop
3. Recommended practice activities
4. Target band score achievability

${this.getResponseFormat()}`
  }

  /**
   * Practice mode prompt for skill development
   */
  getPracticePrompt(options) {
    return `${this.getCommonInstructions()}

PRACTICE MODE:
Focus on encouraging feedback with specific improvement strategies.

Question: ${options.question}
Focus Area: ${options.focusArea || 'general'}

Provide supportive feedback emphasizing:
1. Progress indicators
2. Specific techniques to practice
3. Common mistakes to avoid
4. Next steps for improvement

${this.getResponseFormat()}`
  }

  /**
   * Mock exam prompt for realistic assessment
   */
  getMockExamPrompt(options) {
    return `${this.getCommonInstructions()}

MOCK EXAM MODE:
Provide official IELTS-standard assessment with strict scoring criteria.

Questions: ${options.questions?.join(', ') || options.question}
Test Type: ${options.testType}

Apply strict IELTS standards:
1. No leniency in scoring
2. Official time limits considered
3. Formal assessment language
4. Clear band justifications

${options.questions ? this.getMultiResponseFormat() : this.getResponseFormat()}`
  }

  /**
   * Progress tracking prompt for comparing performance
   */
  getProgressTrackingPrompt(options) {
    return `${this.getCommonInstructions()}

PROGRESS TRACKING MODE:
Compare current performance with previous attempts if provided.

Question: ${options.question}
Previous Score: ${options.previousScore || 'N/A'}
Focus Areas: ${options.focusAreas?.join(', ') || 'N/A'}

Highlight:
1. Improvements since last attempt
2. Consistent strengths
3. Areas still needing work
4. Recommended next practice topics

${this.getResponseFormat()}`
  }
}

module.exports = IELTSPrompts