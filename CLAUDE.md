# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ScoreSpoken is an AI-powered IELTS Speaking practice platform built with Next.js frontend and Node.js/Express backend. It uses Google Gemini AI to analyze student audio responses and provide IELTS band scores with detailed feedback.

## Design Principles

### 1. **Single Source of Truth (SSOT)**
- One component handles each major concern (TestInterface for all tests, UnifiedResults for all results)
- One service per domain (AudioService, TTSService, SubmissionService)
- One configuration file per entity type (testTypes.ts for all test configs)
- One cleanup system (globalCleanup.ts) for all resource management

### 2. **Configuration-Driven Architecture**
- Components receive behavior through configuration objects, not hardcoded logic
- Test types defined as data, not separate components
- URL routing patterns defined in config, not scattered throughout code
- Question banks centralized in configuration files

### 3. **Composition Over Inheritance**
- Small, focused components that can be combined
- Services that can be injected and swapped
- Hooks that encapsulate complex logic and can be reused
- Utility functions that solve specific problems

### 4. **Centralized Resource Management**
- All cleanup operations go through single cleanup system
- Audio resources managed by dedicated service
- State management centralized in reducers
- Error handling patterns standardized across components

### 5. **Predictable State Transitions**
- Reducer pattern for complex state management
- Clear action types and payload structures
- Derived state computed from single source
- Side effects isolated in services

### 6. **Progressive Enhancement**
- Core functionality works without JavaScript enhancements
- Keyboard shortcuts enhance but don't replace basic functionality
- Mobile and desktop experiences use same components
- Graceful degradation for unsupported features

### 7. **Zero Code Duplication Policy**
- Before writing any code, search for existing solutions
- Extend existing components rather than creating new ones
- Share logic through services, hooks, and utilities
- Remove duplicate code immediately when found

### 8. **Type-Safe Configuration**
- All configurations backed by TypeScript interfaces
- Compile-time validation of configurations
- IntelliSense support for all configuration options
- Runtime validation for critical paths

### 9. **Minimal API Surface**
- Each service exposes minimal, focused public API
- Components accept minimal required props
- Clear separation between public and private methods
- Consistent naming conventions across all modules

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
- **AI**: Google Gemini 2.5 Flash lite for audio analysis
- **Audio**: Browser MediaRecorder API for recording, WebM format

### Project Structure (UNIFIED ARCHITECTURE - 2024)
```
src/
├── app/                          # Next.js app router
│   ├── layout.tsx               # Root layout with global cleanup
│   ├── page.tsx                 # Homepage with test type cards
│   ├── quick-drill/             # Quick practice test page
│   ├── part1-drill/             # Part 1 personal questions test page  
│   ├── part2-drill/             # Part 2 cue card test page
│   ├── part3-drill/             # Part 3 discussion test page
│   └── results/                 # SINGLE universal results page
├── lib/                         # REUSABLE CORE LIBRARY
│   ├── types/                   # Comprehensive TypeScript definitions
│   ├── config/testTypes.ts      # ALL test configurations & question banks
│   ├── state/testReducer.ts     # Centralized state management
│   ├── services/                # Business logic services
│   │   ├── AudioService.ts      # Audio recording, playback, beep generation
│   │   ├── TTSService.ts        # Text-to-speech functionality
│   │   └── SubmissionService.ts # API submissions with retry logic
│   ├── hooks/useTestFlow.ts     # Master hook for all test logic
│   └── utils/globalCleanup.ts   # SINGLE cleanup system
├── components/
│   ├── CriteriaCard.tsx         # IELTS scoring display component
│   └── shared/                  # UNIVERSAL COMPONENTS
│       ├── TestInterface.tsx    # Handles ALL test types via config
│       ├── UnifiedResults.tsx   # Handles ALL result displays
│       ├── RecordingControls.tsx
│       ├── SubmissionPanel.tsx
│       └── index.ts             # Barrel exports
└── globals.css                  # Global styles

backend/                         # Express server (unchanged)
├── server.js
├── temp/
└── package.json
```

### Architecture Pattern: Universal Components + Configuration
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Test Config   │───▶│  TestInterface   │───▶│ UnifiedResults  │
│                 │    │  (Universal)     │    │  (Universal)    │
├─────────────────┤    └──────────────────┘    └─────────────────┘
│ quickDrillConfig│           │                          │
│ part1Config     │           ▼                          ▼
│ part2Config     │    ┌──────────────────┐    ┌─────────────────┐
│ part3Config     │    │   useTestFlow    │    │   URL Params    │
└─────────────────┘    │   (Master Hook)  │    │ /results?type=  │
                       └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    Services      │
                    │ Audio │ TTS │Sub │
                    └──────────────────┘
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

## Architectural Achievements (2024 Refactoring)

### Code Volume Reduction
- **Before**: 4,200+ lines across duplicated components
- **After**: ~200 lines total for all test functionality
- **Reduction**: 95% decrease in codebase size
- **Duplication**: Eliminated 100% of code duplication

### Component Consolidation
- **Before**: 4 separate 1,400+ line test components + 3 separate result components
- **After**: 1 universal TestInterface + 1 universal UnifiedResults
- **Benefits**: Single source of truth, consistent UX, easier maintenance

### State Management Evolution
- **Before**: 20+ useState calls per component, scattered state logic
- **After**: Centralized reducer pattern with predictable state transitions
- **Benefits**: Debuggable state, time-travel debugging, predictable updates

### Resource Management
- **Before**: Duplicate cleanup code in each component, memory leaks on navigation
- **After**: Single cleanup system with automatic navigation detection
- **Benefits**: No resource leaks, centralized cleanup logic, better performance

### Configuration-Driven Design
- **Before**: Hardcoded behavior in each component
- **After**: Data-driven components with configuration objects
- **Benefits**: Easy to add new test types, behavior changes through config

### URL Structure Simplification
- **Before**: `/part1-results`, `/part2-results`, `/quick-drill-results`, etc.
- **After**: Single `/results?type=part1` pattern
- **Benefits**: Consistent URL patterns, easier routing logic, single results page

### Development Workflow Improvements
- **Before**: Changes required updating 4+ files, high risk of inconsistency
- **After**: Changes in single component affect all test types consistently  
- **Benefits**: Faster development, lower bug risk, easier testing

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

# CRITICAL CODE REUSE MANDATE

## BEFORE WRITING ANY NEW CODE:
1. **SEARCH FIRST**: Use Grep/Glob to find existing similar functionality
2. **CHECK src/lib/**: Look for existing services, hooks, utilities
3. **CHECK src/components/shared/**: Look for existing reusable components
4. **ONLY CREATE NEW**: If absolutely no existing solution can be found/extended

## EXISTING REUSABLE SYSTEMS (USE THESE FIRST):

### Core Services (src/lib/services/)
- **AudioService**: All audio recording, playback, beep generation
- **TTSService**: All text-to-speech functionality
- **SubmissionService**: All API submissions with retry logic

### Custom Hooks (src/lib/hooks/)
- **useTestFlow**: Complete test state management (replaces 20+ useState calls)
- **useKeyboardShortcuts**: All keyboard navigation and shortcuts

### Utilities (src/lib/utils/)
- **globalCleanup.ts**: SINGLE SOURCE OF TRUTH for ALL cleanup operations
  - cleanupAllResources() - use this, never create duplicate cleanup

### Shared Components (src/components/shared/)
- **TestInterface**: Universal test component (handles all test types via config)
- **UnifiedResults**: Universal results display (handles all result types)
- **RecordingControls**: Audio recording UI with all modes
- **SubmissionPanel**: Navigation and submission controls

### Configurations (src/lib/config/)
- **testTypes.ts**: All test configurations, question banks, API endpoints

## DUPLICATION PREVENTION RULES:
❌ **NEVER create multiple cleanup functions** → Use cleanupAllResources()
❌ **NEVER duplicate audio/TTS logic** → Use existing services
❌ **NEVER create component-specific versions** → Extend shared components
❌ **NEVER create parallel systems** → Extend existing architecture

## CODE REUSE WORKFLOW:
1. Identify what you need to build
2. Search existing codebase with Grep/Glob
3. Check if existing services/components can be extended
4. If creating new code, make it reusable and place in shared locations
5. Update this documentation with new reusable systems