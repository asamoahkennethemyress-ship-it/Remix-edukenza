import React, { useState, useEffect } from 'react';
import { LivePortalClock } from '../common/LivePortalClock';
import { 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  Award, 
  UserCheck, 
  DollarSign, 
  Megaphone, 
  Clock, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { RealTimeOverviewBanner } from './RealTimeClockSubject';

export interface StudentOverviewProps {
  currentUser: any;
  studentRecord: any;
  setActiveTab: (tab: any) => void;
}

export const StudentOverview: React.FC<StudentOverviewProps> = ({
  currentUser,
  studentRecord,
  setActiveTab
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const className = studentRecord?.className || studentRecord?.classId || currentUser?.className || currentUser?.classId || '';
  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || currentUser?.uid?.slice(0, 8) || '';
  const academicYear = studentRecord?.academicYear || '';
  const currentTerm = studentRecord?.currentTerm || '';

  const [loading, setLoading] = useState(true);
  const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    attendanceRate: 0,
    subjectsCount: 0,
    upcomingAssignments: 0,
    upcomingExams: 0,
    outstandingFees: 0,
    latestResultAvg: 0
  });

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Real-time listener for Published Assignments on Dashboard
  useEffect(() => {
    if (!schoolId) return;

    const studentUid = currentUser?.uid || '';
    const studentClassId = String(className || '').toLowerCase().trim();

    const q = query(
      collection(db, 'assignments'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      const todayStr = new Date().toISOString().split('T')[0];

      snap.forEach(d => {
        const data = d.data();
        const statusClean = String(data.status || '').toLowerCase().trim();
        const isPublished = statusClean === 'published' || data.publishMode === 'Immediately';

        if (!isPublished) return;

        const assClassId = String(data.classId || '').toLowerCase().trim();
        const assClassName = String(data.className || data.targetClass || '').toLowerCase().trim();

        const isMatch = 
          (!assClassId && !assClassName) ||
          (assClassId && studentClassId && assClassId === studentClassId) ||
          (assClassName && studentClassId && assClassName === studentClassId) ||
          (assClassId && studentClassId.includes(assClassId)) ||
          (assClassName && studentClassId.includes(assClassName));

        if (isMatch) {
          const isOverdue = data.dueDate && data.dueDate < todayStr;
          const isDueToday = data.dueDate === todayStr;

          list.push({
            id: d.id,
            ...data,
            isOverdue,
            isDueToday
          });
        }
      });

      list.sort((a, b) => (b.publishedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) - (a.publishedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0));
      setRecentAssignments(list);
      setStats(prev => ({ ...prev, upcomingAssignments: list.length }));
    });

    return () => unsub();
  }, [schoolId, className, currentUser?.uid]);

  // 2. Real-time Announcements & Events & Results & Attendance Listeners
  useEffect(() => {
    if (!schoolId) return;

    // A. Announcements listener
    const annQ = query(collection(db, 'announcements'), where('schoolId', '==', schoolId));
    const unsubAnn = onSnapshot(annQ, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setAnnouncements(list.slice(0, 3));
    }, (err) => console.warn("Real-time announcements error:", err));

    // B. Calendar Events listener
    const calQ = query(collection(db, 'schoolCalendar'), where('schoolId', '==', schoolId));
    const unsubCal = onSnapshot(calQ, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setEvents(list.slice(0, 3));
    }, (err) => console.warn("Real-time calendar error:", err));

    // C. Student Results listener
    const resQ = query(collection(db, 'studentResults'), where('schoolId', '==', schoolId));
    const unsubRes = onSnapshot(resQ, (snap) => {
      let totalScore = 0;
      let scoreCount = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentIdNumber || data.studentUid === currentUser.uid) {
          if (data.total !== undefined) {
            totalScore += Number(data.total);
            scoreCount++;
          }
        }
      });
      const latestAvg = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
      setStats(prev => ({ ...prev, latestResultAvg: latestAvg }));
    }, (err) => console.warn("Real-time results error:", err));

    // D. Attendance listener
    const attQ = query(collection(db, 'studentAttendance'), where('schoolId', '==', schoolId));
    const unsubAtt = onSnapshot(attQ, (snap) => {
      let presentCount = 0;
      let totalAtt = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentIdNumber || data.studentUid === currentUser.uid) {
          totalAtt++;
          if (data.status === 'Present') presentCount++;
        }
      });
      const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;
      setStats(prev => ({ ...prev, attendanceRate }));
    }, (err) => console.warn("Real-time attendance error:", err));

    setLoading(false);

    return () => {
      unsubAnn();
      unsubCal();
      unsubRes();
      unsubAtt();
    };
  }, [schoolId, className, studentIdNumber, currentUser.uid]);

  return (
    <div className="space-y-6">
      
      {/* Live Portal Clock */}
      <LivePortalClock 
        role="student" 
        variant="card" 
        schoolId={schoolId} 
        studentName={currentUser?.fullName || currentUser?.name} 
        onNavigateTab={(t) => setActiveTab(t)} 
      />

      {/* WELCOME BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#D4AF37] text-[#002147] rounded-full text-[10px] font-black uppercase tracking-wider">
              Enrolled Learner
            </span>
            <span className="text-xs text-slate-300 font-mono">ID: {studentIdNumber}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {currentUser.fullName || currentUser.name}!
          </h1>
          <p className="text-slate-300 text-xs">
            {currentUser.schoolName || 'EDUkenZA Academy'} • Class: <span className="font-bold text-white">{className}</span> • {academicYear} ({currentTerm})
          </p>
        </div>
      </div>

      {/* REAL-TIME LIVE SUBJECT & DIGITAL CLOCK BANNER */}
      <RealTimeOverviewBanner 
        schoolId={schoolId} 
        className={className} 
        academicYear={academicYear}
        currentTerm={currentTerm}
        onOpenTimetable={() => setActiveTab('timetable')} 
      />

      {/* DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Attendance Percentage */}
        <div 
          onClick={() => setActiveTab('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#002147]">{stats.attendanceRate}%</p>
          <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Excellent Standing
          </p>
        </div>

        {/* Upcoming Assignments */}
        <div 
          onClick={() => setActiveTab('assignments')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignments</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#002147]">{stats.upcomingAssignments}</p>
          <p className="text-[10px] text-amber-600 font-bold">Pending Due</p>
        </div>

        {/* Upcoming Exams */}
        <div 
          onClick={() => setActiveTab('examinations')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Exams</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-700">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#002147]">{stats.upcomingExams}</p>
          <p className="text-[10px] text-purple-600 font-bold">Term Assessments</p>
        </div>

        {/* Outstanding Fees */}
        <div 
          onClick={() => setActiveTab('payments')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Fees</span>
            <div className="p-2 bg-red-50 rounded-xl text-red-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-[#002147]">
            {stats.outstandingFees > 0 ? `R${stats.outstandingFees}` : 'R0.00'}
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            {stats.outstandingFees > 0 ? 'Payment Due' : 'Fully Settled'}
          </p>
        </div>

        {/* Result Average */}
        <div 
          onClick={() => setActiveTab('results')}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Score</span>
            <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#002147]">{stats.latestResultAvg}%</p>
          <p className="text-[10px] text-teal-600 font-bold">Latest Term Avg</p>
        </div>

      </div>

      {/* RECENT & ACTIVE ASSIGNMENTS SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-[#002147] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#D4AF37]" />
              Recent & Active Assignments
            </h2>
            <p className="text-xs text-slate-500">Live feed of assignments published for {className}</p>
          </div>

          <button
            onClick={() => setActiveTab('assignments')}
            className="text-xs font-bold text-[#002147] hover:underline flex items-center gap-1"
          >
            <span>My Assignments</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
          </button>
        </div>

        {recentAssignments.length === 0 ? (
          <div className="text-center p-8 text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No active published assignments for your class right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentAssignments.slice(0, 6).map((ass) => (
              <div 
                key={ass.id} 
                onClick={() => setActiveTab('assignments')}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-[#002147] transition cursor-pointer flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase text-[#002147] bg-[#002147]/5 px-2 py-0.5 rounded-md">
                      {ass.subjectName || ass.subjectId || 'Subject'}
                    </span>
                    {ass.isOverdue ? (
                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                        Overdue
                      </span>
                    ) : ass.isDueToday ? (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        Due Today
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-[#002147] group-hover:text-blue-900 transition line-clamp-2">
                    {ass.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    Teacher: {ass.teacherName || 'Instructor'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-[#D4AF37]" />
                    Due: {ass.dueDate || 'No Date'}
                  </span>
                  <span className="font-bold text-[#002147] flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ANNOUNCEMENTS & EVENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* RECENT ANNOUNCEMENTS */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-[#002147] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#D4AF37]" />
              School Broadcasts
            </h2>
            <button
              onClick={() => setActiveTab('announcements')}
              className="text-xs font-bold text-[#002147] hover:underline"
            >
              All
            </button>
          </div>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center p-6 text-slate-400 text-xs">
                No active announcements broadcasted.
              </div>
            ) : (
              announcements.map((ann, i) => (
                <div key={ann.id || i} className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">
                    {ann.priority || 'General Notice'}
                  </span>
                  <h3 className="text-xs font-bold text-[#002147]">{ann.title}</h3>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{ann.message || ann.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* UPCOMING EVENTS */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-[#002147] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              Upcoming Events
            </h2>
            <button
              onClick={() => setActiveTab('calendar')}
              className="text-xs font-bold text-[#002147] hover:underline"
            >
              Calendar
            </button>
          </div>

          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="p-3 text-xs text-slate-500">
                <p className="font-bold text-[#002147]">End of Term Examinations</p>
                <p className="text-[11px] text-slate-400">Scheduled for November 18 - 25</p>
              </div>
            ) : (
              events.map((ev, i) => (
                <div key={ev.id || i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-0.5">
                  <p className="text-xs font-bold text-[#002147]">{ev.title || ev.eventName}</p>
                  <p className="text-[10px] text-slate-500">{ev.eventDate || ev.date || 'Upcoming'}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
