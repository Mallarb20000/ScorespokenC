/**
 * =============================================================================
 * TEST TYPE CONFIGURATIONS
 * =============================================================================
 * 
 * Centralized configuration for all IELTS test types
 * Eliminates duplication and provides single source of truth
 */

import { TestConfig, Question } from '../types'

// =============================================================================
// QUESTION BANKS
// =============================================================================

export const quickDrillQuestions: Question[] = [
  {
    id: 'quick-1',
    text: "Describe a place you would like to visit. You should say: where it is, what you would do there, and why you would like to visit this place.",
    category: 'travel',
    timeLimit: 120 // 2 minutes
  }
]

export const part2Questions: Question[] = [
  {
    id: 'part2-1',
    text: "Describe a memorable journey you have taken. You should say: where you went, who you went with or if you went alone, what you did during the journey, and explain why this journey was memorable for you.",
    category: 'travel',
    timeLimit: 120, // 2 minutes to speak
    preparationTime: 60 // 1 minute preparation
  }
]

export const part1Questions: Question[] = [
  {
    id: 'part1-1',
    text: "Let's talk about your hometown. Where are you from?",
    category: 'hometown'
  },
  {
    id: 'part1-2',
    text: "Do you work or are you a student?",
    category: 'work_study'
  },
  {
    id: 'part1-3',
    text: "What do you like to do in your free time?",
    category: 'hobbies'
  },
  {
    id: 'part1-4',
    text: "How often do you use social media?",
    category: 'technology'
  },
  {
    id: 'part1-5',
    text: "What kind of weather do you prefer and why?",
    category: 'preferences'
  }
]

export const part3QuestionSets = {
  'technology-society': {
    theme: "Technology and Society",
    questions: [
      {
        id: 'part3-tech-1',
        text: "How has technology changed the way people communicate compared to the past?",
        category: 'technology'
      },
      {
        id: 'part3-tech-2',
        text: "Do you think social media has a positive or negative impact on relationships? Why?",
        category: 'technology'
      },
      {
        id: 'part3-tech-3',
        text: "What role should technology play in education?",
        category: 'technology'
      },
      {
        id: 'part3-tech-4',
        text: "How might artificial intelligence affect employment in the future?",
        category: 'technology'
      },
      {
        id: 'part3-tech-5',
        text: "Should there be more regulation of technology companies? Why or why not?",
        category: 'technology'
      }
    ]
  },
  'work-career': {
    theme: "Work and Career",
    questions: [
      {
        id: 'part3-work-1',
        text: "What factors do you think are most important when choosing a career?",
        category: 'work'
      },
      {
        id: 'part3-work-2',
        text: "How has the concept of work-life balance changed in recent years?",
        category: 'work'
      },
      {
        id: 'part3-work-3',
        text: "Do you believe people should work in jobs they're passionate about, even if they pay less?",
        category: 'work'
      },
      {
        id: 'part3-work-4',
        text: "What impact does globalization have on employment opportunities?",
        category: 'work'
      },
      {
        id: 'part3-work-5',
        text: "How important is job security compared to job satisfaction?",
        category: 'work'
      }
    ]
  },
  'environment-sustainability': {
    theme: "Environment and Sustainability",
    questions: [
      {
        id: 'part3-env-1',
        text: "What do you think are the most effective ways to address climate change?",
        category: 'environment'
      },
      {
        id: 'part3-env-2',
        text: "Should individuals or governments be primarily responsible for environmental protection?",
        category: 'environment'
      },
      {
        id: 'part3-env-3',
        text: "How can we balance economic development with environmental conservation?",
        category: 'environment'
      },
      {
        id: 'part3-env-4',
        text: "Do you think younger generations are more environmentally conscious than older ones? Why?",
        category: 'environment'
      },
      {
        id: 'part3-env-5',
        text: "What role should education play in promoting environmental awareness?",
        category: 'environment'
      }
    ]
  },
  'culture-globalization': {
    theme: "Culture and Globalization",
    questions: [
      {
        id: 'part3-culture-1',
        text: "How important is it to preserve traditional cultures in a globalized world?",
        category: 'culture'
      },
      {
        id: 'part3-culture-2',
        text: "Do you think globalization leads to cultural homogenization or diversity?",
        category: 'culture'
      },
      {
        id: 'part3-culture-3',
        text: "What are the benefits and drawbacks of people migrating to different countries?",
        category: 'culture'
      },
      {
        id: 'part3-culture-4',
        text: "How has international travel affected people's understanding of other cultures?",
        category: 'culture'
      },
      {
        id: 'part3-culture-5',
        text: "Should schools teach more about different cultures and global issues?",
        category: 'culture'
      }
    ]
  }
}

// =============================================================================
// TEST CONFIGURATIONS
// =============================================================================

export const quickDrillConfig: TestConfig = {
  type: 'quick',
  title: 'Quick Drill Practice',
  description: 'Practice with a single IELTS speaking question',
  questions: quickDrillQuestions,
  autoAdvance: false,
  autoSubmit: true,
  submitEndpoint: '/api/analyze/single',
  resultRoute: '/results?type=quick',
  instructions: 'Record your answer to the question below. Take your time to think before recording.'
}

export const part1Config: TestConfig = {
  type: 'part1',
  title: 'IELTS Part 1 - Personal Questions',
  description: 'Answer questions about yourself and your experiences (4-5 minutes)',
  questions: part1Questions,
  autoAdvance: true,
  autoSubmit: true,
  submitEndpoint: '/api/analyze/part1',
  resultRoute: '/results?type=part1',
  instructions: 'Answer 5 personal questions. Each answer should be 20-30 seconds long.'
}

export const part2Config: TestConfig = {
  type: 'part2',
  title: 'IELTS Part 2 - Cue Card Task',
  description: 'Speak on a given topic for 1-2 minutes after 1 minute preparation',
  questions: part2Questions,
  autoAdvance: false,
  autoSubmit: true,
  submitEndpoint: '/api/analyze/part2',
  resultRoute: '/results?type=part2',
  instructions: 'You have 1 minute to prepare and make notes. Then speak for 1-2 minutes on the topic.'
}

export const part3Config: TestConfig = {
  type: 'part3',
  title: 'IELTS Part 3 - Discussion Questions',
  description: 'Discuss abstract topics in depth (4-5 minutes)',
  questions: part3QuestionSets['technology-society'].questions,
  autoAdvance: false,
  autoSubmit: false,
  submitEndpoint: '/api/analyze/part3',
  resultRoute: '/results?type=part3',
  instructions: 'Answer discussion questions with detailed responses. Give your opinions with examples and explanations.'
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const getTestConfig = (testType: string): TestConfig => {
  switch (testType) {
    case 'quick':
      return quickDrillConfig
    case 'part1':
      return part1Config
    case 'part2':
      return part2Config
    case 'part3':
      return part3Config
    default:
      throw new Error(`Unknown test type: ${testType}`)
  }
}

export const getPart3Config = (theme: string): TestConfig => {
  const questionSet = part3QuestionSets[theme as keyof typeof part3QuestionSets]
  if (!questionSet) {
    throw new Error(`Unknown Part 3 theme: ${theme}`)
  }
  
  return {
    ...part3Config,
    title: `IELTS Part 3 - ${questionSet.theme}`,
    questions: questionSet.questions
  }
}

export const getAllPart3Themes = () => {
  return Object.entries(part3QuestionSets).map(([key, value]) => ({
    id: key,
    theme: value.theme,
    questionCount: value.questions.length
  }))
}