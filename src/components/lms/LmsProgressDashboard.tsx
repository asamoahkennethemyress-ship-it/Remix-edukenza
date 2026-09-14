import React from 'react';
import { 
  BarChart2, 
  CheckCircle2, 
  Award, 
  BookOpen, 
  TrendingUp, 
  FileText
} from 'lucide-react';
import { LmsProgress, LmsCourse } from '../../types/lms';

interface LmsProgressDashboardProps {
  progress?: LmsProgress | null;
  courses: LmsCourse[];
  userRole: 'school_admin' | 'teacher' | 'student' | 'parent';
  studentName?: string;
  allProgressMap?: Record<string, LmsProgress>;
}

export const LmsProgressDashboard: React.FC<LmsProgressDashboardProps> = ({
  progress,
  courses,
  userRole,
  studentName = 'Student',
  allProgressMap = {}
}) => {
  const overallCompletion = progress ? progress.overallPercentage : 0;
  const completedLessonsCount = progress ? progress.completedLessonIds.length : 0;
  
  const quizScoresList = Object.values(progress?.quizScores || {}) as Array<{ percentage: number }>;
  const avgQuizScore = quizScoresList.length > 0
    ? Math.round(quizScoresList.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / quizScoresList.length)
    : 0;

  const assignmentsCompleted = Object.keys(progress?.assignmentStatus || {}).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Real-time Analytics & Learning Telemetry
          </div>
          <h2 className="text-2xl font-black text-white">
            {userRole === 'parent' ? `${studentName}'s LMS Progress` : 'Learning Analytics Hub'}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Tracking lesson completion, quiz accuracy, and course mastery scores.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
          <div>
            <div className="text-xs text-slate-300 font-medium">Course Mastery</div>
            <div className="text-2xl font-black text-emerald-400">{overallCompletion}%</div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-emerald-400 flex items-center justify-center font-bold text-xs text-white">
            {overallCompletion}%
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Lessons Completed</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{completedLessonsCount}</div>
          <div className="text-[11px] text-slate-500">Completed study units</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Quiz Accuracy</span>
            <Award className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {quizScoresList.length > 0 ? `${avgQuizScore}% Avg` : 'No Attempts'}
          </div>
          <div className="text-[11px] text-slate-500">
            {quizScoresList.length} test{quizScoresList.length === 1 ? '' : 's'} recorded
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Assignments Submitted</span>
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{assignmentsCompleted}</div>
          <div className="text-[11px] text-slate-500">Coursework submitted</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Enrolled Courses</span>
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{courses.length}</div>
          <div className="text-[11px] text-slate-500">Curriculum enrollment</div>
        </div>
      </div>

      {/* Courses Breakdown Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Course Mastery Breakdown</h3>

        {courses.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No courses enrolled currently.
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(c => {
              const courseProgress = allProgressMap[c.id] || (c.id === progress?.courseId ? progress : null);
              const coursePercent = courseProgress?.overallPercentage || 0;
              const isCompleted = coursePercent >= 100;

              return (
                <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-indigo-600 uppercase">{c.courseCode}</div>
                    <div className="text-sm font-bold text-slate-900">{c.courseName}</div>
                    <div className="text-xs text-slate-500">Instructor: {c.teacherName || 'Assigned Faculty'}</div>
                  </div>

                  <div className="w-full sm:w-48 space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-600">Completion</span>
                      <span className={isCompleted ? 'text-emerald-600' : 'text-slate-900'}>{coursePercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${coursePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
