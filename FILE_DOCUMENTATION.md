# ScoreSpoken Project File Documentation

This document provides a comprehensive overview of every file in the ScoreSpoken project, explaining their purpose, functionality, and relationships.

## 📁 Project Structure Overview

```
CCSS/
├── 📄 Configuration Files
├── 📁 src/                    # Frontend source code (Next.js)
├── 📁 backend/                # Backend server (Node.js/Express)
├── 📁 node_modules/           # Frontend dependencies
└── 📄 Documentation Files
```

---

## 🏠 Root Directory Files

### Configuration Files

#### `package.json`
- **Purpose**: Frontend dependency management and scripts
- **Contains**: 
  - Next.js 14, React 18, TypeScript dependencies
  - Development scripts (`dev`, `build`, `start`, `lint`)
  - ESLint configuration for code quality
- **Key Dependencies**: `next`, `react`, `react-dom`, `typescript`

#### `package-lock.json`
- **Purpose**: Locks exact versions of frontend dependencies
- **Auto-generated**: Updated when dependencies change
- **Ensures**: Consistent installs across environments

#### `tsconfig.json`
- **Purpose**: TypeScript compiler configuration
- **Configures**: 
  - Compilation options for Next.js
  - Path aliases and module resolution
  - Strict type checking rules
- **Includes**: JSX support, ES2017 target, strict mode

#### `next.config.js`
- **Purpose**: Next.js framework configuration
- **Configures**: Build settings, routing, optimizations
- **Current**: Basic configuration (expandable for custom settings)

#### `next-env.d.ts`
- **Purpose**: TypeScript definitions for Next.js
- **Auto-generated**: Provides type safety for Next.js features
- **Do not edit**: Managed by Next.js

#### `tsconfig.tsbuildinfo`
- **Purpose**: TypeScript incremental compilation cache
- **Auto-generated**: Speeds up subsequent compilations
- **Should be**: Ignored in version control

### Documentation Files

#### `README.md`
- **Purpose**: Project overview and getting started guide
- **Contains**: Setup instructions, architecture overview, usage examples
- **Target audience**: Developers and contributors

#### `CLAUDE.md`
- **Purpose**: Instructions for Claude Code AI assistant
- **Contains**: 
  - Project overview and tech stack
  - Development commands and environment setup
  - Architecture details and best practices
  - Common issues and solutions
- **Usage**: Guides AI assistant when working with codebase

#### `DATA_FLOW.md`
- **Purpose**: Detailed explanation of data flow through the application
- **Contains**: Step-by-step process from audio recording to AI analysis
- **Useful for**: Understanding system architecture

#### `LEARNING_PLAN.md`
- **Purpose**: Educational roadmap for the project
- **Contains**: Learning objectives and skill development goals
- **Target**: Students and developers learning from the project

#### `SKILLS_LEARNED.md`
- **Purpose**: Documentation of skills and technologies demonstrated
- **Contains**: Technical skills, tools, and concepts covered
- **Useful for**: Portfolio and educational purposes

#### `progress.md`
- **Purpose**: Development progress tracking
- **Contains**: Completed features, current status, next steps
- **Maintained**: Throughout development lifecycle

---

## 🎨 Frontend (`src/` Directory)

### Application Root (`src/app/`)

#### `layout.tsx`
- **Purpose**: Root layout component for entire application
- **Responsibilities**:
  - Global HTML structure (`<html>`, `<head>`, `<body>`)
  - Metadata configuration (title, description, viewport)
  - Global CSS imports
  - Font configuration (Inter font family)
- **Applied to**: All pages in the application
- **Next.js feature**: App Router layout system

#### `page.tsx`
- **Purpose**: Homepage component (`/` route)
- **Functionality**:
  - Welcome message and project introduction
  - Navigation cards for different test types
  - Links to Quick Drill, Part 1, Part 2, Part 3 tests
- **UI Elements**: Interactive cards with hover effects and icons
- **Role**: Main entry point for users

#### `globals.css`
- **Purpose**: Global CSS styles for entire application
- **Contains**:
  - CSS variables for consistent theming
  - Global component styles (`.container`, `.card`, `.btn`)
  - Responsive design breakpoints
  - Animation and transition definitions
- **Methodology**: Utility-first approach with reusable classes

### Page Components (`src/app/*/page.tsx`)

#### `quick-drill/page.tsx`
- **Purpose**: Single question practice component
- **Functionality**:
  - Individual IELTS question practice
  - Push-to-talk audio recording (spacebar)
  - Auto-submit functionality with toggle
  - Real-time AI analysis and scoring
- **Features**: 
  - Voice activity detection
  - Instant feedback with IELTS criteria scores
  - Audio playback and re-recording options
- **Target**: Quick practice sessions

#### `part1-drill/page.tsx`
- **Purpose**: IELTS Part 1 (Personal Questions) practice
- **Functionality**:
  - 5 sequential personal questions
  - Individual recording per question
  - Auto-advance between questions
  - Batch submission and comprehensive analysis
- **Features**:
  - Progress tracking (question X of 5)
  - Auto-submit toggle with smart navigation
  - Push-to-talk recording mode
- **Analysis**: All 5 responses analyzed together for Part 1 scoring

#### `part1-results/page.tsx`
- **Purpose**: Display comprehensive Part 1 test results
- **Functionality**:
  - Parse results from URL parameters
  - Display individual question transcripts
  - Show IELTS band scores for all 4 criteria
  - Audio playback for all recorded answers
- **Features**:
  - Detailed feedback per IELTS criterion
  - Overall assessment and recommendations
  - Navigation back to practice or home

#### `part2-drill/page.tsx`
- **Purpose**: IELTS Part 2 (Cue Card) practice
- **Functionality**:
  - Cue card topic presentation
  - Preparation time (1 minute)
  - 2-minute speaking recording
  - Structured response analysis
- **Features**:
  - Timer display for preparation and speaking phases
  - Cue card format with bullet points
  - Part 2 specific scoring criteria
- **Challenge**: Longer-form speaking assessment

#### `part3-drill/page.tsx`
- **Purpose**: IELTS Part 3 (Discussion) practice
- **Functionality**:
  - Abstract discussion questions
  - Complex topic exploration
  - Advanced vocabulary and grammar focus
- **Features**:
  - Higher-level thinking questions
  - Extended response requirements
  - Advanced IELTS scoring focus
- **Target**: Band 7+ candidates

### Shared Components (`src/components/`)

#### `ResultsDisplay.tsx`
- **Purpose**: Reusable component for displaying IELTS test results
- **Props**: 
  - `transcript`, `score`, `audioUrl`
  - Individual criterion scores and feedback
  - `testType` for conditional rendering
- **Features**:
  - Responsive criteria cards
  - Audio playback controls
  - Consistent styling across test types
- **Used by**: All drill result pages

#### `CriteriaCard.tsx`
- **Purpose**: Individual IELTS criterion display component
- **Props**: 
  - `title`, `icon`, `score`
  - `strengths`, `improvements`
  - `gradient`, `shadowColor` for theming
- **Features**:
  - Visual score display with gradient backgrounds
  - Strengths and improvements sections
  - Consistent card design pattern
- **Represents**: Fluency, Lexical Resource, Grammar, Pronunciation

### App Components (`src/app/components/`)

#### `Navbar.tsx`
- **Purpose**: Global navigation component
- **Functionality**:
  - Site-wide navigation links
  - Branding and logo display
  - Responsive mobile menu
- **Features**: 
  - Active page highlighting
  - Mobile-friendly hamburger menu
  - Consistent header across all pages
- **Note**: Currently prepared but not actively used in layout

### Styling (`src/app/styles/`)

#### `theme.css`
- **Purpose**: Extended theme definitions and custom styles
- **Contains**:
  - Advanced color schemes
  - Component-specific styling
  - Animation keyframes
  - Custom utility classes
- **Complements**: `globals.css` with additional theme options

---

## 🔧 Backend (`backend/` Directory)

### Core Server Files

#### `server.js`
- **Purpose**: Main Express.js server application
- **Responsibilities**:
  - HTTP server setup and routing
  - CORS configuration for frontend communication
  - File upload handling with Multer
  - Google Gemini AI integration
  - Audio processing and analysis
- **Endpoints**:
  - `POST /api/analyze-answer` - Single question analysis
  - `POST /api/analyze-part1` - Part 1 (5 questions) analysis
  - `POST /api/analyze-part2` - Part 2 cue card analysis
  - `POST /api/analyze-part3` - Part 3 discussion analysis
  - `GET /health` - Health check endpoint
- **Key Features**:
  - Audio file merging with beep separators
  - Base64 encoding for AI processing
  - Structured IELTS scoring prompts
  - Error handling and logging

#### `package.json`
- **Purpose**: Backend dependency management
- **Contains**:
  - Express.js server dependencies
  - File upload and processing libraries
  - Google Gemini AI client
  - Development tools (nodemon)
- **Key Dependencies**: 
  - `express` - Web server framework
  - `multer` - File upload middleware
  - `@google/generative-ai` - Gemini AI client
  - `cors` - Cross-origin request handling

#### `package-lock.json`
- **Purpose**: Backend dependency version locking
- **Ensures**: Consistent server environment across deployments

#### `listModels.js`
- **Purpose**: Utility script for exploring available Gemini AI models
- **Functionality**:
  - Lists all available Gemini models
  - Shows model capabilities and limitations
  - Helps with model selection for different use cases
- **Usage**: Development and testing tool

### Data Storage (`backend/temp/`)

#### Audio Files (`*.webm`, `*.wav`)
- **Purpose**: Temporary storage for uploaded and processed audio files
- **Types**:
  - `part1_q1_*.webm` - Individual question recordings
  - `part1_merged_*.wav` - Combined audio files with beeps
  - `part1_fallback_*.webm` - Fallback recordings
- **Lifecycle**: Created during processing, should be cleaned up periodically
- **Note**: Not production-scalable (memory-based storage)

#### Special Files
- `nul` - System file (Windows), safe to ignore

---

## 🔧 Configuration & Build Files

### TypeScript Configuration
- **`tsconfig.json`**: Main TypeScript configuration with Next.js optimizations
- **`next-env.d.ts`**: Auto-generated Next.js type definitions

### Package Management
- **`package.json`** (root): Frontend dependencies and scripts
- **`package-lock.json`** (root): Frontend dependency locks
- **`backend/package.json`**: Backend dependencies
- **`backend/package-lock.json`**: Backend dependency locks

### Next.js Configuration
- **`next.config.js`**: Next.js build and runtime configuration
- **`tsconfig.tsbuildinfo`**: TypeScript incremental build cache

---

## 🗂️ Dependencies (`node_modules/`)

### Frontend Dependencies
The `node_modules/` directory contains all frontend dependencies managed by npm. Key categories include:

#### Core Framework
- **Next.js**: React framework with SSR, routing, and build tools
- **React**: UI library with hooks and component system
- **TypeScript**: Type-safe JavaScript with compile-time checking

#### Development Tools
- **ESLint**: Code linting and style enforcement
- **PostCSS**: CSS processing and optimization
- **Various utilities**: Path handling, file processing, etc.

#### Type Definitions
- **@types/***: TypeScript definitions for JavaScript libraries
- **React types**: Type safety for React components and hooks

---

## 📊 File Relationships and Data Flow

### Frontend Flow
1. **Entry Point**: `src/app/layout.tsx` provides global structure
2. **Routing**: Next.js App Router automatically routes based on folder structure
3. **Pages**: Each `page.tsx` represents a unique route (`/`, `/quick-drill`, etc.)
4. **Components**: Shared components in `src/components/` used across pages
5. **Styling**: `globals.css` provides global styles, inline styles for components

### Backend Flow
1. **Server**: `backend/server.js` handles all HTTP requests
2. **Upload**: Multer middleware processes audio file uploads
3. **Processing**: Audio files merged, converted, and sent to Gemini AI
4. **Analysis**: AI returns structured IELTS scores and feedback
5. **Response**: JSON results sent back to frontend
6. **Storage**: Temporary files stored in `backend/temp/`

### Integration Points
- **API Calls**: Frontend calls backend endpoints at `localhost:3002`
- **File Upload**: FormData with audio blobs sent via POST requests
- **Results**: JSON responses parsed and displayed in React components
- **Audio Playback**: Temporary URLs created for audio file playback

---

## 🚀 Development Workflow

### Frontend Development
1. Edit files in `src/` directory
2. Run `npm run dev` to start development server
3. Next.js hot-reloads changes automatically
4. TypeScript compilation happens in real-time

### Backend Development
1. Edit `backend/server.js` or related files
2. Run `cd backend && npm run dev` to start with nodemon
3. Server automatically restarts on file changes
4. Test endpoints using frontend or API client

### Full Stack Development
1. Start both frontend (`npm run dev`) and backend (`cd backend && npm run dev`)
2. Frontend on `localhost:3000`, backend on `localhost:3002`
3. CORS configured to allow cross-origin requests
4. Real-time development with hot reloading on both ends

---

## 📝 Key Files to Understand

### For Frontend Development
1. **`src/app/layout.tsx`** - Global app structure
2. **`src/app/page.tsx`** - Homepage and navigation
3. **`src/app/quick-drill/page.tsx`** - Core recording functionality
4. **`src/components/ResultsDisplay.tsx`** - Results presentation
5. **`src/app/globals.css`** - Styling system

### For Backend Development
1. **`backend/server.js`** - All server logic and API endpoints
2. **`backend/package.json`** - Server dependencies
3. **`CLAUDE.md`** - Architecture and setup guide

### For Configuration
1. **`package.json`** - Project dependencies and scripts
2. **`tsconfig.json`** - TypeScript settings
3. **`next.config.js`** - Next.js configuration

### For Understanding the System
1. **`CLAUDE.md`** - Complete project guide
2. **`DATA_FLOW.md`** - System architecture
3. **`README.md`** - Getting started guide

---

## 🔍 File Categories Summary

| Category | Files | Purpose |
|----------|-------|---------|
| **Pages** | `src/app/*/page.tsx` | Individual routes and user interfaces |
| **Components** | `src/components/*.tsx` | Reusable UI components |
| **Styling** | `*.css` files | Visual design and layout |
| **Server** | `backend/server.js` | API endpoints and business logic |
| **Config** | `*.json`, `*.js` config files | Build and runtime configuration |
| **Types** | `*.d.ts` files | TypeScript type definitions |
| **Docs** | `*.md` files | Documentation and guides |
| **Dependencies** | `node_modules/`, `package*.json` | External libraries and tools |

This documentation provides a comprehensive overview of every significant file in the ScoreSpoken project, making it easier for developers to understand the codebase structure and navigate the project effectively.