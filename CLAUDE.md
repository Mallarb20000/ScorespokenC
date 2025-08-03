# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScoreSpoken is an AI-powered IELTS Speaking practice platform built with Next.js frontend and Node.js/Express backend. It uses Google Gemini AI to analyze student audio responses and provide IELTS band scores with detailed feedback.

## Commands

### Frontend Development
```bash
npm run dev        # Start Next.js development server (port 3000)
npm run build      # Build production bundle
npm run start      # Start production server
npm run lint       # Run ESLint for code quality
```

### Backend Development
```bash
cd backend
npm run dev        # Start Express server with nodemon (port 3002)
npm start          # Start production server
```

### Environment Setup
- Frontend runs on http://localhost:3000
- Backend runs on http://localhost:3002
- Create `backend/.env` with `GEMINI_API_KEY=your_api_key_here`

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Node.js, Express.js, Multer (file upload)
- **AI**: Google Gemini 1.5 Flash for audio analysis
- **Audio**: Browser MediaRecorder API for recording, WebM format

### Project Structure
```
src/app/                    # Next.js app router
├── layout.tsx             # Root layout with metadata
├── page.tsx               # Homepage with test type cards
├── quick-drill/           # Single question practice
├── part1-drill/           # Part 1 (5 personal questions)
├── part1-results/         # Part 1 results display
├── part2-drill/           # Part 2 (cue card task)
├── part3-drill/           # Part 3 (discussion questions)
└── globals.css            # Global styles

backend/
├── server.js              # Express server with all endpoints
├── temp/                  # Temporary audio file storage
└── package.json           # Backend dependencies
```

### Core Data Flow
1. **Audio Capture**: Browser MediaRecorder → WebM Blob → FormData
2. **HTTP Upload**: FormData → Backend multer middleware → req.file
3. **AI Processing**: Audio → Base64 → Gemini API → JSON response
4. **Results Display**: Parsed JSON → React state → UI components

### API Endpoints
- `POST /api/analyze-answer` - Single question analysis
- `POST /api/analyze-part1` - Part 1 (5 questions) analysis
- `POST /api/analyze-part2` - Part 2 cue card analysis
- `POST /api/analyze-part3` - Part 3 discussion analysis
- `GET /health` - Backend health check

## Key Implementation Details

### Audio Recording Architecture
- **Voice-Activated Mode**: Uses Web Audio API for voice detection
- **Push-to-Talk Mode**: Spacebar-based recording control
- **Noise Detection**: Automatic environment analysis to recommend recording mode
- **Multi-Question Support**: Sequential recording with automatic advancement

### AI Integration
- **Model**: Google Gemini 1.5 Flash for speed and cost efficiency
- **Input Format**: Base64-encoded WebM audio + structured prompts
- **Output**: JSON with IELTS band scores (0-9) for all 4 criteria
- **Error Handling**: Markdown cleanup, JSON parsing fallbacks

### Audio Processing Features
- **Beep Insertion**: 2-second separators between multiple recordings
- **File Merging**: Combines multiple WebM files for batch analysis
- **Temporary Storage**: Files saved in `backend/temp/` for playback

### Frontend Components
- **CriteriaCard**: Reusable component for displaying IELTS criterion scores
- **Conditional Rendering**: Different UI flows for voice vs push-to-talk modes
- **State Management**: React hooks for recording, processing, and results states

## Testing and Development

### Audio Testing
- Use quiet environment for voice-activated mode testing
- Test push-to-talk mode with spacebar controls
- Verify audio playback works after recording

### AI Response Testing
- Check JSON parsing handles markdown-wrapped responses
- Verify all IELTS criteria are returned with scores and feedback
- Test error handling for malformed AI responses

### Multi-Part Test Flow
- Part 1: 5 personal questions, individual recording, batch analysis
- Part 2: Single cue card with preparation time and 2-minute recording
- Part 3: 5 discussion questions focusing on abstract thinking

## File Formats and Storage

### Audio Handling
- **Recording Format**: WebM (browser default)
- **Storage**: Memory-based (Multer memoryStorage) - not production-scalable
- **Playback**: Object URLs for immediate browser playback
- **AI Processing**: Base64 encoding for Gemini API

### Result Storage
- **Current**: URL parameters for results page (temporary)
- **Future**: Database storage for user history and progress tracking

## Error Handling Patterns

### Frontend
- Microphone permission errors
- Recording device unavailable
- Network request failures
- Audio playback issues

### Backend
- File upload validation (presence, size, type)
- Gemini API timeouts and rate limits
- JSON parsing errors from AI responses
- Audio processing failures

## Performance Considerations

### Current Bottlenecks
- **AI Processing**: 3-8 seconds per request
- **Memory Storage**: Not scalable for concurrent users
- **No Caching**: Repeated API calls for similar audio

### Optimization Opportunities
- Implement Redis caching for AI responses
- Move to persistent file storage (S3/Firebase)
- Add background processing queues
- Optimize Gemini prompts for faster responses

## Security & Best Practices

### Environment Variables
- Store API keys in `.env` files, never in code
- Use separate keys for development and production

### Audio Data Handling
- Clean up temporary files to prevent disk space issues
- Validate file sizes to prevent large uploads
- Sanitize user inputs before AI processing

### API Security
- CORS properly configured for frontend-backend communication
- Input validation on all endpoints
- Rate limiting should be implemented for production

## Future Development Areas

### Planned Features
- User authentication and progress tracking
- Full mock test (all 3 parts in sequence)
- Dashboard with score history and trends
- Firebase integration for user data persistence

### Technical Improvements
- WebSocket real-time feedback during recording
- Better audio codec handling (FLAC for smaller files)
- Database schema for user sessions and test history
- Mobile-responsive design improvements

## Common Issues and Solutions

### Audio Recording Problems
- **No sound detected**: Check microphone permissions and noise levels
- **Voice mode not working**: Try push-to-talk mode or adjust noise threshold
- **Recording stops unexpectedly**: Check for 3-second silence timeout in voice mode

### Backend Issues
- **Server not starting**: Verify `GEMINI_API_KEY` is set in `backend/.env`
- **File upload fails**: Check CORS configuration and request size limits
- **AI responses malformed**: Check Gemini API quota and error responses

### Development Setup
- **Port conflicts**: Ensure frontend (3000) and backend (3002) ports are available
- **Module not found**: Run `npm install` in both root and backend directories
- **TypeScript errors**: Check interface definitions match actual API responses