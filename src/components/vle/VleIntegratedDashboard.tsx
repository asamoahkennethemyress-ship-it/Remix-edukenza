import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Sparkles, 
  BookOpen, 
  Users, 
  BarChart2, 
  ArrowRight, 
  TrendingUp, 
  AlertCircle,
  Play
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { GoogleMeetClass } from '../../services/googleMeetService';
import { GoogleMeetCard } from '../common/GoogleMeetCard';
import { VirtualClassroomRoomModal } from './VirtualClassroomRoomModal';

interface VleIntegratedDashboardProps {
  schoolId: string;
  userRole: 'teacher' | 'student' | 'school_admin' | 'parent';
  userId: string;
  userName: string;
  userClassName?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VleIntegratedDashboard: React.FC<VleIntegratedDashboardProps> = ({
  schoolId,
  userRole,
  userId,
  userName,
  userClassName,
  showToast
}) => {
  const [todayClasses, setTodayClasses] = useState<GoogleMeetClass[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<GoogleMeetClass[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active VLE Room Modal
  const [activeVleMeeting, setActiveVleMeeting] = useState<GoogleMeetClass | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch Google Meet Classes
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    let q = query(
      collection(db, 'googleMeetClasses'),
      where('schoolId', '==', schoolId)
    );

    if (userRole === 'teacher') {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('schoolId', '==', schoolId),
        where('teacherId', '==', userId)
      );
    } else if (userRole === 'student' && userClassName) {
      q = query(
        collection(db, 'googleMeetClasses'),
        where('schoolId', '==', schoolId),
        where('className', '==', userClassName)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const all: GoogleMeetClass[] = [];
      snap.forEach(d => all.push({ id: d.id, ...d.data() } as GoogleMeetClass));
      
      // Filter today vs upcoming
      const today = all.filter(c => c.date === todayStr);
      const upcoming = all.filter(c => c.date !== todayStr);

      setTodayClasses(today);
      setUpcomingClasses(upcoming);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, userRole, userId, userClassName, todayStr]);

  // 2. Fetch Attendance Records
  useEffect(() => {
    if (!schoolId) return;

    let q = query(
      collection(db, 'onlineClassAttendance'),
      where('schoolId', '==', schoolId)
    );

    if (userRole === 'student') {
      q = query(
        collection(db, 'onlineClassAttendance'),
        where('schoolId', '==', schoolId),
        where('studentId', '==', userId)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const records: any[] = [];
      snap.forEach(d => records.push({ id: d.id, ...d.data() }));
      setAttendanceRecords(records);
    });

    return () => unsub();
  }, [schoolId, userRole, userId]);

  // 3. Fetch Pending Assignments
  useEffect(() => {
    if (!schoolId) return;

    let q = query(
      collection(db, 'assignments'),
      where('schoolId', '==', schoolId)
    );

    if (userRole === 'student' && userClassName) {
      q = query(
        collection(db, 'assignments'),
        where('schoolId', '==', schoolId),
        where('className', '==', userClassName)
      );
    } else if (userRole === 'teacher') {
      q = query(
        collection(db, 'assignments'),
        where('schoolId', '==', schoolId),
        where('teacherId', '==', userId)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPendingAssignments(list);
    });

    return () => unsub();
  }, [schoolId, userRole, userId, userClassName]);

  const ongoingClass = todayClasses.find(c => (c.status as string) === 'Live' || c.status === 'active');
  const attendanceRate = attendanceRecords.length > 0 
    ? Math.round((attendanceRecords.filter(r => r.status === 'Present').length / attendanceRecords.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-[#D4AF37]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-400 text-slate-900 font-black text-[10px] rounded-full uppercase tracking-wider">
              ENTERPRISE VLE DASHBOARD
            </span>
            {userClassName && (
              <span className="text-amber-300 text-xs font-bold">Class: {userClassName}</span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Welcome back, {userName}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Access live Google Meet sessions, real-time attendance logs, active homework assignments, and AI learning briefs in one unified portal.
          </p>
        </div>

        {ongoingClass && (
          <div className="bg-emerald-500/20 border-2 border-emerald-400/60 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-lg animate-pulse">
            <div className="p-3 bg-emerald-500 text-white rounded-xl font-bold">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider block">CLASS IS LIVE NOW</span>
              <h4 className="text-sm font-bold text-white">{ongoingClass.subject}</h4>
              <button
                onClick={() => setActiveVleMeeting(ongoingClass)}
                className="mt-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Join VLE Room
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-800 rounded-2xl">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's Live Classes</span>
            <span className="text-xl font-black text-[#002147]">{todayClasses.length} Scheduled</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
            <span className="text-xl font-black text-emerald-600">{attendanceRate}% Present</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pending Homework</span>
            <span className="text-xl font-black text-amber-600">{pendingAssignments.length} Assignments</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-800 rounded-2xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Upcoming Sessions</span>
            <span className="text-xl font-black text-indigo-600">{upcomingClasses.length} Future</span>
          </div>
        </div>

      </div>

      {/* TODAY'S CLASSES & ASSIGNMENTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT 2 COLS: TODAY'S LIVE CLASSES */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" /> Today's Live Virtual Classes
            </h3>
            <span className="text-xs font-bold text-slate-400">{todayStr}</span>
          </div>

          {todayClasses.length === 0 ? (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold">No virtual classes scheduled for today.</p>
              <p className="text-slate-400 text-[11px]">Check back later or view upcoming scheduled sessions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayClasses.map((meeting) => (
                <GoogleMeetCard
                  key={meeting.id}
                  meeting={meeting}
                  userRole={userRole}
                  userClassName={userClassName}
                  showToast={showToast}
                  onOpenVleRoom={(m) => setActiveVleMeeting(m)}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COL: PENDING ASSIGNMENTS & HOMEWORK */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" /> Integrated Homework & Tasks
          </h3>

          {pendingAssignments.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
              No active homework assignments found.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {pendingAssignments.map((hw) => (
                <div key={hw.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[9px] rounded-md uppercase">
                      {hw.subject || 'General'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Due: {hw.dueDate}</span>
                  </div>
                  <h4 className="text-xs font-bold text-[#002147]">{hw.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{hw.instructions}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* VLE ROOM MODAL */}
      {activeVleMeeting && (
        <VirtualClassroomRoomModal
          meeting={activeVleMeeting}
          isOpen={!!activeVleMeeting}
          onClose={() => setActiveVleMeeting(null)}
          currentUser={{ uid: userId, displayName: userName }}
          userRole={userRole}
          showToast={showToast}
        />
      )}

    </div>
  );
};
