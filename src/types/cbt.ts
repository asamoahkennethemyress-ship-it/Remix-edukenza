export type CbtQuestionType = 
  | 'mcq' 
  | 'multi_select' 
  | 'true_false' 
  | 'short_answer' 
  | 'essay' 
  | 'matching' 
  | 'fill_blank' 
  | 'drag_drop' 
  | 'numeric';

export type CbtBloomTaxonomy = 
  | 'Remembering' 
  | 'Understanding' 
  | 'Applying' 
  | 'Analyzing' 
  | 'Evaluating' 
  | 'Creating';

export type CbtDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export interface CbtQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
  image?: string;
}

export interface CbtMatchingPair {
  id: string;
  leftItem: string;
  rightItem: string;
}

export interface CbtQuestion {
  id?: string;
  schoolId: string;
  subjectId: string;
  subjectName: string;
  classGrade: string;
  title: string;
  type: CbtQuestionType;
  difficulty: CbtDifficulty;
  bloomLevel: CbtBloomTaxonomy;
  points: number;
  options?: CbtQuestionOption[];
  matchingPairs?: CbtMatchingPair[];
  orderingItems?: Array<{ id: string; text: string }>;
  correctAnswer?: string | string[] | number;
  explanation?: string;
  markingScheme?: string;
  tags: string[];
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  latexFormula?: string;
  isArchived?: boolean;
  version: number;
  authorName: string;
  authorId: string;
  createdAt?: any;
  updatedAt?: any;
}

export type CbtExamType = 
  | 'Practice Test' 
  | 'Class Test' 
  | 'Quiz' 
  | 'Mid-Term Exam' 
  | 'End-of-Term Exam' 
  | 'Mock Exam' 
  | 'Entrance Exam' 
  | 'National Exam Prep';

export type CbtExamStatus = 'Draft' | 'Scheduled' | 'Live' | 'Closed' | 'Graded' | 'Archived';

export interface CbtExamConfig {
  id?: string;
  schoolId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  term: string;
  examType: CbtExamType;
  durationMinutes: number;
  totalPoints: number;
  passingScorePercentage: number;
  startDate: string;
  endDate: string;
  instructions: string;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  poolQuestionCount?: number;
  negativeMarking: boolean;
  negativeMarkingFactor?: number;
  maxAttempts: number;
  autoSubmitOnTimeExpire: boolean;
  showResultsImmediately: boolean;
  showExplanationsAfterExam: boolean;
  secureExamMode: boolean;
  requireFullScreen?: boolean;
  preventCopyPaste?: boolean;
  maxViolationsAllowed?: number;
  violationAction?: 'warning' | 'auto_submit' | 'immediate_submit';
  allowOneQuestionAtATime: boolean;
  allowBacktracking?: boolean;
  scheduledResultReleaseDate?: string;
  status: CbtExamStatus;
  questionIds: string[];
  questionsCount: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface CbtStudentAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  textResponse?: string;
  numericResponse?: number;
  matchingResponse?: Record<string, string>;
  orderingResponse?: string[];
  isFlagged?: boolean;
  isAutograded?: boolean;
  scoreAwarded?: number;
  maxScore?: number;
  teacherFeedback?: string;
  timeSpentSeconds?: number;
}

export interface CbtSecurityViolationLog {
  timestamp: string;
  type: 'tab_switch' | 'window_blur' | 'copy_paste' | 'fullscreen_exit' | 'screenshot_attempt' | 'dev_tools' | 'idle_timeout';
  detail: string;
}

export interface CbtActivityLogEntry {
  timestamp: string;
  action: string;
  details?: string;
}

export type CbtAttemptStatus = 'in_progress' | 'submitted' | 'auto_submitted' | 'graded' | 'disqualified';

export interface CbtAttempt {
  id?: string;
  examId: string;
  examTitle: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  subjectName: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
  status: CbtAttemptStatus;
  answers: Record<string, CbtStudentAnswer>;
  securityViolations: CbtSecurityViolationLog[];
  activityLogs?: CbtActivityLogEntry[];
  timeSpentPerQuestion?: Record<string, number>;
  violationCount: number;
  ipAddress?: string;
  totalScoreObtained: number;
  maxPossibleScore: number;
  percentageScore: number;
  passed: boolean;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  teacherComments?: string;
  aiStudyPlan?: string;
  certificateIssued?: boolean;
  certificateId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CbtCertificate {
  id: string;
  schoolId: string;
  schoolName: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  scorePercentage: number;
  grade: string;
  issuedDate: string;
  certificateCode: string;
}
