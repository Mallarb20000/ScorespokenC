/**
 * =============================================================================
 * DATABASE SEEDING SCRIPT
 * =============================================================================
 * 
 * Populates the database with initial data for development and testing.
 * Includes sample questions, system configuration, and test data.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing data in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Clearing existing data...')
    await prisma.apiUsage.deleteMany()
    await prisma.testResponse.deleteMany()
    await prisma.testSession.deleteMany()
    await prisma.userAnalytics.deleteMany()
    await prisma.userPreferences.deleteMany()
    await prisma.user.deleteMany()
    await prisma.questionBank.deleteMany()
    await prisma.systemConfig.deleteMany()
  }

  // System Configuration
  console.log('⚙️  Setting up system configuration...')
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'MAINTENANCE_MODE',
        value: 'false',
        type: 'boolean',
        description: 'Enable maintenance mode to disable API access'
      },
      {
        key: 'MAX_AUDIO_SIZE_MB',
        value: '10',
        type: 'number',
        description: 'Maximum audio file size in megabytes'
      },
      {
        key: 'SUPPORTED_AUDIO_FORMATS',
        value: '["audio/webm", "audio/wav", "audio/mp3"]',
        type: 'json',
        description: 'List of supported audio formats'
      },
      {
        key: 'AI_MODEL_VERSION',
        value: 'gemini-2.5-flash-lite',
        type: 'string',
        description: 'Current AI model version in use'
      },
      {
        key: 'DEFAULT_TARGET_SCORE',
        value: '6.5',
        type: 'number',
        description: 'Default IELTS target score for new users'
      }
    ]
  })

  // Question Bank - Part 1 (Personal Questions)
  console.log('📝 Adding Part 1 questions...')
  await prisma.questionBank.createMany({
    data: [
      // Work and Career
      {
        type: 'part1',
        category: 'work',
        difficulty: 'beginner',
        question: 'What do you do for work or study?'
      },
      {
        type: 'part1',
        category: 'work',
        difficulty: 'intermediate',
        question: 'Do you enjoy your current job? Why or why not?'
      },
      {
        type: 'part1',
        category: 'work',
        difficulty: 'advanced',
        question: 'How do you think your job will change in the future?'
      },

      // Hometown and Living
      {
        type: 'part1',
        category: 'hometown',
        difficulty: 'beginner',
        question: 'Where are you from?'
      },
      {
        type: 'part1',
        category: 'hometown',
        difficulty: 'intermediate',
        question: 'What do you like most about your hometown?'
      },
      {
        type: 'part1',
        category: 'hometown',
        difficulty: 'advanced',
        question: 'How has your hometown changed since you were a child?'
      },

      // Hobbies and Interests
      {
        type: 'part1',
        category: 'hobbies',
        difficulty: 'beginner',
        question: 'What do you like to do in your free time?'
      },
      {
        type: 'part1',
        category: 'hobbies',
        difficulty: 'intermediate',
        question: 'Have you tried any new hobbies recently?'
      },
      {
        type: 'part1',
        category: 'hobbies',
        difficulty: 'advanced',
        question: 'Do you think it\'s important for people to have hobbies? Why?'
      }
    ]
  })

  // Question Bank - Part 2 (Cue Cards)
  console.log('🎯 Adding Part 2 cue cards...')
  await prisma.questionBank.createMany({
    data: [
      {
        type: 'part2',
        category: 'experience',
        difficulty: 'intermediate',
        question: 'Describe a memorable journey you have taken',
        context: 'You should say:',
        bulletPoints: [
          'Where you went',
          'Who you went with',
          'What you did there',
          'And explain why this journey was memorable for you'
        ]
      },
      {
        type: 'part2',
        category: 'people',
        difficulty: 'intermediate',
        question: 'Describe someone who has influenced you',
        context: 'You should say:',
        bulletPoints: [
          'Who this person is',
          'How you know them',
          'What they have done to influence you',
          'And explain why you think they are important'
        ]
      },
      {
        type: 'part2',
        category: 'objects',
        difficulty: 'beginner',
        question: 'Describe something you own that is important to you',
        context: 'You should say:',
        bulletPoints: [
          'What it is',
          'Where you got it from',
          'How long you have had it',
          'And explain why it is important to you'
        ]
      }
    ]
  })

  // Question Bank - Part 3 (Discussion Questions)
  console.log('💭 Adding Part 3 discussion questions...')
  await prisma.questionBank.createMany({
    data: [
      {
        type: 'part3',
        category: 'travel',
        difficulty: 'advanced',
        question: 'How do you think tourism affects local communities?'
      },
      {
        type: 'part3',
        category: 'technology',
        difficulty: 'advanced',
        question: 'What impact has technology had on the way people communicate?'
      },
      {
        type: 'part3',
        category: 'education',
        difficulty: 'intermediate',
        question: 'Do you think online learning is as effective as traditional classroom learning?'
      },
      {
        type: 'part3',
        category: 'environment',
        difficulty: 'advanced',
        question: 'What role should governments play in protecting the environment?'
      }
    ]
  })

  // Sample Test User (for development)
  if (process.env.NODE_ENV === 'development') {
    console.log('👤 Creating sample test user...')
    
    const testUser = await prisma.user.create({
      data: {
        email: 'test@scorespoken.com',
        name: 'Test User',
        authProvider: 'local',
        preferences: {
          create: {
            targetScore: 7.0,
            preferredPart: 'all',
            difficultyLevel: 'intermediate',
            recordingMode: 'voice-activated',
            theme: 'light'
          }
        }
      }
    })

    // Sample test session
    const testSession = await prisma.testSession.create({
      data: {
        userId: testUser.id,
        testType: 'part1',
        status: 'completed',
        questions: [
          'What do you do for work or study?',
          'Where are you from?',
          'What do you like to do in your free time?'
        ],
        overallScore: 6.5,
        completedAt: new Date(),
        duration: 300 // 5 minutes
      }
    })

    // Sample responses
    await prisma.testResponse.createMany({
      data: [
        {
          sessionId: testSession.id,
          questionIndex: 0,
          question: 'What do you do for work or study?',
          questionType: 'personal',
          transcript: 'I am currently studying computer science at university. I find it very interesting and challenging.',
          overallScore: 6.5,
          fluencyScore: 6.0,
          lexicalScore: 7.0,
          grammaticalScore: 6.5,
          pronunciationScore: 6.5,
          aiProvider: 'gemini',
          aiModel: 'gemini-2.5-flash-lite',
          processingTime: 2500,
          cost: 0.002
        },
        {
          sessionId: testSession.id,
          questionIndex: 1,
          question: 'Where are you from?',
          questionType: 'personal',
          transcript: 'I am from a small city in the north of my country. It is a beautiful place with mountains.',
          overallScore: 6.0,
          fluencyScore: 6.0,
          lexicalScore: 6.0,
          grammaticalScore: 6.0,
          pronunciationScore: 6.0,
          aiProvider: 'gemini',
          aiModel: 'gemini-2.5-flash-lite',
          processingTime: 2300,
          cost: 0.0018
        }
      ]
    })

    console.log('✅ Sample data created for development')
  }

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })