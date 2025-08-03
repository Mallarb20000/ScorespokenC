/**
 * =============================================================================
 * SHARED COMPONENTS BARREL EXPORT
 * =============================================================================
 * 
 * Centralized export for all shared/reusable components
 */

// Main components
export { default as TestInterface } from './TestInterface'
export { default as QuestionDisplay } from './QuestionDisplay'
export { default as RecordingControls } from './RecordingControls'
export { default as SubmissionPanel } from './SubmissionPanel'
export { default as UnifiedResults } from './UnifiedResults'

// Re-export existing components
export { CriteriaCard } from '../CriteriaCard'

// Component props interfaces
export type { TestInterfaceProps } from './TestInterface'
export type { SubmissionPanelProps } from './SubmissionPanel'
export type { UnifiedResultsProps } from './UnifiedResults'