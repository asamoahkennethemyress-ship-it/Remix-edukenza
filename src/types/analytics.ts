export type AnalyticsTimeFrame = 'daily' | 'weekly' | 'monthly' | 'term' | 'yearly' | 'custom';

export type UserRoleType = 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';

export interface AnalyticsFilter {
  timeFrame: AnalyticsTimeFrame;
  startDate?: string;
  endDate?: string;
  academicYear?: string;
  term?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  studentId?: string;
  department?: string;
}

export interface AiInsightItem {
  id: string;
  category: 'academic' | 'attendance' | 'financial' | 'risk' | 'growth' | 'teacher';
  severity: 'info' | 'positive' | 'warning' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  metricChange?: string;
  recommendedAction?: string;
  affectedCount?: number;
}

export interface RiskAlertItem {
  id: string;
  type: 'academic_decline' | 'attendance_drop' | 'behavior_issue' | 'fee_payment_risk' | 'teacher_overload' | 'student_burnout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  entityType: 'student' | 'class' | 'teacher' | 'school';
  entityId: string;
  entityName: string;
  details: string;
  metricValue: string;
  threshold: string;
  detectedAt: string;
  recommendedIntervention: string;
  status: 'active' | 'under_review' | 'resolved';
}

export interface AcademicAnalyticsData {
  overallAverage: number;
  passRate: number;
  totalExamsGraded: number;
  topPerformingSubject: string;
  subjectNeedingImprovement: string;
  subjectPerformance: Array<{
    subject: string;
    average: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
  }>;
  classPerformance: Array<{
    className: string;
    average: number;
    passRate: number;
    studentCount: number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  historicalTrend: Array<{
    period: string;
    average: number;
    target: number;
  }>;
}

export interface StudentPerformanceData {
  studentId: string;
  studentName: string;
  className: string;
  overallGpa: number;
  overallPercentage: number;
  learningProgressScore: number;
  studyTimeHoursWeekly: number;
  assignmentCompletionRate: number;
  quizAverage: number;
  attendanceRate: number;
  weeklyImprovementPercent: number;
  monthlyImprovementPercent: number;
  subjectBreakdown: Array<{
    subject: string;
    currentScore: number;
    strengthLevel: 'Weak' | 'Moderate' | 'Strong' | 'Mastered';
    recentTrend: 'improving' | 'stable' | 'declining';
  }>;
  weakTopics: string[];
  strongTopics: string[];
  expectedExamPerformance: number;
  targetGradeProbability: number;
  subjectsRequiringMoreStudy: string[];
  studyPlanner: Array<{
    day: string;
    recommendedSubject: string;
    durationMinutes: number;
    focusTopic: string;
  }>;
}

export interface TeacherPerformanceData {
  teacherId: string;
  teacherName: string;
  department: string;
  studentEngagementScore: number;
  assignmentCompletionRate: number;
  quizPassRate: number;
  attendanceRate: number;
  gradingSpeedDays: number;
  workloadIndex: number; // 0-100 scale
  studentPassRateUnderTeacher: number;
  weakLearningTopics: string[];
  strongLearningTopics: string[];
  teachingRecommendations: string[];
  suggestedLessonImprovements: string[];
  suggestedRevisionTopics: string[];
  remedialInterventionsCount: number;
}

export interface AttendanceAnalyticsData {
  overallAttendanceRate: number;
  presentTodayCount: number;
  absentTodayCount: number;
  lateTodayCount: number;
  excusedCount: number;
  dailyTrend: Array<{ date: string; presentRate: number; absentRate: number; lateRate: number }>;
  weeklyTrend: Array<{ week: string; presentRate: number }>;
  monthlyTrend: Array<{ month: string; presentRate: number }>;
  chronicAbsenteeismRisk: Array<{
    studentId: string;
    studentName: string;
    className: string;
    attendanceRate: number;
    consecutiveAbsences: number;
    predictedAbsenceRisk: 'high' | 'critical';
  }>;
  predictedLateArrivals: number;
}

export interface FinancialAnalyticsData {
  totalExpectedRevenue: number;
  totalCollected: number;
  totalOutstanding: number;
  feeCollectionEfficiency: number;
  monthlyRevenueTrend: Array<{ month: string; collected: number; expected: number }>;
  paymentDelayProbability: Array<{
    studentId: string;
    studentName: string;
    className: string;
    amountDue: number;
    delayProbability: number;
    riskCategory: 'low' | 'medium' | 'high';
  }>;
  revenueForecast: Array<{ period: string; predictedRevenue: number }>;
  cashFlowEstimate: number;
}

export interface EnrollmentAnalyticsData {
  totalStudents: number;
  newEnrollmentsThisTerm: number;
  enrollmentGrowthRate: number;
  retentionRate: number;
  graduationRate: number;
  promotionRate: number;
  gradeWiseEnrollment: Array<{ grade: string; count: number }>;
  departmentBreakdown: Array<{ department: string; count: number }>;
  enrollmentHistory: Array<{ period: string; count: number }>;
}

export interface AiPredictionsData {
  predictedExamPassRate: number;
  predictedAverageScore: number;
  promotionProbability: number;
  graduationProbability: number;
  subjectMasteryIndex: number;
  studentsLikelyToFail: Array<{ studentId: string; studentName: string; className: string; predictedScore: number }>;
  studentsLikelyToExcel: Array<{ studentId: string; studentName: string; className: string; predictedScore: number }>;
  scholarshipPotentialStudents: Array<{ studentId: string; studentName: string; gpa: number; score: number }>;
  giftedStudents: Array<{ studentId: string; studentName: string; className: string; strengths: string }>;
  studentsNeedingIntervention: Array<{ studentId: string; studentName: string; className: string; reason: string }>;
}

export interface BehavioralInsightsData {
  totalIncidentsLogged: number;
  totalMeritsAwarded: number;
  positiveBehaviorPercentage: number;
  commonIncidentTypes: Array<{ type: string; count: number }>;
  classBehaviorDistribution: Array<{ className: string; score: number }>;
}

export interface LearningProgressData {
  totalLessonsCompleted: number;
  averageQuizScore: number;
  overallSkillMastery: number;
  topicMasteryBreakdown: Array<{ subject: string; topic: string; masteryPercentage: number }>;
}

export interface SchoolHealthScoreData {
  overallScore: number; // 0-100
  rating: 'Critical' | 'Needs Attention' | 'Good' | 'Excellent' | 'Outstanding';
  academicHealth: number; // 30% weight
  attendanceHealth: number; // 25% weight
  financialHealth: number; // 25% weight
  teacherEngagementHealth: number; // 10% weight
  studentRetentionHealth: number; // 10% weight
  historicalHealthTrend: Array<{ month: string; score: number }>;
}

export interface ExecutiveDashboardData {
  // Owner Platform Metrics
  totalSchools: number;
  activeSchoolsCount: number;
  totalStudentsPlatform: number;
  totalTeachersPlatform: number;
  totalParentsPlatform: number;
  totalRevenuePlatform: number;
  subscriptionGrowthRate: number;
  aiTokensUsageMonthly: number;
  systemHealthStatus: 'Healthy' | 'Degraded' | 'Maintenance';
  platformResponseLatencyMs: number;
  storageUsageGb: number;
  firestoreReadsDaily: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  failedLogins24h: number;
  securityAlertsActive: number;
  backupStatus: string;
  fastestGrowingSchools: Array<{ id: string; name: string; growthRate: number }>;
  schoolsDecliningEnrollment: Array<{ id: string; name: string; dropRate: number }>;
  schoolsNeedingIntervention: Array<{ id: string; name: string; issue: string }>;
}

export interface AnalyticsFullDataset {
  filter: AnalyticsFilter;
  schoolHealth: SchoolHealthScoreData;
  academic: AcademicAnalyticsData;
  studentPerf?: StudentPerformanceData;
  teacherPerf: TeacherPerformanceData[];
  attendance: AttendanceAnalyticsData;
  financial: FinancialAnalyticsData;
  enrollment: EnrollmentAnalyticsData;
  predictions: AiPredictionsData;
  riskAlerts: RiskAlertItem[];
  behavioral: BehavioralInsightsData;
  learningProgress: LearningProgressData;
  executive: ExecutiveDashboardData;
  aiInsights: AiInsightItem[];
  lastUpdated: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  chartData?: {
    type: 'bar' | 'line' | 'pie';
    title: string;
    dataKeyX: string;
    dataKeyY: string;
    items: Array<Record<string, any>>;
  };
  recommendations?: string[];
  kpiHighlight?: {
    label: string;
    value: string;
    change?: string;
  };
}
