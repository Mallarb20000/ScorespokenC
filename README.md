# ScoreSpoken - IELTS Speaking Practice Platform

AI-powered IELTS Speaking practice platform with real-time scoring and feedback.

## Project Structure

```
CCSS/
├── src/                    # Next.js frontend
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Home page
│   │   ├── quick-drill/
│   │   │   └── page.tsx    # Quick drill practice
│   │   └── globals.css
├── backend/                # Node.js Express backend
│   ├── server.js          # Main server file
│   ├── package.json
│   └── .env.example
├── package.json           # Frontend dependencies
├── next.config.js
├── tsconfig.json
└── claude.md              # Project guidelines
```

## Setup Instructions

### Frontend (Next.js)
```bash
npm install
npm run dev
```
Access at: http://localhost:3000

### Backend (Node.js)
```bash
cd backend
npm install
cp .env.example .env
# Add your Gemini API key to .env
npm run dev
```
Backend runs on: http://localhost:3001

## Features

- **Quick Drill**: Practice with single IELTS speaking questions
- **Audio Recording**: Browser-based audio capture
- **AI Analysis**: Gemini-powered transcript, scoring, and feedback
- **Real-time Processing**: Async audio analysis with loading states

## Environment Variables

Create `backend/.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

## API Endpoints

- `POST /api/analyze-answer` - Submit audio for analysis
- `GET /health` - Backend health check
