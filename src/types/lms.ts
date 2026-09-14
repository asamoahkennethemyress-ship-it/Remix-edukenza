/**
 * EDUkenZA Enterprise Learning Management System (LMS) Types
 */

export type CourseStatus = 'draft' | 'active' | 'archived';

export interface LmsCourse {
  id: string;
  schoolId: string;
  courseCode: string;
  courseName: string;
  subject: string;
  description: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  academicYear: string;
  term: string; // e.g., 'Term 1', 'Semester 1'
  coverImage: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  syllabus?: string;
  totalLessons?: number;
  totalQuizzes?: number;
  totalAssignments?: number;
}

export type LessonStatus = 'draft' | 'published';

export interface LessonAttachment {
  id: string;
  name: string;
  url: string;
  type: string; // 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'zip' | 'image' | 'audio' | 'video';
  size: string;
  downloadPermitted: boolean;
}

export interface InteractiveDiagram {
  id: string;
  title: string;
  type: 'process' | 'flowchart' | 'anatomy' | 'mindmap' | 'custom';
  nodes: Array<{ id: string; label: string; description?: string; color?: string }>;
}

export interface LmsLesson {
  id: string;
  courseId: string;
  schoolId: string;
  title: string;
  content: string; // Supports rich markdown, text (1000+ words)
  summary?: string;
  order: number;
  durationMinutes: number;
  status: LessonStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  
  // Media & Attachments
  coverImage?: string;
  videoUrl?: string;
  videoType?: 'youtube' | 'mp4' | 'google_drive' | 'embed' | 'live_meet';
  attachments?: LessonAttachment[];
  
  // Rich STEM & Tech elements
  mathExpressions?: string[]; // LaTeX equations
  chemicalFormulas?: string[]; // Chemical equations e.g. 2H2 + O2 -> 2H2O
  codeSnippets?: Array<{ language: string; code: string; title?: string }>;
  interactiveDiagrams?: InteractiveDiagram[];
  
  // Progress metadata
  totalViews?: number;
}

export type QuestionType = 
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'fill_blank'
  | 'matching'
  | 'multiple_select';

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface LmsQuestion {
  id: string;
  type: QuestionType;
  questionText: string;
  points: number;
  options?: string[]; // for multiple_choice & multiple_select
  correctAnswer?: string | string[] | boolean; // for mc, tf, short_answer, fill_blank
  matchingPairs?: MatchingPair[]; // for matching questions
  explanation?: string; // Instant feedback note
}

export interface LmsQuiz {
  id: string;
  courseId: string;
  lessonId?: string;
  schoolId: string;
  title: string;
  description: string;
  timeLimitMinutes: number; // 0 for unlimited
  passingScore: number; // percentage (e.g., 70)
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  totalPoints: number;
  status: LessonStatus;
  questions: LmsQuestion[];
  createdAt: string;
  authorId: string;
  authorName: string;
  dueDate?: string;
}

export interface LmsQuizAttempt {
  id: string;
  quizId: string;
  courseId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  startedAt: string;
  completedAt?: string;
  timeSpentSeconds: number;
  answers: Record<string, any>; // questionId -> student response
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  graded: boolean; // false if needs manual grading (e.g. essay)
  teacherFeedback?: string;
}

export interface LmsRubricCriterion {
  id: string;
  title: string;
  description: string;
  maxPoints: number;
}

export interface LmsAssignment {
  id: string;
  courseId: string;
  schoolId: string;
  title: string;
  description: string;
  dueDate: string;
  totalPoints: number;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
  lateSubmissionAllowed: boolean;
  latePenaltyPercent: number;
  rubric?: LmsRubricCriterion[];
  attachments?: LessonAttachment[];
  status?: 'draft' | 'published';
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface LmsAssignmentSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle?: string;
  courseId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  attemptNumber: number;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  grade?: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  status: 'submitted' | 'graded' | 'late' | 'resubmission_requested';
  similarityScore?: number; // Plagiarism/similarity check indicator (0-100%)
}

export interface LmsReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'student' | 'school_admin';
  createdAt: string;
  likes: string[]; // array of user uids
  attachments?: LessonAttachment[];
}

export interface LmsDiscussion {
  id: string;
  courseId: string;
  lessonId?: string;
  schoolId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'student' | 'school_admin';
  createdAt: string;
  isPinned: boolean;
  isLocked: boolean;
  likes: string[];
  replies: LmsReply[];
}

export interface LmsProgress {
  id: string;
  studentId: string;
  courseId: string;
  schoolId: string;
  completedLessonIds: string[];
  videoWatchSeconds: Record<string, number>; // lessonId -> watched seconds
  quizScores: Record<string, { attemptId: string; score: number; percentage: number; passed: boolean }>;
  assignmentStatus: Record<string, { submissionId: string; status: string; grade?: number }>;
  overallPercentage: number;
  lastAccessedAt: string;
  attendanceCount: number;
  bookmarkedLessonIds: string[];
}

export interface LmsMaterial {
  id: string;
  courseId: string;
  lessonId?: string;
  schoolId: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  category: 'PDF' | 'DOCX' | 'PPTX' | 'XLSX' | 'Image' | 'Audio' | 'Video' | 'ZIP';
  downloadPermitted: boolean;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
  downloadsCount: number;
}

export interface LmsCertificate {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  issuedAt: string;
  certificateNumber: string;
  grade: string;
  issuerName: string;
}

export interface LmsAnalytics {
  courseId: string;
  courseName: string;
  totalEnrolledStudents: number;
  averageCompletionRate: number;
  averageQuizScore: number;
  averageAssignmentGrade: number;
  mostViewedLessonTitle: string;
  atRiskStudents: Array<{
    studentId: string;
    studentName: string;
    completionRate: number;
    quizAverage: number;
    lastActive: string;
  }>;
}

export interface LmsOfflineCachedLesson {
  lesson: LmsLesson;
  courseName: string;
  cachedAt: string;
}
