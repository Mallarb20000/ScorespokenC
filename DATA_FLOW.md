# 📊 ScoreSpoken Data Flow Documentation

## Overview
This document provides a comprehensive breakdown of how data flows through the ScoreSpoken IELTS Speaking Practice Platform, from user interaction to AI analysis and result display.

---

## 🔄 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SCORESPOKEN DATA FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

🎯 USER INTERACTION LAYER
┌─────────────────┐
│   User clicks   │
│ "Start Record"  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser asks   │────▶│ User grants mic  │────▶│ MediaRecorder   │
│ for mic access  │     │    permission    │     │    starts       │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                           │
🎙️ AUDIO CAPTURE LAYER                                     ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Audio chunks    │◀────│ MediaRecorder    │────▶│ Chunks stored   │
│ collected in    │     │ ondataavailable  │     │ in chunksRef    │
│ real-time       │     │ event fires      │     │ array           │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
          │                                                │
          ▼                                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User clicks     │────▶│ MediaRecorder    │────▶│ All chunks      │
│ "Stop Record"   │     │ .stop() called   │     │ combined into   │
└─────────────────┘     └──────────────────┘     │ single Blob     │
                                                 └─────────┬───────┘
💾 DATA PROCESSING LAYER                                   │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ audioBlob state │◀────│ URL.createObject │◀────│ Blob created    │
│ updated         │     │ URL() creates    │     │ (audio/webm)    │
│                 │     │ playback URL     │     │                 │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
          │                       │                        │
          ▼                       ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ UI shows Submit │     │ audioUrl state   │     │ Audio ready for │
│ button + Record │     │ updated for      │     │ backend upload  │
│ Again option    │     │ <audio> element  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
          │                                                │
          ▼                                                ▼
🌐 HTTP REQUEST LAYER                              
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User clicks     │────▶│ submitAnswer()   │────▶│ FormData object │
│ "Submit Answer" │     │ function called  │     │ created with:   │
└─────────────────┘     └──────────────────┘     │ - audioBlob     │
                                                 │ - question text │
                                                 └─────────┬───────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ setIsProcessing │◀────│ fetch() API call │◀────│ HTTP POST to    │
│ (true) - shows  │     │ to backend with  │     │ /api/analyze-   │
│ loading state   │     │ FormData payload │     │ answer endpoint │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                           │
⚙️ BACKEND PROCESSING LAYER                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Express server  │◀────│ CORS middleware  │◀────│ Request hits    │
│ receives POST   │     │ allows cross-    │     │ Express server  │
│ request         │     │ origin request   │     │ on port 3002    │
└─────────┬───────┘     └──────────────────┘     └─────────────────┘
          │
          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Multer middle-  │────▶│ File extracted   │────▶│ Request body    │
│ ware processes  │     │ from FormData    │     │ parsed for      │
│ multipart data  │     │ into req.file    │     │ question text   │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Input validation│────▶│ Audio converted  │────▶│ Gemini AI model │
│ ensures file    │     │ to base64 string │     │ initialized     │
│ and question    │     │ for AI API       │     │ (gemini-1.5-    │
│ are present     │     │                  │     │ flash)          │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                           │
🤖 AI PROCESSING LAYER                                     ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ IELTS prompt    │────▶│ AI request sent  │────▶│ Gemini analyzes │
│ template filled │     │ with prompt +    │     │ audio against   │
│ with question   │     │ base64 audio     │     │ IELTS criteria  │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ JSON parsing    │◀────│ Markdown cleanup │◀────│ AI returns      │
│ converts string │     │ removes ```json  │     │ structured JSON │
│ to JavaScript   │     │ code blocks      │     │ with scores     │
│ object          │     │                  │     │                 │
└─────────┬───────┘     └──────────────────┘     └─────────────────┘
          │
📤 RESPONSE LAYER                              
          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ res.json()      │────▶│ HTTP response    │────▶│ Frontend        │
│ sends structured│     │ sent back to     │     │ receives data   │
│ IELTS results   │     │ frontend         │     │ via fetch()     │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                           │
🎨 UI RENDERING LAYER                                      ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ setResult(data) │────▶│ React state      │────▶│ Component       │
│ updates state   │     │ change triggers  │     │ re-renders with │
│ with AI results │     │ re-render        │     │ results UI      │
└─────────────────┘     └──────────────────┘     └─────────┬───────┘
                                                           │
                                                           ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ CriteriaCard    │     │ Audio playback   │     │ Overall score   │
│ components      │────▶│ component shows  │────▶│ displayed in    │
│ show individual │     │ recorded audio   │     │ prominent card  │
│ IELTS scores    │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 🔍 Detailed Flow Analysis

### 1. User Interaction & Permission Layer

**Trigger**: User clicks "Start Recording" button
**Process**:
- React component calls `startRecording()` function
- Browser requests microphone permissions via `navigator.mediaDevices.getUserMedia()`
- User grants/denies permission via browser dialog

**Data State Changes**:
```typescript
// Before: Initial state
isRecording: false
audioBlob: null
audioUrl: null

// After permission granted:
isRecording: true
// MediaRecorder instance created and stored in ref
```

**Key Technologies**:
- React useState hooks for state management
- Browser MediaDevices API for hardware access
- Promise-based async/await pattern

---

### 2. Audio Capture & Processing Layer

**Real-time Data Collection**:
```typescript
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    chunksRef.current.push(event.data) // Accumulate audio chunks
  }
}
```

**Data Transformation on Stop**:
```typescript
mediaRecorder.onstop = () => {
  // Combine all chunks into single Blob
  const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
  
  // Create browser-playable URL
  const audioUrl = URL.createObjectURL(audioBlob)
  
  // Update React state
  setAudioBlob(audioBlob)    // For backend upload
  setAudioUrl(audioUrl)      // For UI audio player
}
```

**Data Flow**:
- Audio streams → MediaRecorder chunks → Blob → Object URL
- Binary audio data preserved throughout pipeline

---

### 3. HTTP Request Layer

**FormData Construction**:
```typescript
const formData = new FormData()
formData.append('audio', audioBlob, 'recording.webm') // Binary file
formData.append('question', question)                 // Text data
```

**Network Request**:
```typescript
const response = await fetch('http://localhost:3002/api/analyze-answer', {
  method: 'POST',
  body: formData,  // Multipart/form-data automatically set
})
```

**Data Transformation**:
- Binary Blob → FormData → HTTP multipart request → Backend reception

---

### 4. Backend Processing Layer

**Middleware Pipeline**:
1. **CORS Middleware**: Validates cross-origin request
2. **Multer Middleware**: Parses multipart data, extracts file
3. **Route Handler**: Processes file and question

**Data Extraction**:
```javascript
// File accessible via Multer
const audioBuffer = req.file.buffer     // Binary audio data
const fileName = req.file.originalname  // 'recording.webm'
const mimeType = req.file.mimetype     // 'audio/webm'

// Question accessible via body parser
const { question } = req.body          // Text string
```

**Base64 Conversion**:
```javascript
const audioBase64 = req.file.buffer.toString('base64')
// Binary → Base64 string for AI API
```

---

### 5. AI Processing Layer

**Request Structure to Gemini**:
```javascript
const result = await model.generateContent([
  prompt,                    // IELTS evaluation instructions
  {
    inlineData: {
      data: audioBase64,      // Base64 encoded audio
      mimeType: 'audio/webm'  // Format specification
    }
  }
])
```

**AI Response Processing**:
```javascript
// Raw response often wrapped in markdown
const text = response.text() // "```json\n{...}\n```"

// Clean markdown formatting
let cleanText = text.replace(/```json\s*/, '').replace(/```\s*$/, '')

// Parse to JavaScript object
const analysisResult = JSON.parse(cleanText)
```

**Data Structure Returned**:
```json
{
  "transcript": "User's spoken words...",
  "score": "6.5",
  "fluency_coherence": {
    "score": "6",
    "strengths": "Good flow and connection...",
    "improvements": "Work on reducing hesitation..."
  },
  "lexical_resource": { "score": "7", ... },
  "grammatical_range": { "score": "6", ... },
  "pronunciation": { "score": "7", ... },
  "overall_assessment": "Strong performance with..."
}
```

---

### 6. Response & UI Rendering Layer

**Backend Response**:
```javascript
res.json(analysisResult) // Send structured JSON to frontend
```

**Frontend State Update**:
```typescript
const data = await response.json()
setResult(data) // Triggers React re-render
```

**UI Component Rendering**:
```typescript
// Conditional rendering based on result state
{result && (
  <div>
    {/* Audio playback component */}
    <audio src={audioUrl} controls />
    
    {/* Score display */}
    <div>Overall Score: {result.score}</div>
    
    {/* Individual criteria cards */}
    {result.fluency_coherence && (
      <CriteriaCard
        title="Fluency & Coherence"
        score={result.fluency_coherence.score}
        strengths={result.fluency_coherence.strengths}
        improvements={result.fluency_coherence.improvements}
      />
    )}
  </div>
)}
```

---

## 🚀 Data Flow Optimization Opportunities

### Current Architecture Strengths:
- ✅ Clean separation of concerns
- ✅ Proper error handling at each layer
- ✅ Type safety with TypeScript interfaces
- ✅ Responsive UI with loading states

### Areas for Improvement:
1. **Caching Layer**: Add Redis for frequently requested analyses
2. **File Storage**: Move from memory to persistent storage (S3/Firebase)
3. **Data Validation**: Add schema validation for AI responses
4. **Rate Limiting**: Prevent API abuse and cost control
5. **Offline Support**: Cache results for offline viewing

### Future Data Flow Enhancements:
1. **User Authentication**: Add user sessions and data persistence
2. **Test History**: Store and retrieve past results
3. **Analytics Pipeline**: Track performance trends over time
4. **Real-time Updates**: WebSocket connections for live feedback

---

## 🛠️ Technologies & APIs Used

### Frontend Data Flow:
- **React State**: `useState`, `useRef` for component state
- **Browser APIs**: MediaRecorder, getUserMedia, Blob, URL APIs
- **HTTP Client**: Fetch API with FormData for file uploads
- **TypeScript**: Interface definitions for type safety

### Backend Data Flow:
- **Express.js**: Routing and middleware pipeline
- **Multer**: Multipart form data parsing
- **Google Gemini**: AI processing API
- **Node.js**: Buffer handling for binary data

### Data Formats:
- **Audio**: WebM → Base64 → AI Analysis
- **HTTP**: FormData → JSON responses
- **State**: JavaScript objects → React components

---

## 📊 Performance Metrics

### Current Data Flow Performance:
- **Audio Recording**: Real-time, no noticeable latency
- **File Upload**: ~38KB average, <1 second transfer
- **AI Processing**: 3-8 seconds (depends on audio length)
- **UI Rendering**: Instant (React state updates)

### Bottlenecks Identified:
1. **AI API Latency**: 3-8 seconds for processing
2. **Memory Storage**: Not scalable for multiple users
3. **No Caching**: Repeated requests to AI API

### Optimization Targets:
- Reduce AI processing time through prompt optimization
- Implement result caching for identical audio
- Add background processing for better UX

---

*Last Updated: January 2025*
*This document should be updated as the architecture evolves*