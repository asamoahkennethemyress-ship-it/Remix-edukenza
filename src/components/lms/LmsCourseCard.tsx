import React from 'react';
import { 
  BookOpen, 
  User, 
  Clock, 
  CheckCircle2, 
  BarChart2, 
  Sparkles,
  FileText,
  HelpCircle,
  Archive
} from 'lucide-react';
import { LmsCourse } from '../../types/lms';

interface LmsCourseCardProps {
  course: LmsCourse;
  progressPercent?: number;
  onSelect: (course: LmsCourse) => void;
  userRole: 'school_admin' | 'teacher' | 'student' | 'parent';
  onEdit?: (course: LmsCourse) => void;
  onArchive?: (course: LmsCourse) => void;
}

export const LmsCourseCard: React.FC<LmsCourseCardProps> = ({
  course,
  progressPercent = 0,
  onSelect,
  userRole,
  onEdit,
  onArchive
}) => {
  const isCompleted = progressPercent >= 100;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col overflow-hidden">
      {/* Cover Image & Badges */}
      <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
        <img 
          src={course.coverImage || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80'} 
          alt={course.courseName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-800 backdrop-blur-md shadow-sm border border-white/20">
            {course.subject}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-600/90 text-white backdrop-blur-md">
              {course.className}
            </span>
            {course.status === 'archived' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500 text-white">
                Archived
              </span>
            )}
          </div>
        </div>

        {/* Course Code & Term */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <span className="text-[11px] font-mono tracking-wider uppercase text-indigo-300 font-bold bg-slate-900/80 px-2 py-0.5 rounded border border-indigo-500/30">
              {course.courseCode}
            </span>
            <div className="text-xs text-slate-300 font-medium mt-1">
              {course.academicYear} • {course.term}
            </div>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 
            onClick={() => onSelect(course)}
            className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 cursor-pointer"
          >
            {course.courseName}
          </h3>
          <p className="text-slate-600 text-xs mt-2 line-clamp-2 leading-relaxed">
            {course.description}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
            <User className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="truncate font-medium">{course.teacherName}</span>
          </div>
        </div>

        {/* Metrics & Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          {userRole === 'student' || userRole === 'parent' ? (
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1 text-slate-600">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-500" /> Progress
                </span>
                <span className={isCompleted ? 'text-emerald-600 font-bold' : 'text-slate-900 font-bold'}>
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> {course.totalLessons || 0} Lessons
              </span>
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> {course.totalQuizzes || 0} Quizzes
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => onSelect(course)}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-semibold text-xs transition-colors duration-200 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" /> Enter Course
            </button>

            {(userRole === 'school_admin' || userRole === 'teacher') && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(course)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs font-medium"
                    title="Edit Course Settings"
                  >
                    Edit
                  </button>
                )}
                {onArchive && (
                  <button
                    onClick={() => onArchive(course)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 transition-colors text-xs font-medium"
                    title="Archive Course"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
