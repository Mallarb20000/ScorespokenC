# ScoreSpoken Backend API

## 🚀 Production-Ready IELTS Speaking Practice Backend

A robust, scalable Express.js API server for IELTS Speaking test analysis using AI. Built with modern architecture patterns, comprehensive error handling, and enterprise-grade features.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Development](#development)
- [Production Deployment](#production-deployment)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│  Express Server  │───▶│   Gemini AI     │
│   (Frontend)    │    │   (Backend API)  │    │   (Analysis)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Firebase Auth   │    │ PostgreSQL DB    │    │   File Storage  │
│ (Authentication)│    │   (User Data)    │    │ (Audio Files)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 🎯 Design Principles

1. **Modular Architecture** - Service-based design with clear separation of concerns
2. **Configuration-Driven** - Environment-based configuration for all settings
3. **Database Agnostic** - Works with or without database (graceful fallbacks)
4. **AI Provider Agnostic** - Easy to switch between Gemini, OpenAI, Claude
5. **Production Ready** - Comprehensive error handling, logging, monitoring
6. **Scalable** - Designed for horizontal scaling and microservices migration

### 📁 Project Structure

```
backend/
├── config/               # Configuration management
│   └── index.js         # Centralized config with validation
├── lib/                 # Core libraries
│   └── database.js      # Database connection & health checks
├── middleware/          # Express middleware
│   ├── errorHandler.js  # Global error handling
│   ├── firebaseAuth.js  # Firebase authentication
│   ├── logger.js        # Request logging & monitoring
│   └── validation.js    # Request validation with Joi
├── routes/              # API route handlers
│   └── api/
│       ├── analysis.js  # IELTS analysis endpoints
│       ├── audio.js     # Audio file management
│       ├── health.js    # Health check endpoints
│       └── index.js     # Route aggregation
├── services/            # Business logic services
│   ├── ai/              # AI service implementations
│   │   ├── AIFactory.js # AI provider factory
│   │   ├── GeminiAI.js  # Gemini AI implementation
│   │   └── prompts/     # AI prompt templates
│   ├── audio/           # Audio processing services
│   └── storage/         # File storage abstractions
├── prisma/              # Database schema & migrations
│   ├── schema.prisma    # Database schema definition
│   └── seed.js          # Sample data seeding
├── server.js            # Main application entry point
├── package.json         # Dependencies & scripts
└── .env                 # Environment configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional)
- Firebase project (for authentication)
- Google Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up database (optional)
npm run db:generate
npm run db:push
npm run db:seed

# Start development server
npm run dev
```

### Environment Setup

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase (recommended)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account"...}

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/scorespoken

# Server settings
NODE_ENV=development
PORT=3002
CORS_ORIGIN=http://localhost:3000
```

## 📡 API Endpoints

### Authentication

All endpoints support optional Firebase authentication. Include Firebase ID token in requests:

```bash
Authorization: Bearer <firebase-id-token>
```

### Analysis Endpoints

#### Single Question Analysis
```http
POST /api/analyze/single
Content-Type: multipart/form-data

audio: <audio-file>
question: "What do you do for work or study?"
testType: "quick-drill"
```

#### Part 1 Analysis (5 Questions)
```http
POST /api/analyze/part1
Content-Type: multipart/form-data

audio_0: <audio-file-1>
audio_1: <audio-file-2>
audio_2: <audio-file-3>
audio_3: <audio-file-4>
audio_4: <audio-file-5>
questions: ["Q1", "Q2", "Q3", "Q4", "Q5"]
testType: "part1"
```

#### Part 2 Analysis (Cue Card)
```http
POST /api/analyze/part2
Content-Type: multipart/form-data

audio: <audio-file>
topic: "Describe a memorable journey"
points: ["Where you went", "Who you went with", ...]
testType: "part2"
```

#### Part 3 Analysis (Discussion)
```http
POST /api/analyze/part3
Content-Type: multipart/form-data

audio_0: <audio-file-1>
audio_1: <audio-file-2>
...
questions: ["Q1", "Q2", "Q3", "Q4", "Q5"]
theme: "Travel and Tourism"
testType: "part3"
```

### Response Format

All analysis endpoints return:

```json
{
  "transcript": "User's spoken response transcription",
  "score": "6.5",
  "fluency_coherence": {
    "score": "6",
    "strengths": "Good flow and coherence",
    "improvements": "Reduce hesitation"
  },
  "lexical_resource": {
    "score": "7",
    "strengths": "Wide vocabulary range",
    "improvements": "Use more idiomatic expressions"
  },
  "grammatical_range": {
    "score": "6",
    "strengths": "Good sentence variety",
    "improvements": "Work on complex structures"
  },
  "pronunciation": {
    "score": "7",
    "strengths": "Clear pronunciation",
    "improvements": "Work on word stress"
  },
  "overall_assessment": "Comprehensive feedback summary",
  "audio_url": "/temp/audio_12345.wav",
  "processing_info": {
    "processed_at": "2024-01-15T10:30:00Z",
    "test_type": "part1",
    "audio_id": "audio_12345"
  }
}
```

### Health & Monitoring

```http
GET /health
# Returns server health status

GET /api/health/detailed
# Returns detailed system health check
```

### Error Responses

```json
{
  "success": false,
  "error": {
    "message": "Audio file too large",
    "code": "FILE_TOO_LARGE"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/analyze/single",
  "method": "POST"
}
```

## 🔐 Authentication

### Firebase Authentication

The backend supports Firebase Authentication with automatic user creation:

1. Frontend authenticates user with Firebase
2. Frontend sends Firebase ID token to backend
3. Backend verifies token with Firebase Admin SDK
4. Backend creates/updates user in database
5. Backend processes authenticated request

### Guest Usage

Users can use the API without authentication (guest mode):
- Limited rate limiting
- No data persistence
- Temporary session tracking

## 🗄️ Database Schema

### Core Models

```sql
-- Users and Authentication
User {
  id: String (Firebase UID)
  email: String
  name: String
  avatar: String
  authProvider: String
  preferences: UserPreferences
  testSessions: TestSession[]
}

-- Test Sessions
TestSession {
  id: String
  userId: String
  testType: String
  status: String
  questions: Json
  responses: TestResponse[]
  overallScore: Float
}

-- Individual Responses
TestResponse {
  id: String
  sessionId: String
  questionIndex: Int
  question: String
  transcript: String
  overallScore: Float
  fluencyScore: Float
  lexicalScore: Float
  grammaticalScore: Float
  pronunciationScore: Float
  feedback: Json
}
```

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Reset database
npm run db:reset
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3002` |
| `GEMINI_API_KEY` | Google Gemini API key | **Required** |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Optional |
| `DATABASE_URL` | PostgreSQL connection string | Optional |
| `STORAGE_TYPE` | Storage type (memory/disk/s3) | `memory` |

### Feature Flags

```bash
ENABLE_CACHING=true
ENABLE_ANALYTICS=true
ENABLE_BATCH_PROCESSING=true
```

### AI Configuration

```bash
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
AI_MAX_RETRIES=3
AI_TIMEOUT=30000
```

## 👨‍💻 Development

### Available Scripts

```bash
npm run dev        # Start development server
npm run start      # Start production server
npm run lint       # Run ESLint
npm run test       # Run tests
npm run test:watch # Run tests in watch mode
```

### Adding New AI Providers

1. Create provider class extending `AIInterface`
2. Implement required methods (`analyzeSingleAudio`, `analyzeMultipleAudio`)
3. Add to `AIFactory.js`
4. Update configuration

### Adding New Storage Providers

1. Create storage class extending `StorageInterface`
2. Implement required methods (`store`, `retrieve`, `delete`)
3. Add to `StorageFactory.js`
4. Update configuration

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run db:generate
EXPOSE 3002
CMD ["npm", "start"]
```

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
PORT=3002

# Database
DATABASE_URL=postgresql://user:pass@prod-db:5432/scorespoken

# Firebase
FIREBASE_PROJECT_ID=prod-firebase-project
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-service-account>

# AI Service
GEMINI_API_KEY=<production-api-key>

# Storage
STORAGE_TYPE=s3
S3_BUCKET=scorespoken-audio-prod
S3_REGION=us-east-1
```

### Performance Optimization

1. **Caching**: Enable Redis caching for AI responses
2. **CDN**: Use CloudFront for audio file delivery
3. **Load Balancing**: Use ALB for multiple instances
4. **Database**: Use read replicas for analytics
5. **Monitoring**: Implement CloudWatch/DataDog monitoring

### Security Checklist

- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] Firebase service account secured
- [ ] Database credentials encrypted
- [ ] File upload size limits set
- [ ] Request validation enabled
- [ ] Error logging without sensitive data

## 📊 Monitoring & Analytics

### Health Checks

```bash
curl http://localhost:3002/health
curl http://localhost:3002/api/health/detailed
```

### Logging

All requests are logged with:
- Request ID
- User ID (if authenticated)
- Endpoint accessed
- Response time
- Error details

### Metrics

- API response times
- AI processing times
- Error rates by endpoint
- User activity patterns
- File upload statistics

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

---

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the configuration examples

**Built with ❤️ for IELTS learners worldwide**