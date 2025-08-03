/*
 * =============================================================================
 * SCORESPOKEN BACKEND SERVER
 * =============================================================================
 * 
 * This Express.js server handles IELTS speaking test processing using AI.
 * 
 * ARCHITECTURE OVERVIEW:
 * 1. Frontend uploads audio files → Express server receives them
 * 2. Server processes audio with Gemini AI → Returns structured IELTS scores
 * 3. Handles CORS, file uploads, and AI API communication
 * 
 * LEARNING OBJECTIVES:
 * - Express.js web server setup and middleware
 * - File upload handling with Multer
 * - AI API integration (Google Gemini)
 * - Environment variable management
 * - Error handling and data validation
 * - JSON parsing and response formatting
 * 
 * TECH STACK:
 * - Express.js: Web framework for Node.js
 * - Multer: Middleware for handling multipart/form-data (file uploads)
 * - Google Generative AI: Gemini Flash API for audio analysis
 * - CORS: Cross-Origin Resource Sharing middleware
 * - dotenv: Environment variable management
 */

// =============================================================================
// DEPENDENCIES AND IMPORTS
// =============================================================================

const express = require('express')                    // Web framework
const cors = require('cors')                         // Cross-origin requests
const multer = require('multer')                     // File upload handling
const { GoogleGenerativeAI } = require('@google/generative-ai') // AI API client
const fs = require('fs')                             // File system operations
const path = require('path')                         // Path utilities
const { exec } = require('child_process')           // Execute shell commands
const util = require('util')                        // Utilities
require('dotenv').config()                           // Load environment variables

const execPromise = util.promisify(exec)             // Promisified exec for async/await

// =============================================================================
// AUDIO PROCESSING UTILITIES
// =============================================================================

/**
 * Generate a 2-second beep audio buffer
 * Creates a simple tone as separator between questions
 */
function generateBeepBuffer() {
  // Simple 2-second beep tone generation
  // This creates a basic tone that will be used as separator
  const sampleRate = 44100
  const duration = 2 // 2 seconds
  const frequency = 800 // 800Hz beep
  const samples = sampleRate * duration
  
  // Create WebM header (simplified - in production would use proper audio library)
  const beepData = Buffer.alloc(samples * 2) // 16-bit audio
  
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * 32767
    beepData.writeInt16LE(sample, i * 2)
  }
  
  return beepData
}

/**
 * Create a simple 2-second silence buffer with proper WebM structure
 * Since generating proper WebM beeps is complex, use silence for now
 */
function generateSilenceBuffer() {
  // Create 2 seconds of silence (44100 Hz, 16-bit, mono)
  const sampleRate = 44100
  const duration = 2
  const samples = sampleRate * duration
  const silenceBuffer = Buffer.alloc(samples * 2, 0) // 16-bit zeros = silence
  
  return silenceBuffer
}

/**
 * Simple approach: Send all audio files to AI individually and combine transcripts
 * This avoids complex WebM merging while still processing all answers
 */
async function processAllAudioFiles(audioFiles, questions, model, prompt) {
  const results = []
  
  for (let i = 0; i < audioFiles.length; i++) {
    const audioBase64 = audioFiles[i].buffer.toString('base64')
    const questionPrompt = prompt.replace('{CURRENT_QUESTION}', questions[i])
    
    try {
      const result = await model.generateContent([
        questionPrompt,
        {
          inlineData: {
            data: audioBase64,
            mimeType: audioFiles[i].mimetype || 'audio/webm'
          }
        }
      ])
      
      const response = await result.response
      const text = response.text()
      
      console.log(`🎯 Raw AI response for question ${i + 1}:`, text)
      
      results.push({
        question: questions[i],
        response: text,
        questionIndex: i
      })
      
    } catch (error) {
      console.error(`Error processing audio ${i}:`, error)
      results.push({
        question: questions[i],
        response: 'Error processing this audio',
        questionIndex: i
      })
    }
  }
  
  return results
}

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

const app = express()                               // Create Express application
const PORT = process.env.PORT || 3002             // Server port from env or default

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

/**
 * CORS Middleware:
 * Allows frontend (running on different port) to make requests to this server
 */
app.use(cors())

/**
 * Body Parsing Middleware:
 * Handles JSON and URL-encoded data with large file size limits
 * NOTE: 50mb limit is generous but could be optimized for production
 */
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Serve temporary merged audio files
app.use('/temp', express.static(path.join(__dirname, 'temp')))

/**
 * File Upload Configuration:
 * Uses memory storage (files stored in RAM, not disk)
 * TRADE-OFF: Fast access but not scalable for multiple users
 */
const upload = multer({ storage: multer.memoryStorage() })

// =============================================================================
// AI SERVICE INITIALIZATION
// =============================================================================

/**
 * Environment Variable Validation:
 * Ensures required API key is present before starting server
 * SECURITY: API key stored in environment, not in code
 */
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not found in environment variables')
  process.exit(1)  // Exit with error code if key missing
}

/**
 * Google Generative AI Client:
 * Initializes connection to Gemini Flash API for audio processing
 */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const IELTS_PROMPT = `You are an expert IELTS Speaking examiner analyzing a {PART_TYPE} response. Analyze the provided audio response to the given question and provide:

{PART_CONTEXT}

Evaluate for IELTS Speaking based on official band descriptors (0–9), focusing on Bands :
IELTS Speaking Band Descriptors (Bands 9–1)
Band 9:

Fluency and Coherence: Fluent with only very occasional repetition or self-correction. Hesitation only to prepare content, not to find words/grammar. Speech is fully cohesive and situationally appropriate. Topic development is fully coherent and extended.

Lexical Resource: Total flexibility and precise use in all contexts. Sustained use of accurate and idiomatic language.

Grammatical Range and Accuracy: Structures are precise and accurate at all times, apart from ‘mistakes’ characteristic of native speaker speech.

Pronunciation: Uses a full range of phonological features to convey precise and/or subtle meaning. Flexible, sustained connected speech. Can be effortlessly understood. Accent has no effect on intelligibility.

Band 8:

Fluency and Coherence: Fluent with only occasional repetition or self-correction. Hesitation may occur but is mostly content related. Topic development is coherent and relevant.

Lexical Resource: Wide resource, flexibly used to discuss all topics and convey precise meaning. Skilful use of less common and idiomatic items despite occasional inaccuracies. Effective paraphrase.

Grammatical Range and Accuracy: Wide range of structures, flexibly used. Majority of sentences are error-free. Occasional inappropriacies/non-systematic errors. A few basic errors may persist.

Pronunciation: Wide range of phonological features to convey meaning. Sustains rhythm and intonation, with minimal lapses. Easily understood. Accent has minimal effect on intelligibility.

Band 7:

Fluency and Coherence: Able to keep going and produce long turns without noticeable effort. Some hesitation, repetition, or self-correction may occur, often mid-sentence, but does not affect coherence. Flexible use of discourse markers/connectives.

Lexical Resource: Resource flexibly used for various topics. Some less common/idiomatic items and awareness of style/collocation, though inappropriacies occur. Effective paraphrase.

Grammatical Range and Accuracy: Range of structures flexibly used. Error-free sentences are frequent. Simple and complex sentences used effectively despite some errors. A few basic errors persist.

Pronunciation: All positive features of Band 6, and some of Band 8.

Band 6:

Fluency and Coherence: Able to keep going and willing to produce long turns. Coherence may be lost at times due to hesitation/repetition/self-correction. Uses a range of discourse markers, connectives, and cohesive features (not always appropriately).

Lexical Resource: Sufficient resource to discuss topics at length. Vocabulary may be inappropriate but meaning is clear. Generally able to paraphrase.

Grammatical Range and Accuracy: Mix of short and complex sentences; variety of structures with limited flexibility. Errors frequent in complex structures but rarely impede communication.

Pronunciation: Uses range of phonological features, but control is variable. Chunking generally appropriate, rhythm may lack stress-timing/rapid speech. Some effective intonation/stress, not sustained. Occasional mispronunciation but generally understood.

Band 5:

Fluency and Coherence: Usually able to keep going, but relies on repetition/self-correction or slow speech. Hesitations often when searching for basic lexis/grammar. Overuse of discourse markers/connectives. More complex speech usually causes disfluency; simple language may be fluent.

Lexical Resource: Sufficient resource for familiar/unfamiliar topics, but limited flexibility. Attempts paraphrase, not always successful.

Grammatical Range and Accuracy: Basic sentence forms fairly well controlled. Complex structures attempted but limited and often erroneous.

Pronunciation: All positive features of Band 4, and some of Band 6.

Band 4

Fluency and Coherence: Unable to keep going without noticeable pauses. Speech may be slow with frequent repetition. Often self-corrects. Can link simple sentences but often with repetitious connectives. Some breakdowns in coherence.

Lexical Resource: Resource sufficient for familiar topics but only basic meaning can be conveyed on unfamiliar topics. Frequent inappropriacies and errors in word choice. Rarely attempts paraphrase.

Grammatical Range and Accuracy: Can produce basic sentence forms and some short utterances are error-free. Subordinate clauses are rare; turns are short, structures are repetitive, and errors are frequent.

Pronunciation: Uses some acceptable phonological features, but range is limited. Some acceptable chunking, but frequent lapses in rhythm. Attempts intonation and stress, but control is limited. Individual words or phonemes are frequently mispronounced, causing lack of clarity. Understanding requires effort and there may be patches of speech that cannot be understood.

Band 3

Fluency and Coherence: Frequent, sometimes long, pauses occur while candidate searches for words. Limited ability to link simple sentences and go beyond simple responses. Frequently unable to convey basic message.

Lexical Resource: Resource limited to simple vocabulary used primarily to convey personal information. Vocabulary inadequate for unfamiliar topics.

Grammatical Range and Accuracy: Basic sentence forms are attempted but grammatical errors are numerous except in apparently memorised utterances.

Pronunciation: Displays some features of band 2, and some, but not all, of the positive features of band 4.

Band 2

Fluency and Coherence: Lengthy pauses before nearly every word. Isolated words may be recognisable but speech is of virtually no communicative significance.

Lexical Resource: Very limited resource. Utterances consist of isolated words or memorised utterances. Little communication possible without mime or gesture.

Grammatical Range and Accuracy: No evidence of basic sentence forms.

Pronunciation: Uses few acceptable phonological features (possibly because sample is insufficient). Overall problems with delivery impair attempts at connected speech. Individual words and phonemes are mainly mispronounced and little meaning is conveyed. Often unintelligible.

Band 1

Fluency and Coherence: Essentially none. Speech is totally incoherent.

Lexical Resource: No resource bar a few isolated words. No communication possible.

Grammatical Range and Accuracy: No rateable language unless memorised.

Pronunciation: Can produce occasional individual words and phonemes that are recognisable, but no overall meaning is conveyed. Unintelligible.


Provide detailed evaluation with:
1. Individual scores for each of the 4 IELTS Speaking criteria
2. Overall band score (average of 4 criteria, rounded to nearest 0.5)
3. Specific feedback for each criterion with strengths and improvements needed

CRITICAL: You MUST respond with ONLY valid JSON format. Do not include any text before or after the JSON. Do not use markdown code blocks. Respond with pure JSON only.

SPECIAL CASES:
- If the audio is silent, empty, or unintelligible, set transcript to "AUDIO NOT CLEAR" and score to "0"
- If the response is too short (under 10 words), set transcript to the exact words heard and score to "1" 
- If the response is unrelated to the question, set transcript to exact words and score to "1"

Format your response as a JSON object with these exact keys:
{
  "transcript": "exact words spoken by candidate",
  "score": "overall band score as number (e.g., 6.5)",
  "fluency_coherence": {
    "score": "band score for this criterion (e.g., 6)",
    "strengths": "What went well in fluency and coherence",
    "improvements": "What needs improvement in fluency and coherence"
  },
  "lexical_resource": {
    "score": "band score for this criterion (e.g., 5)",
    "strengths": "What went well in vocabulary usage",
    "improvements": "What needs improvement in vocabulary"
  },
  "grammatical_range": {
    "score": "band score for this criterion (e.g., 6)",
    "strengths": "What went well in grammar",
    "improvements": "What needs improvement in grammar"
  },
  "pronunciation": {
    "score": "band score for this criterion (e.g., 7)",
    "strengths": "What went well in pronunciation",
    "improvements": "What needs improvement in pronunciation"
  },
  "overall_assessment": "Brief summary of overall performance and main recommendations"
}

Question: {CURRENT_QUESTION}

Please analyze the audio and provide your assessment.`

// =============================================================================
// MAIN API ENDPOINT - AUDIO ANALYSIS
// =============================================================================

/**
 * POST /api/analyze-answer
 * ========================
 * 
 * This is the core endpoint that handles IELTS speaking test analysis.
 * 
 * REQUEST DATA FLOW:
 * 1. Frontend sends FormData with audio file + question text
 * 2. Multer middleware processes multipart upload
 * 3. File validation and question validation
 * 4. Audio converted to base64 for Gemini API
 * 5. Gemini analyzes audio and returns structured feedback
 * 6. Response parsed and sent back to frontend
 * 
 * MIDDLEWARE USED:
 * - upload.single('audio'): Multer handles file upload with 'audio' field name
 * 
 * TECHNOLOGIES DEMONSTRATED:
 * - Express.js route handling
 * - File upload processing with Multer
 * - Base64 encoding for binary data
 * - AI API integration (Gemini Flash)
 * - JSON parsing and error handling
 * - HTTP status codes and error responses
 */
app.post('/api/analyze-answer', upload.single('audio'), async (req, res) => {
  
  // =============================================================================
  // REQUEST LOGGING AND DEBUGGING
  // =============================================================================
  
  /**
   * Log incoming request details for debugging:
   * - File presence and size
   * - Question text
   * - Headers for troubleshooting CORS/content-type issues
   */
  console.log('Received request:', {
    hasFile: !!req.file,
    fileSize: req.file?.size,
    question: req.body?.question,
    headers: req.headers
  })
  
  try {
    // =============================================================================
    // INPUT VALIDATION
    // =============================================================================
    
    /**
     * Validate audio file presence:
     * Multer stores uploaded file in req.file, null if missing
     */
    if (!req.file) {
      console.log('No audio file in request')
      return res.status(400).json({ error: 'No audio file provided' })
    }

    /**
     * Validate question text:
     * Extract question from request body (sent as FormData field)
     */
    const { question } = req.body
    if (!question) {
      console.log('No question in request body')
      return res.status(400).json({ error: 'No question provided' })
    }

    // =============================================================================
    // AUDIO PROCESSING FOR AI API
    // =============================================================================
    
    /**
     * Validate audio file size and content:
     * Check for empty or extremely small audio files before processing
     */
    if (req.file.size < 1000) { // Less than 1KB likely empty or corrupted
      console.log('Audio file too small:', req.file.size, 'bytes')
      return res.json({
        transcript: "AUDIO NOT CLEAR",
        score: "0",
        fluency_coherence: { score: "0", strengths: "N/A", improvements: "Please record your answer again with clear audio" },
        lexical_resource: { score: "0", strengths: "N/A", improvements: "Audio was not clear enough to evaluate vocabulary" },
        grammatical_range: { score: "0", strengths: "N/A", improvements: "Audio was not clear enough to evaluate grammar" },
        pronunciation: { score: "0", strengths: "N/A", improvements: "Audio was not clear enough to evaluate pronunciation" },
        overall_assessment: "The audio was either empty, too short, or not clear enough for IELTS evaluation. Please check your microphone and try recording again."
      })
    }

    /**
     * Convert audio to base64:
     * Gemini API requires binary data as base64 string
     * req.file.buffer contains the raw audio data from Multer
     */
    const audioBase64 = req.file.buffer.toString('base64')
    
    // =============================================================================
    // AI MODEL CONFIGURATION
    // =============================================================================
    
    /**
     * Initialize Gemini 2.0 Flash model:
     * Using 'gemini-2.0-flash-experimental' - the latest and fastest model
     * Optimized for low latency with improved multimodal capabilities
     */
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.2,        // Lower temperature for consistent scoring
        topP: 0.8,              // Focused responses
        maxOutputTokens: 1000,  // Limit output length for faster processing
      }
    })
    
    /**
     * Prepare prompt with dynamic question and part context:
     * Replace placeholders in IELTS_PROMPT with actual question text and part info
     */
    const prompt = IELTS_PROMPT
      .replace('{PART_TYPE}', 'Quick Drill (single question)')
      .replace('{PART_CONTEXT}', 'CONTEXT: This is a single question practice session to help students prepare for IELTS Speaking.')
      .replace('{CURRENT_QUESTION}', question)
    
    // =============================================================================
    // AI API CALL
    // =============================================================================
    
    /**
     * Send request to Gemini API:
     * - Text prompt with IELTS scoring instructions
     * - Audio data as inline binary content
     * - MIME type for proper audio interpretation
     */
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: audioBase64,              // Base64 encoded audio
          mimeType: req.file.mimetype     // e.g., 'audio/webm'
        }
      }
    ])

    // =============================================================================
    // RESPONSE PROCESSING
    // =============================================================================
    
    /**
     * Extract text response from Gemini:
     * API returns complex object, we need the text content
     */
    const response = await result.response
    const text = response.text()
    
    let analysisResult
    
    try {
      // =============================================================================
      // JSON PARSING WITH MARKDOWN CLEANUP
      // =============================================================================
      
      /**
       * Clean Gemini response format:
       * Gemini sometimes wraps JSON in markdown code blocks (```json ... ```)
       * We need to remove these to parse as valid JSON
       */
      let cleanText = text.trim()
      
      // Clean markdown code blocks
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '')
      }
      
      // Try to extract JSON if it's embedded in other text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanText = jsonMatch[0]
      }
      
      /**
       * Parse cleaned JSON:
       * Convert string response to JavaScript object
       */
      analysisResult = JSON.parse(cleanText)
      
    } catch (parseError) {
      // =============================================================================
      // FALLBACK ERROR HANDLING
      // =============================================================================
      
      /**
       * Handle JSON parsing failures:
       * If Gemini returns malformed JSON, provide fallback response
       * Log raw response for debugging
       */
      console.error('Error parsing Gemini response:', parseError)
      console.log('Raw response:', text)
      
      analysisResult = {
        transcript: "Could not generate transcript",
        score: "N/A",
        feedback: text || "Unable to analyze the audio at this time."
      }
    }

    // =============================================================================
    // SUCCESS RESPONSE
    // =============================================================================
    
    /**
     * Send structured response to frontend:
     * analysisResult contains IELTS scores, transcript, and feedback
     */
    res.json(analysisResult)
    
  } catch (error) {
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    
    /**
     * Handle server errors:
     * - Network issues with Gemini API
     * - File processing errors
     * - Unexpected server errors
     */
    console.error('Error analyzing answer:', error)
    res.status(500).json({ 
      error: 'Failed to analyze answer',
      details: error.message 
    })
  }
})

// =============================================================================
// PART 1 DRILL ENDPOINT - MULTIPLE AUDIO FILES
// =============================================================================

/**
 * POST /api/analyze-part1
 * =======================
 * 
 * Handles IELTS Part 1 analysis with multiple audio files (5 questions)
 * 
 * REQUEST STRUCTURE:
 * - audio_0, audio_1, audio_2, audio_3, audio_4: Individual audio files
 * - questions: JSON string array of all questions
 * - testType: 'part1'
 * 
 * PROCESSING FLOW:
 * 1. Extract all audio files from FormData
 * 2. Convert each to base64 for Gemini API
 * 3. Create comprehensive Part 1 prompt
 * 4. Send all audio + questions to Gemini
 * 5. Parse and return structured IELTS feedback
 */
app.post('/api/analyze-part1', upload.fields([
  { name: 'audio_0', maxCount: 1 },
  { name: 'audio_1', maxCount: 1 },
  { name: 'audio_2', maxCount: 1 },
  { name: 'audio_3', maxCount: 1 },
  { name: 'audio_4', maxCount: 1 }
]), async (req, res) => {
  
  console.log('Received Part 1 request:', {
    files: Object.keys(req.files || {}),
    questions: req.body?.questions,
    testType: req.body?.testType
  })
  
  try {
    // =============================================================================
    // VALIDATE PART 1 REQUEST
    // =============================================================================
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No audio files provided' })
    }
    
    const { questions, testType } = req.body
    if (!questions) {
      return res.status(400).json({ error: 'No questions provided' })
    }
    
    let parsedQuestions
    try {
      parsedQuestions = JSON.parse(questions)
    } catch (e) {
      return res.status(400).json({ error: 'Invalid questions format' })
    }
    
    // =============================================================================
    // PROCESS AND MERGE MULTIPLE AUDIO FILES
    // =============================================================================
    
    const audioFiles = []
    const fileKeys = Object.keys(req.files).sort() // Ensure correct order
    
    // Collect all audio files in correct order
    for (const key of fileKeys) {
      const fileArray = req.files[key]
      if (fileArray && fileArray[0]) {
        const file = fileArray[0]
        audioFiles.push({
          buffer: file.buffer,
          mimetype: file.mimetype,
          questionIndex: parseInt(key.split('_')[1])
        })
      }
    }
    
    // MERGE ALL AUDIO FILES WITH BEEP SEPARATORS
    console.log(`Processing ${audioFiles.length} audio files for Part 1 analysis...`)
    
    if (audioFiles.length === 0) {
      return res.status(400).json({ error: 'No audio files found' })
    }
    
    // Process all audio files individually and combine results
    console.log(`Processing all ${audioFiles.length} audio files individually...`)
    
    // =============================================================================
    // CREATE PART 1 SPECIFIC PROMPT
    // =============================================================================
    
    const INDIVIDUAL_PROMPT = `You are an IELTS Speaking examiner analyzing an individual Part 1 response.

PART 1 CONTEXT: This is part of a 5-question personal introduction session. All questions in this session are:
${parsedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CURRENT QUESTION BEING ANALYZED: {CURRENT_QUESTION}

CRITICAL INSTRUCTIONS - NO HALLUCINATION:
- ONLY transcribe the EXACT words you can clearly hear in the audio
- If you hear only simple words like "hello", transcribe ONLY "hello" - do NOT elaborate
- DO NOT create fictional responses or elaborate on what you think was said
- BE BRUTALLY HONEST about what you actually hear

IMPORTANT: You MUST respond with ONLY valid JSON format. Do not include any text before or after the JSON. Do not use markdown code blocks. Respond with pure JSON only.

SPECIAL CASES:
- If audio is unclear, corrupted, or silent, set transcript to "AUDIO NOT CLEAR"
- If no meaningful words are heard, set transcript to "NO AUDIO DETECTED"

Provide a brief analysis in this exact JSON format:
{
  "transcript": "exact words heard",
  "relevance": "does this answer the question appropriately?",
  "quality": "brief assessment of response quality",
  "notes": "any issues with audio clarity or content"
}`

    // =============================================================================
    // PROCESS ALL AUDIO FILES INDIVIDUALLY
    // =============================================================================
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 500,
      }
    })
    
    // Process all audio files
    const individualResults = await processAllAudioFiles(audioFiles, parsedQuestions, model, INDIVIDUAL_PROMPT)
    
    // Combine all transcripts and create overall assessment
    const allTranscripts = individualResults.map((result, index) => {
      try {
        let cleanText = result.response.trim()
        
        // Log the raw response for debugging
        console.log(`🔍 Processing response for question ${index + 1}:`, cleanText.substring(0, 200) + '...')
        
        // Clean markdown code blocks
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '')
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '')
        }
        
        // Try to extract JSON if it's embedded in other text
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          cleanText = jsonMatch[0]
        }
        
        const parsed = JSON.parse(cleanText)
        return {
          question: result.question,
          answer: parsed.transcript || "Could not transcribe",
          quality: parsed.quality || "No assessment",
          relevance: parsed.relevance || "No relevance check"
        }
      } catch (error) {
        console.error(`❌ JSON parsing failed for question ${index + 1}:`, error.message)
        console.error(`Raw response was:`, result.response)
        
        // Try to extract transcript manually if it's not JSON
        let fallbackTranscript = "Could not parse response"
        if (result.response && result.response.includes('transcript')) {
          const match = result.response.match(/"transcript":\s*"([^"]*)"/)
          if (match) {
            fallbackTranscript = match[1]
          }
        }
        
        return {
          question: result.question,
          answer: fallbackTranscript,
          quality: "Manual parsing",
          relevance: "Unknown"
        }
      }
    })
    
    // Create combined transcript
    const combinedTranscript = allTranscripts.map((t, i) => `Q${i+1}: ${t.answer}`).join(' | ')
    
    // Generate AI-powered overall assessment
    console.log('🤖 Generating comprehensive Part 1 assessment...')
    
    const COMPREHENSIVE_PROMPT = `You are an IELTS Speaking examiner analyzing a complete Part 1 test (5 personal questions).

TRANSCRIPT ANALYSIS:
${allTranscripts.map((t, i) => `Q${i+1}: ${t.question}\nA${i+1}: ${t.answer}`).join('\n\n')}

Provide IELTS band scores and specific feedback in JSON format:
{
  "overall_score": "band score 1-9",
  "fluency_coherence": {
    "score": "1-9",
    "strengths": "specific positive aspects",
    "improvements": "specific areas to develop"
  },
  "lexical_resource": {
    "score": "1-9", 
    "strengths": "vocabulary strengths observed",
    "improvements": "vocabulary areas to develop"
  },
  "grammatical_range": {
    "score": "1-9",
    "strengths": "grammar strengths observed", 
    "improvements": "grammar areas to develop"
  },
  "pronunciation": {
    "score": "1-9",
    "strengths": "pronunciation strengths",
    "improvements": "pronunciation areas to develop"
  },
  "overall_assessment": "comprehensive summary of performance with specific examples"
}`

    let aiAssessment = null
    try {
      const assessmentResult = await model.generateContent([COMPREHENSIVE_PROMPT])
      const assessmentResponse = await assessmentResult.response
      let assessmentText = assessmentResponse.text().trim()
      
      // Clean up code blocks
      if (assessmentText.startsWith('```json')) {
        assessmentText = assessmentText.replace(/```json\s*/, '').replace(/```\s*$/, '')
      } else if (assessmentText.startsWith('```')) {
        assessmentText = assessmentText.replace(/```\s*/, '').replace(/```\s*$/, '')
      }
      
      aiAssessment = JSON.parse(assessmentText)
      console.log('✅ AI assessment generated successfully')
      
    } catch (error) {
      console.error('❌ AI assessment generation failed:', error.message)
      
      // Fallback to simple scoring
      const allAnswersShort = allTranscripts.every(t => t.answer.split(' ').length <= 2)
      const hasRelevantAnswers = allTranscripts.some(t => t.relevance && (t.relevance.toLowerCase().includes('yes') || t.relevance.toLowerCase().includes('appropriate')))
      
      let fallbackScore = "1.0"
      if (allAnswersShort && !hasRelevantAnswers) {
        fallbackScore = "1.0"
      } else if (!hasRelevantAnswers) {
        fallbackScore = "2.0"
      } else {
        fallbackScore = "3.0"
      }
      
      aiAssessment = {
        overall_score: fallbackScore,
        fluency_coherence: {
          score: fallbackScore,
          strengths: allAnswersShort ? "Attempted to respond" : "Provided responses to questions",
          improvements: "Develop longer, more detailed responses with better flow"
        },
        lexical_resource: {
          score: fallbackScore,
          strengths: "Basic vocabulary used",
          improvements: "Expand vocabulary range and use more varied expressions"
        },
        grammatical_range: {
          score: fallbackScore,
          strengths: allAnswersShort ? "Basic words used" : "Simple sentence structures",
          improvements: "Use more complex grammatical structures and sentence types"
        },
        pronunciation: {
          score: fallbackScore,
          strengths: "Audio was audible",
          improvements: "Work on clarity and natural rhythm in speech"
        },
        overall_assessment: `Part 1 analysis of ${audioFiles.length} responses. ${allAnswersShort ? 'Responses were very brief and need significant development.' : 'Responses showed basic communication but require expansion and improvement in all areas for IELTS success.'}`
      }
    }
    
    // Create analysis result using AI assessment
    const analysisResult = {
      transcript: combinedTranscript,
      individual_transcripts: allTranscripts,
      score: aiAssessment.overall_score,
      fluency_coherence: aiAssessment.fluency_coherence,
      lexical_resource: aiAssessment.lexical_resource,
      grammatical_range: aiAssessment.grammatical_range,
      pronunciation: aiAssessment.pronunciation,
      overall_assessment: aiAssessment.overall_assessment
    }
    
    // Create combined audio with 1-second beeps between recordings
    const fs = require('fs').promises
    const path = require('path')
    const ffmpeg = require('fluent-ffmpeg')
    
    const tempDir = path.join(__dirname, 'temp')
    try {
      await fs.access(tempDir)
    } catch {
      await fs.mkdir(tempDir, { recursive: true })
    }
    
    console.log(`🎵 Merging ${audioFiles.length} audio files with 1-second beeps...`)
    
    // Save all individual audio files temporarily
    const tempFiles = []
    const timestamp = Date.now()
    
    for (let i = 0; i < audioFiles.length; i++) {
      const tempFile = path.join(tempDir, `part1_temp_${timestamp}_${i}.webm`)
      await fs.writeFile(tempFile, audioFiles[i].buffer)
      tempFiles.push(tempFile)
    }
    
    // Create merged audio with beeps using FFmpeg
    const mergedPath = path.join(tempDir, `part1_merged_${timestamp}.wav`)
    
    try {
      await new Promise((resolve, reject) => {
        let command = ffmpeg()
        
        // Add all audio files
        for (let i = 0; i < tempFiles.length; i++) {
          command = command.input(tempFiles[i])
        }
        
        // Create 1-second silence generators for separators
        let filterComplex = ''
        for (let i = 0; i < tempFiles.length - 1; i++) {
          filterComplex += `anullsrc=d=1:r=44100[silence${i}];`
        }
        
        // Build concatenation inputs
        let concatInputs = ''
        for (let i = 0; i < tempFiles.length; i++) {
          concatInputs += `[${i}:a]`
          if (i < tempFiles.length - 1) {
            concatInputs += `[silence${i}]`
          }
        }
        
        // Complete filter
        filterComplex += `${concatInputs}concat=n=${tempFiles.length * 2 - 1}:v=0:a=1[out]`
        
        command
          .complexFilter(filterComplex)
          .outputOptions(['-map', '[out]'])
          .output(mergedPath)
          .on('end', () => {
            console.log('✅ Audio merging completed successfully')
            resolve()
          })
          .on('error', (err) => {
            console.error('❌ FFmpeg error:', err)
            reject(err)
          })
          .run()
      })
      
      // Clean up temporary files
      for (const tempFile of tempFiles) {
        try {
          await fs.unlink(tempFile)
        } catch (err) {
          console.warn('Warning: Could not delete temp file:', tempFile)
        }
      }
      
      analysisResult.merged_audio_url = `/temp/part1_merged_${timestamp}.wav`
      console.log(`🎧 Merged audio available at: ${analysisResult.merged_audio_url}`)
      
    } catch (ffmpegError) {
      console.error('❌ Audio merging failed, falling back to first audio only:', ffmpegError)
      
      // Fallback: save first audio file if merging fails
      const fallbackPath = path.join(tempDir, `part1_fallback_${timestamp}.webm`)
      await fs.writeFile(fallbackPath, audioFiles[0].buffer)
      analysisResult.merged_audio_url = `/temp/part1_fallback_${timestamp}.webm`
      
      // Clean up temp files
      for (const tempFile of tempFiles) {
        try {
          await fs.unlink(tempFile)
        } catch (err) {
          console.warn('Warning: Could not delete temp file:', tempFile)
        }
      }
    }
    
    res.json(analysisResult)
    
  } catch (error) {
    console.error('Error analyzing Part 1:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    })
    res.status(500).json({ 
      error: 'Error processing your answers. Please try again.',
      details: error.message 
    })
  }
})

// =============================================================================
// PART 2 DRILL ENDPOINT - CUE CARD TASK
// =============================================================================

/**
 * POST /api/analyze-part2
 * =======================
 * 
 * Handles IELTS Part 2 analysis - Individual Long Turn (Cue Card)
 * 
 * REQUEST STRUCTURE:
 * - audio: Single 2-minute audio file
 * - topic: Cue card topic
 * - points: JSON array of cue card bullet points
 * - testType: 'part2'
 * 
 * PART 2 FOCUS:
 * - Sustained speech (2 minutes continuous)
 * - Topic development and coherence
 * - Descriptive and narrative language
 * - Personal experience elaboration
 */
app.post('/api/analyze-part2', upload.single('audio'), async (req, res) => {
  
  console.log('Received Part 2 request:', {
    hasFile: !!req.file,
    fileSize: req.file?.size,
    topic: req.body?.topic,
    testType: req.body?.testType
  })
  
  try {
    // =============================================================================
    // VALIDATE PART 2 REQUEST
    // =============================================================================
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' })
    }
    
    const { topic, points, testType } = req.body
    if (!topic) {
      return res.status(400).json({ error: 'No topic provided' })
    }
    
    let parsedPoints = []
    if (points) {
      try {
        parsedPoints = JSON.parse(points)
      } catch (e) {
        console.warn('Could not parse points, continuing without them')
      }
    }
    
    // =============================================================================
    // PROCESS AUDIO FOR PART 2
    // =============================================================================
    
    const audioBase64 = req.file.buffer.toString('base64')
    
    // =============================================================================
    // CREATE PART 2 SPECIFIC PROMPT
    // =============================================================================
    
    const PART2_PROMPT = `You are an expert IELTS Speaking examiner analyzing a Part 2 (Individual Long Turn) response.

CONTEXT: This is a 2-minute sustained monologue where the candidate should speak continuously about a personal topic.

CUE CARD TOPIC: "${topic}"

CUE CARD POINTS TO COVER:
${parsedPoints.map((point, i) => `• ${point}`).join('\n')}

PART 2 EVALUATION CRITERIA:
- Sustained fluent speech for 2 minutes without significant pauses
- Clear topic development with personal examples and details
- Appropriate use of descriptive and narrative language
- Coverage of cue card points with natural elaboration
- Coherent organization from introduction to conclusion
- Rich vocabulary for describing experiences, feelings, and situations
- Complex grammatical structures for storytelling and explanation

SCORING FOCUS FOR PART 2:
- Fluency & Coherence: Ability to speak at length without noticeable effort, logical sequencing
- Lexical Resource: Range of vocabulary for description, comparison, and personal expression
- Grammatical Range: Complex structures for narration, past tenses, conditionals
- Pronunciation: Sustained clear speech with appropriate stress and intonation

Analyze the audio response and provide:

1. Complete transcript of the monologue
2. Overall Part 2 band score (0-9)
3. Assessment of whether cue card points were adequately covered
4. Individual criterion scores with specific feedback for sustained speech

Format your response as JSON:
{
  "transcript": "complete transcript of the 2-minute response",
  "score": "overall band score",
  "fluency_coherence": {
    "score": "band score",
    "strengths": "sustained speech, topic development, coherence observations",
    "improvements": "areas for better flow, organization, or elaboration"
  },
  "lexical_resource": {
    "score": "band score", 
    "strengths": "descriptive vocabulary, personal expression range",
    "improvements": "vocabulary areas for richer description or precision"
  },
  "grammatical_range": {
    "score": "band score",
    "strengths": "complex structures, tense usage, variety observed",
    "improvements": "grammatical areas for more sophisticated expression"
  },
  "pronunciation": {
    "score": "band score",
    "strengths": "sustained clarity, stress patterns, intonation",
    "improvements": "pronunciation areas for sustained speech improvement"
  },
  "overall_assessment": "Comprehensive evaluation of Part 2 performance focusing on sustained speech ability, topic coverage, and personal elaboration. Include specific recommendations for improving sustained monologue delivery."
}`

    // =============================================================================
    // SEND TO GEMINI API
    // =============================================================================
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1,        // Lower temperature for consistent scoring
        topP: 0.8,              // Focused responses
        maxOutputTokens: 1000,  // Limit output length for faster processing
      }
    })
    
    const result = await model.generateContent([
      PART2_PROMPT,
      {
        inlineData: {
          data: audioBase64,
          mimeType: req.file.mimetype
        }
      }
    ])
    
    const response = await result.response
    const text = response.text()
    
    // =============================================================================
    // PARSE RESPONSE
    // =============================================================================
    
    let analysisResult
    try {
      let cleanText = text.trim()
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '')
      }
      
      analysisResult = JSON.parse(cleanText)
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      console.log('Raw response:', text)
      
      analysisResult = {
        transcript: "Could not generate transcript",
        score: "N/A",
        overall_assessment: text || "Unable to analyze the audio at this time."
      }
    }
    
    res.json(analysisResult)
    
  } catch (error) {
    console.error('Error analyzing Part 2:', error)
    res.status(500).json({ 
      error: 'Failed to analyze Part 2 response',
      details: error.message 
    })
  }
})

// =============================================================================
// PART 3 DRILL ENDPOINT - DISCUSSION QUESTIONS
// =============================================================================

/**
 * POST /api/analyze-part3
 * =======================
 * 
 * Handles IELTS Part 3 analysis - Two-way Discussion Questions
 * 
 * REQUEST STRUCTURE:
 * - audio_0, audio_1, audio_2, audio_3, audio_4: Individual audio files
 * - questions: JSON string array of all discussion questions
 * - theme: Discussion theme/topic area
 * - testType: 'part3'
 * 
 * PART 3 FOCUS:
 * - Abstract thinking and complex argumentation
 * - Extended responses with detailed explanations
 * - Opinion justification with examples
 * - Higher-level vocabulary and grammatical structures
 * - Analytical and evaluative language
 */
app.post('/api/analyze-part3', upload.fields([
  { name: 'audio_0', maxCount: 1 },
  { name: 'audio_1', maxCount: 1 },
  { name: 'audio_2', maxCount: 1 },
  { name: 'audio_3', maxCount: 1 },
  { name: 'audio_4', maxCount: 1 }
]), async (req, res) => {
  
  console.log('Received Part 3 request:', {
    files: Object.keys(req.files || {}),
    questions: req.body?.questions,
    theme: req.body?.theme,
    testType: req.body?.testType
  })
  
  try {
    // =============================================================================
    // VALIDATE PART 3 REQUEST
    // =============================================================================
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No audio files provided' })
    }
    
    const { questions, theme, testType } = req.body
    if (!questions) {
      return res.status(400).json({ error: 'No questions provided' })
    }
    
    if (!theme) {
      return res.status(400).json({ error: 'No theme provided' })
    }
    
    let parsedQuestions
    try {
      parsedQuestions = JSON.parse(questions)
    } catch (e) {
      return res.status(400).json({ error: 'Invalid questions format' })
    }
    
    // =============================================================================
    // PROCESS AND MERGE MULTIPLE AUDIO FILES
    // =============================================================================
    
    const audioFiles = []
    const fileKeys = Object.keys(req.files).sort() // Ensure correct order
    
    // Collect all audio files in correct order
    for (const key of fileKeys) {
      const fileArray = req.files[key]
      if (fileArray && fileArray[0]) {
        const file = fileArray[0]
        audioFiles.push({
          buffer: file.buffer,
          mimetype: file.mimetype,
          questionIndex: parseInt(key.split('_')[1])
        })
      }
    }
    
    // MERGE ALL AUDIO FILES WITH BEEP SEPARATORS  
    console.log(`Processing ${audioFiles.length} audio files for Part 3 analysis...`)
    
    if (audioFiles.length === 0) {
      return res.status(400).json({ error: 'No audio files found' })
    }
    
    // Create merged audio with beep separators between files
    const mergedAudioBuffer = mergeAudioWithBeeps(audioFiles)
    const mergedAudioBase64 = mergedAudioBuffer.toString('base64')
    
    console.log(`Merged ${audioFiles.length} audio files - total size: ${mergedAudioBuffer.length} bytes`)
    console.log(`Merged Base64 size: ${mergedAudioBase64.length} characters`)
    
    // =============================================================================
    // CREATE PART 3 SPECIFIC PROMPT
    // =============================================================================
    
    const PART3_PROMPT = `You are an IELTS Speaking examiner analyzing a Part 3 discussion response.

TASK: Analyze the audio for abstract thinking, complex vocabulary, and argumentation skills.

THEME: "${theme}"

ALL DISCUSSION QUESTIONS IN THIS SESSION:
${parsedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Part 3 requires: Extended responses, abstract reasoning, sophisticated language, critical thinking.

Analyze and provide JSON response with:
1. Complete transcript
2. Band score (0-9)
3. Scores for: Fluency & Coherence, Lexical Resource, Grammatical Range, Pronunciation
4. Specific strengths and improvements for each criterion
4. Assessment of abstract thinking and argumentation ability

Format your response as JSON:
{
  "transcript": "Q1: [answer 1] Q2: [answer 2] Q3: [answer 3] Q4: [answer 4] Q5: [answer 5]",
  "individual_transcripts": [
    {"question": "Question 1 text", "answer": "Individual transcript for answer 1"},
    {"question": "Question 2 text", "answer": "Individual transcript for answer 2"},
    {"question": "Question 3 text", "answer": "Individual transcript for answer 3"},
    {"question": "Question 4 text", "answer": "Individual transcript for answer 4"},
    {"question": "Question 5 text", "answer": "Individual transcript for answer 5"}
  ],
  "score": "overall band score",
  "fluency_coherence": {
    "score": "band score",
    "strengths": "extended discourse ability, logical development, discussion flow",
    "improvements": "areas for better argumentation, organization, or elaboration"
  },
  "lexical_resource": {
    "score": "band score", 
    "strengths": "abstract vocabulary, precise expression, sophisticated language use",
    "improvements": "vocabulary areas for more nuanced or academic expression"
  },
  "grammatical_range": {
    "score": "band score",
    "strengths": "complex structures for argumentation, variety in expression",
    "improvements": "grammatical areas for more sophisticated academic discourse"
  },
  "pronunciation": {
    "score": "band score",
    "strengths": "clarity during extended responses, stress and intonation patterns",
    "improvements": "pronunciation areas for enhanced discussion delivery"
  },
  "overall_assessment": "Comprehensive evaluation of Part 3 discussion performance focusing on abstract thinking, argumentation skills, and ability to engage in sophisticated academic discourse. Include specific recommendations for improving discussion and analytical language skills."
}`

    // =============================================================================
    // SEND MERGED AUDIO TO GEMINI API
    // =============================================================================
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.1,        // Lower temperature for consistent scoring
        topP: 0.8,              // Focused responses
        maxOutputTokens: 1000,  // Limit output length for faster processing
      }
    })
    
    // Send merged audio to Gemini for analysis
    const result = await model.generateContent([
      PART3_PROMPT,
      {
        inlineData: {
          data: mergedAudioBase64,
          mimeType: audioFiles[0].mimetype || 'audio/webm'
        }
      }
    ])
    const response = await result.response
    const text = response.text()
    
    // =============================================================================
    // PARSE RESPONSE
    // =============================================================================
    
    let analysisResult
    try {
      let cleanText = text.trim()
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/```\s*/, '').replace(/```\s*$/, '')
      }
      
      analysisResult = JSON.parse(cleanText)
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      console.log('Raw response:', text)
      
      analysisResult = {
        transcript: "Could not generate transcript",
        score: "N/A",
        overall_assessment: text || "Unable to analyze the audio at this time."
      }
    }
    
    res.json(analysisResult)
    
  } catch (error) {
    console.error('Error analyzing Part 3:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    })
    res.status(500).json({ 
      error: 'Error processing your answers. Please try again.',
      details: error.message 
    })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})