import React from 'react';
import { LivePortalClock } from '../common/LivePortalClock';
import { 
  BookOpen, 
  Users, 
  Calendar, 
  Send, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Award, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Mic
} from 'lucide-react';

export interface TeacherOverviewProps {
  currentUser: any;
  assignedClasses: any[];
  assignedSubjects: any[];
  students: any[];
  assignments: any[];
  lessonsToday: any[];
  pendingScoresCount: number;
  attendanceTodayMarked: boolean;
  upcomingExams: any[];
  recentActivities: any[];
  setActiveTab: (tab: string) => void;
}

export const TeacherOverview: React.FC<TeacherOverviewProps> = ({
  currentUser,
  assignedClasses = [],
  assignedSubjects = [],
  students = [],
  assignments = [],
  lessonsToday = [],
  pendingScoresCount = 0,
  attendanceTodayMarked = false,
  upcomingExams = [],
  recentActivities = [],
  setActiveTab
}) => {
  const teacherName = currentUser?.fullName || currentUser?.name || 'Educator';
  const schoolName = currentUser?.schoolName || 'EDUkenZA Academy';

  // Calculate total students assigned
  const totalAssignedStudents = (students || []).length;

  return (
    <div className="space-y-6">
      {/* Live Portal Clock */}
      <LivePortalClock 
        role="teacher" 
        variant="card" 
        schoolId={currentUser?.schoolId} 
        schoolName={schoolName} 
        onNavigateTab={(t) => setActiveTab(t)} 
      />

      {/* WELCOME BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-[#D4AF37]/30">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-[#002147] text-[10px] font-black uppercase tracking-wider">
              Teacher Dashboard
            </span>
            <span className="text-slate-300 text-xs">| {schoolName}</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Welcome back, {teacherName}!
          </h1>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            Manage your assigned classes, take attendance, upload lesson materials, grade assignments, and send student performance reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 z-10">
          <button
            onClick={() => setActiveTab('attendance')}
            className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => setActiveTab('score-entry')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/20 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#D4AF37]" />
            <span>Score Entry</span>
          </button>
        </div>
      </div>

      {/* KEY STATS METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div 
          onClick={() => setActiveTab('classes-subjects')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Classes</span>
            <BookOpen className="w-4 h-4 text-[#002147] group-hover:scale-110 transition" />
          </div>
          <p className="text-xl font-black text-[#002147] mt-1">{assignedClasses.length}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Assigned to you</p>
        </div>

        <div 
          onClick={() => setActiveTab('classes-subjects')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Subjects</span>
            <Award className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
          </div>
          <p className="text-xl font-black text-[#002147] mt-1">{assignedSubjects.length}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Assigned courses</p>
        </div>

        <div 
          onClick={() => setActiveTab('classes-subjects')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Students</span>
            <Users className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
          </div>
          <p className="text-xl font-black text-[#002147] mt-1">{totalAssignedStudents}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">In your classes</p>
        </div>

        <div 
          onClick={() => setActiveTab('timetable')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Lessons</span>
            <Clock className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
          </div>
          <p className="text-xl font-black text-[#002147] mt-1">{lessonsToday.length}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Scheduled today</p>
        </div>

        <div 
          onClick={() => setActiveTab('assignments')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Pending HW</span>
            <Send className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition" />
          </div>
          <p className="text-xl font-black text-indigo-700 mt-1">{assignments.length}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Active assignments</p>
        </div>

        <div 
          onClick={() => setActiveTab('score-entry')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Scores Due</span>
            <FileText className="w-4 h-4 text-purple-600 group-hover:scale-110 transition" />
          </div>
          <p className="text-xl font-black text-purple-700 mt-1">{pendingScoresCount}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Pending entry</p>
        </div>

        <div 
          onClick={() => setActiveTab('attendance')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Attendance</span>
            {attendanceTodayMarked ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <p className={`text-xs font-black mt-2 ${attendanceTodayMarked ? 'text-emerald-700' : 'text-amber-600'}`}>
            {attendanceTodayMarked ? 'Marked' : 'Pending'}
          </p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Today's register</p>
        </div>

        <div 
          onClick={() => setActiveTab('examinations')}
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Exams</span>
            <TrendingUp className="w-4 h-4 text-rose-600 group-hover:scale-110 transition" />
          </div>
          <p className="text-xl font-black text-rose-700 mt-1">{upcomingExams.length}</p>
          <p className="text-[9px] text-slate-400 mt-0.5 truncate">Upcoming exams</p>
        </div>
      </div>

      {/* TWO COLUMN CONTENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TODAY'S LESSON SCHEDULE & RECENT ACTIVITIES */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* LESSONS TODAY */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#002147]" />
                <h2 className="text-sm font-black text-[#002147] uppercase tracking-wide">
                  Today's Teaching Schedule
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('timetable')}
                className="text-xs font-bold text-[#002147] hover:underline flex items-center gap-1"
              >
                Full Timetable <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {lessonsToday.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold">No scheduled lessons for today</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Check your master timetable for the full weekly schedule.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lessonsToday.map((lesson, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 bg-[#002147] text-white rounded text-[10px] font-black font-mono">
                        {lesson.time || '09:00 AM'}
                      </span>
                      <h3 className="text-xs font-black text-[#002147]">{lesson.subject || 'Subject'}</h3>
                      <p className="text-[11px] text-slate-600 font-medium">Class: {lesson.class || 'Assigned Class'}</p>
                      <p className="text-[10px] text-slate-400">Room: {lesson.room || 'Main Hall'}</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('lesson-plans')}
                      className="text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition"
                    >
                      Lesson Plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENT ACTIVITIES LOG */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-black text-[#002147] uppercase tracking-wide">
                  Recent Activities
                </h2>
              </div>
            </div>

            {recentActivities.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No recent activity logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivities.slice(0, 5).map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                    <div className="p-2 rounded-xl bg-slate-200/60 text-[#002147] mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#002147]" />
                    </div>
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-[#002147]">{act.title || act.action}</p>
                      <p className="text-[11px] text-slate-600">{act.description || act.message}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{act.timestamp || 'Just now'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* QUICK ACTIONS & NOTIFICATIONS SIDE PANEL */}
        <div className="space-y-6">
          
          {/* QUICK LINKS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider border-b border-slate-100 pb-2">
              Quick Shortcuts
            </h3>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => setActiveTab('voice-dictation')}
                className="w-full p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 font-extrabold text-[#002147] flex items-center justify-between transition cursor-pointer shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-amber-600 animate-pulse" />
                  Voice Notes & Dictation
                </span>
                <span className="px-2 py-0.5 bg-[#D4AF37] text-[#002147] text-[10px] font-black rounded-full uppercase">
                  Mic
                </span>
              </button>

              <button
                onClick={() => setActiveTab('lesson-plans')}
                className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  New Lesson Plan
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab('materials')}
                className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Upload Teaching Material
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab('assignments')}
                className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-600" />
                  Create Assignment
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab('behaviour')}
                className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  Log Student Behaviour
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => setActiveTab('communication')}
                className="w-full p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 flex items-center justify-between transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  Send Message to Parent
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* UPCOMING EXAMS NOTICE */}
          <div className="bg-[#002147] text-white p-5 rounded-3xl shadow-lg border border-[#D4AF37]/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                Exam Schedule Notice
              </span>
              <Award className="w-4 h-4 text-[#D4AF37]" />
            </div>

            {upcomingExams.length === 0 ? (
              <p className="text-xs text-slate-300">
                No active examinations scheduled for your assigned classes.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingExams.slice(0, 3).map((ex, idx) => (
                  <div key={idx} className="p-2.5 bg-white/10 rounded-xl border border-white/10 text-xs">
                    <p className="font-bold text-white">{ex.title || ex.examName}</p>
                    <p className="text-[10px] text-slate-300">
                      {ex.className} • {ex.subjectName} ({ex.examDate || 'TBD'})
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveTab('examinations')}
              className="w-full py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition text-center cursor-pointer"
            >
              View All Exams
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
