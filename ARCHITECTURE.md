# ScoreSpoken Architecture Overview

## 🏗️ System Architecture

ScoreSpoken is a modern, full-stack IELTS Speaking practice platform built with enterprise-grade architecture patterns. This document outlines the design decisions, trade-offs, and recommendations for scaling.

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Next.js Frontend (Port 3000)                              │
│  ├── React Components (Modular & Reusable)                 │
│  ├── Firebase Auth (Google + Email/Password)               │
│  ├── State Management (React Context + Reducers)           │
│  └── Audio Recording (MediaRecorder API)                   │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS/WebSocket
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  Express.js Backend (Port 3002)                            │
│  ├── Route Handlers (RESTful API)                          │
│  ├── Authentication Middleware (Firebase Admin)            │
│  ├── Request Validation (Joi Schemas)                      │
│  ├── Error Handling (Centralized)                          │
│  ├── Rate Limiting (Per-user & Global)                     │
│  └── Logging & Monitoring                                  │
└─────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   AI SERVICES   │ │   DATA LAYER    │ │ STORAGE LAYER   │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ Google Gemini   │ │ PostgreSQL      │ │ File Storage    │
│ (Primary)       │ │ (User Data)     │ │ (Audio Files)   │
│                 │ │                 │ │                 │
│ OpenAI          │ │ Prisma ORM      │ │ Memory/Disk/S3  │
│ (Future)        │ │ (Type-Safe)     │ │ (Configurable)  │
│                 │ │                 │ │                 │
│ Claude AI       │ │ Redis Cache     │ │ CDN Delivery    │
│ (Future)        │ │ (Future)        │ │ (Future)        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 🎯 Design Principles

### 1. **Single Source of Truth (SSOT)**
- One component handles each major concern
- One service per domain (AI, Audio, Storage)
- One configuration file per entity type
- One cleanup system for all resources

### 2. **Configuration-Driven Architecture**
- Components receive behavior through configuration objects
- Test types defined as data, not separate components
- URL routing patterns defined in config
- Environment-based feature flags

### 3. **Modular & Composable**
- Small, focused components that can be combined
- Services that can be injected and swapped
- Hooks that encapsulate complex logic
- Utility functions that solve specific problems

### 4. **Graceful Degradation**
- Works without database (fallback to memory)
- Works without authentication (guest mode)
- Works without advanced features (core functionality preserved)
- Progressive enhancement approach

### 5. **Production-Ready**
- Comprehensive error handling at all layers
- Structured logging and monitoring
- Health checks and metrics
- Security best practices

## 🏛️ Architecture Layers

### Frontend Layer (Next.js)

```
src/
├── app/                     # Next.js 14 App Router
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Homepage
│   └── [test-type]/         # Dynamic test pages
├── components/
│   ├── shared/              # Universal components
│   │   ├── TestInterface.tsx    # Handles ALL test types
│   │   ├── UnifiedResults.tsx   # Handles ALL results
│   │   └── RecordingControls.tsx
│   └── auth/                # Authentication components
├── lib/
│   ├── config/testTypes.ts  # Test configurations
│   ├── services/            # Frontend services
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Utility functions
└── contexts/                # React contexts
    └── AuthContext.tsx      # Firebase auth state
```

**Key Features:**
- **Universal Components**: Single `TestInterface` handles all test types via configuration
- **Unified State Management**: `useTestFlow` hook centralizes all test logic
- **Firebase Integration**: Seamless authentication with Google + email/password
- **Audio Processing**: Browser-native MediaRecorder with voice detection
- **Responsive Design**: Mobile-first approach with progressive enhancement

### Backend Layer (Express.js)

```
backend/
├── server.js               # Application entry point
├── config/                 # Configuration management
├── middleware/             # Request processing pipeline
│   ├── firebaseAuth.js     # Authentication middleware
│   ├── validation.js       # Request validation
│   ├── errorHandler.js     # Error handling
│   └── logger.js           # Request logging
├── routes/                 # API endpoints
│   └── api/
│       ├── analysis.js     # IELTS analysis endpoints
│       └── health.js       # System health checks
├── services/               # Business logic
│   ├── ai/                 # AI service abstractions
│   ├── audio/              # Audio processing
│   └── storage/            # File storage abstractions
└── lib/                    # Core libraries
    └── database.js         # Database connection
```

**Key Features:**
- **Service-Oriented Architecture**: Clear separation of concerns
- **Provider Pattern**: Pluggable AI services (Gemini, OpenAI, Claude)
- **Middleware Pipeline**: Authentication, validation, error handling
- **Database Agnostic**: Works with or without PostgreSQL
- **Health Monitoring**: Comprehensive health checks and metrics

### Data Layer

```sql
-- Core Entities
User              # Firebase-synced user profiles
TestSession       # Test attempt records
TestResponse      # Individual question responses
QuestionBank      # IELTS question repository
UserAnalytics     # Progress tracking
ApiUsage          # Cost and performance monitoring
```

**Key Features:**
- **Prisma ORM**: Type-safe database access
- **Schema Evolution**: Migration-based schema changes
- **Data Integrity**: Foreign key constraints and validation
- **Analytics Ready**: Built-in tracking for user progress
- **Cost Monitoring**: API usage tracking for cost management

## 🔄 Data Flow Architecture

### Test Flow (Audio Analysis)

```
1. User Records Audio
   ├── Frontend: MediaRecorder captures WebM
   ├── Voice Detection: Automatic start/stop
   └── Audio Validation: Size, format, duration

2. Frontend Processing
   ├── Audio Encoding: Convert to base64
   ├── Auth Token: Get Firebase ID token
   └── API Request: Submit to backend

3. Backend Processing
   ├── Authentication: Verify Firebase token
   ├── Validation: Check audio format, size
   ├── Storage: Save audio file
   └── AI Analysis: Send to Gemini API

4. AI Analysis (Gemini)
   ├── Audio Transcription: Speech-to-text
   ├── IELTS Scoring: 4 criteria evaluation
   └── Feedback Generation: Structured response

5. Response Processing
   ├── Database: Save results (if connected)
   ├── Audio URL: Generate playback link
   └── Frontend: Return structured results

6. Results Display
   ├── Score Visualization: Band scores + feedback
   ├── Audio Playback: Original recording
   └── Progress Tracking: Update user analytics
```

### Authentication Flow

```
1. User Login (Frontend)
   ├── Firebase Auth: Google OAuth or email/password
   ├── ID Token: Retrieve from Firebase
   └── Local Storage: Cache token for API calls

2. API Request Authentication
   ├── Token Extraction: From Authorization header
   ├── Firebase Verification: Admin SDK validation
   └── User Sync: Create/update in database

3. Session Management
   ├── Token Refresh: Automatic renewal
   ├── Guest Mode: Anonymous sessions
   └── Rate Limiting: Per-user quotas
```

## ⚡ Performance Architecture

### Frontend Optimizations

1. **Code Splitting**: Dynamic imports for test components
2. **Lazy Loading**: Images and non-critical components
3. **Memoization**: React.memo for expensive renders
4. **Audio Optimization**: Efficient WebM encoding
5. **State Management**: Minimal re-renders with reducers

### Backend Optimizations

1. **Connection Pooling**: Database connection reuse
2. **Request Caching**: Redis for repeated requests
3. **File Streaming**: Efficient audio upload/download
4. **AI Response Caching**: Cache similar audio analyses
5. **Health Checks**: Proactive system monitoring

### Database Optimizations

1. **Indexing Strategy**: Optimized queries for user data
2. **Read Replicas**: Separate analytics queries
3. **Connection Pooling**: Prisma connection management
4. **Query Optimization**: N+1 query prevention
5. **Data Archiving**: Old sessions cleanup

## 🔒 Security Architecture

### Authentication & Authorization

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Firebase Auth   │───▶│ Backend Verify   │───▶│ Database User   │
│ (ID Tokens)     │    │ (Admin SDK)      │    │ (Sync/Create)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Frontend State  │    │ Request Context  │    │ User Permissions│
│ (User Profile)  │    │ (req.user)       │    │ (Role-based)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Security Measures

1. **Token Validation**: Firebase Admin SDK verification
2. **Rate Limiting**: Per-user and global limits
3. **Input Validation**: Joi schema validation
4. **File Security**: Audio format and size validation
5. **CORS Configuration**: Restricted origins
6. **Error Handling**: No sensitive data exposure
7. **Audit Logging**: User action tracking

## 📈 Scaling Architecture

### Horizontal Scaling Plan

```
Current (Single Instance)
┌─────────────────┐
│ Next.js + API   │
│ (Single Server) │
└─────────────────┘

Phase 1: Separate Frontend/Backend
┌─────────────────┐    ┌─────────────────┐
│ Next.js         │───▶│ Express API     │
│ (Static Deploy) │    │ (Single Server) │
└─────────────────┘    └─────────────────┘

Phase 2: Load Balanced API
┌─────────────────┐    ┌─────────────────┐
│ Next.js (CDN)   │    │ Load Balancer   │
└─────────────────┘    └─────────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
               ┌─────────┐  ┌─────────┐  ┌─────────┐
               │ API #1  │  │ API #2  │  │ API #3  │
               └─────────┘  └─────────┘  └─────────┘

Phase 3: Microservices
┌─────────────────┐    ┌─────────────────┐
│ Next.js (CDN)   │    │ API Gateway     │
└─────────────────┘    └─────────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
               ┌─────────┐  ┌─────────┐  ┌─────────┐
               │ Auth    │  │Analysis │  │ User    │
               │Service  │  │Service  │  │Service  │
               └─────────┘  └─────────┘  └─────────┘
```

### Database Scaling

1. **Read Replicas**: Separate analytics queries
2. **Sharding**: User-based data partitioning
3. **Caching Layer**: Redis for hot data
4. **Archive Strategy**: Move old data to cold storage
5. **Connection Pooling**: Optimize database connections

### CDN & Storage Scaling

1. **Static Assets**: CloudFront distribution
2. **Audio Files**: S3 with CDN delivery
3. **Geo-Distribution**: Multi-region deployment
4. **Compression**: Audio file optimization
5. **Cleanup Jobs**: Automated file lifecycle

## 🛠️ Technology Choices & Rationale

### Frontend: Next.js 14

**Why Next.js:**
- **App Router**: Modern routing with React Server Components
- **Built-in Optimization**: Automatic code splitting, image optimization
- **TypeScript Support**: Built-in TypeScript integration
- **SEO Friendly**: Server-side rendering capabilities
- **Developer Experience**: Hot reload, error overlay

**Alternatives Considered:**
- React (CRA): Less features, manual optimization
- Vue.js: Smaller ecosystem, learning curve
- Angular: Too heavy for this use case

### Backend: Express.js

**Why Express:**
- **Mature Ecosystem**: Extensive middleware library
- **Flexibility**: Unopinionated, customizable
- **Performance**: Fast, lightweight
- **Node.js Integration**: Shared language with frontend
- **Microservices Ready**: Easy to split later

**Alternatives Considered:**
- NestJS: Too opinionated, unnecessary complexity
- Fastify: Less ecosystem, migration complexity
- Python (FastAPI): Different language, team skills

### Database: PostgreSQL + Prisma

**Why PostgreSQL:**
- **ACID Compliance**: Data integrity guarantees
- **JSON Support**: Modern app requirements
- **Scalability**: Proven at enterprise scale
- **Open Source**: No vendor lock-in

**Why Prisma:**
- **Type Safety**: Auto-generated TypeScript types
- **Migration System**: Schema evolution management
- **Query Builder**: SQL-like syntax with safety
- **Development Tools**: Prisma Studio for data management

**Alternatives Considered:**
- MongoDB: Less structure, eventual consistency
- MySQL: Less advanced features
- TypeORM: More complex, less type-safe

### Authentication: Firebase Auth

**Why Firebase Auth:**
- **Zero Maintenance**: Google handles security updates
- **Multiple Providers**: Google, email, social logins
- **Scalability**: Handles millions of users
- **Cost Effective**: Free tier covers most use cases
- **Frontend Integration**: Seamless React integration

**Alternatives Considered:**
- Auth0: More expensive, unnecessary features
- Custom JWT: Security risks, maintenance overhead
- AWS Cognito: More complex setup, vendor lock-in

### AI Service: Google Gemini

**Why Gemini:**
- **Multimodal**: Native audio analysis
- **Cost Effective**: Competitive pricing
- **Performance**: Fast response times
- **Quality**: High-quality IELTS analysis
- **Integration**: Easy Google ecosystem integration

**Alternatives Considered:**
- OpenAI Whisper: Audio-only, needs separate analysis
- AWS Transcribe: More expensive, less accurate
- Custom Models: High development cost, maintenance

## 📊 Monitoring & Observability

### Application Metrics

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Frontend        │    │ Backend          │    │ Database        │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Page Load     │    │ • Response Times │    │ • Query Times   │
│ • User Actions  │    │ • Error Rates    │    │ • Connection    │
│ • Audio Quality │    │ • AI Processing  │    │   Pool Usage    │
│ • Auth Success  │    │ • File Uploads   │    │ • Slow Queries  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Health Checks

1. **Liveness Probes**: Basic server responsiveness
2. **Readiness Probes**: Database connectivity, AI service
3. **Dependency Checks**: Firebase, Gemini API status
4. **Resource Monitoring**: Memory, CPU, disk usage
5. **Business Metrics**: Test completion rates, user satisfaction

### Alerting Strategy

1. **Critical**: Service down, database disconnected
2. **Warning**: High error rates, slow responses
3. **Info**: New user registrations, usage patterns
4. **Custom**: IELTS score anomalies, audio quality issues

## 🚀 Deployment Architecture

### Development Environment

```
Developer Machine
├── Frontend (localhost:3000)
├── Backend (localhost:3002)
├── Database (localhost:5432)
└── Firebase (Cloud)
```

### Production Environment

```
Cloud Infrastructure
├── Frontend (Vercel/Netlify)
├── Backend (AWS ECS/Google Cloud Run)
├── Database (AWS RDS/Google Cloud SQL)
├── Storage (AWS S3/Google Cloud Storage)
├── CDN (CloudFront/CloudFlare)
└── Monitoring (DataDog/New Relic)
```

### CI/CD Pipeline

```
1. Code Push → GitHub
2. Tests Run → GitHub Actions
3. Build → Docker Images
4. Deploy → Staging Environment
5. Integration Tests → Automated
6. Deploy → Production
7. Health Check → Automated
8. Rollback → If needed
```

## 📈 Cost Architecture

### Current Costs (10K users, 20 logins/month)

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Firebase Auth | $0 | Under free tier |
| Gemini API | ~$50 | Based on usage |
| Database (RDS) | ~$25 | t3.micro instance |
| Storage (S3) | ~$10 | Audio files |
| Hosting | ~$20 | Vercel/Railway |
| **Total** | **~$105** | Scales with usage |

### Cost Optimization Strategies

1. **AI Caching**: Cache similar responses
2. **Audio Compression**: Reduce storage costs
3. **Database Optimization**: Efficient queries
4. **CDN Usage**: Reduce bandwidth costs
5. **Auto-scaling**: Pay for actual usage

## 🔮 Future Architecture Considerations

### Phase 1: Enhanced Features (Next 6 months)
- Real-time collaboration features
- Advanced analytics dashboard
- Mobile app development
- Offline mode support

### Phase 2: Scale Optimization (Next 12 months)
- Microservices architecture
- Multi-region deployment
- Advanced caching layers
- ML model optimization

### Phase 3: Enterprise Features (Next 18 months)
- White-label solutions
- Advanced reporting
- API rate limiting tiers
- Custom AI model training

---

## 🎯 Key Success Metrics

1. **Technical Metrics**
   - 99.9% uptime
   - <3s average response time
   - <1% error rate
   - <5s AI processing time

2. **Business Metrics**
   - User retention >70%
   - Test completion rate >85%
   - Cost per user <$0.50
   - Customer satisfaction >4.5/5

3. **Operational Metrics**
   - Zero-downtime deployments
   - <24hr issue resolution
   - 100% automated tests
   - <1hr from code to production

**This architecture is designed to grow from 1K to 100K+ users while maintaining performance, reliability, and cost efficiency.**