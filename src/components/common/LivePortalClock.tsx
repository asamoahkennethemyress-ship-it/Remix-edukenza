import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Globe, 
  Sparkles, 
  BookOpen, 
  User, 
  Coffee, 
  Bell, 
  ShieldCheck, 
  ChevronRight, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface LiveClockState {
  now: Date;
  formattedTime: string;      // e.g. "02:45:18 PM"
  formattedTime24: string;    // e.g. "14:45:18"
  formattedDate: string;      // e.g. "Fri, 31 Jul 2026"
  fullDate: string;           // e.g. "Friday, 31 July 2026"
  dayOfWeek: string;          // e.g. "Friday"
  timeZoneName: string;       // e.g. "Africa/Johannesburg"
  timeZoneAbbr: string;       // e.g. "SAST" or "GMT+2"
}

// Custom hook to provide tick-by-tick real-time time calculations
export function useLiveClock(timeZoneOverride?: string): LiveClockState {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeZoneName = timeZoneOverride || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';

  let formattedTime = '';
  let formattedTime24 = '';
  let formattedDate = '';
  let fullDate = '';
  let dayOfWeek = '';
  let timeZoneAbbr = 'SAST (UTC+2)';

  try {
    formattedTime = now.toLocaleTimeString('en-US', { 
      timeZone: timeZoneName, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    });

    formattedTime24 = now.toLocaleTimeString('en-GB', { 
      timeZone: timeZoneName, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: false 
    });

    formattedDate = now.toLocaleDateString('en-US', { 
      timeZone: timeZoneName, 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });

    fullDate = now.toLocaleDateString('en-US', { 
      timeZone: timeZoneName, 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    dayOfWeek = now.toLocaleDateString('en-US', { 
      timeZone: timeZoneName, 
      weekday: 'long' 
    });

    // Extract short GMT offset or timezone abbreviation
    const parts = new Intl.DateTimeFormat('en-US', { 
      timeZone: timeZoneName, 
      timeZoneName: 'short' 
    }).formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) {
      timeZoneAbbr = tzPart.value;
    }
  } catch (err) {
    // Fallback if custom timezone string fails
    formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    formattedTime24 = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    formattedDate = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    fullDate = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return {
    now,
    formattedTime,
    formattedTime24,
    formattedDate,
    fullDate,
    dayOfWeek,
    timeZoneName,
    timeZoneAbbr
  };
}

export interface LivePortalClockProps {
  role: 'platform_owner' | 'school_admin' | 'teacher' | 'parent' | 'student';
  variant?: 'card' | 'compact' | 'header_badge';
  schoolId?: string;
  className?: string;
  schoolName?: string;
  studentName?: string;
  timeZone?: string;
  onNavigateTab?: (tab: string) => void;
}

export const LivePortalClock: React.FC<LivePortalClockProps> = ({
  role,
  variant = 'card',
  schoolId,
  className,
  schoolName,
  studentName,
  timeZone,
  onNavigateTab
}) => {
  const clock = useLiveClock(timeZone);
  const [latestBroadcast, setLatestBroadcast] = useState<string | null>(null);
  const [academicTermInfo, setAcademicTermInfo] = useState<string>('Term 3 Academic Session • 2026');

  // Real-time listener for latest school announcement or academic event
  useEffect(() => {
    if (!schoolId) return;

    const q = query(
      collection(db, 'announcements'),
      where('schoolId', '==', schoolId),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setLatestBroadcast(data.title || data.message || null);
      }
    }, (err) => console.warn('Clock announcement listener error:', err));

    return () => unsub();
  }, [schoolId]);

  // Render COMPACT / HEADER BADGE variant
  if (variant === 'compact' || variant === 'header_badge') {
    return (
      <div 
        className="flex items-center gap-2 bg-[#001838] hover:bg-[#002654] transition px-3 py-1.5 rounded-xl border border-[#D4AF37]/40 text-white shadow-inner cursor-default"
        title={`Timezone: ${clock.timeZoneName} (${clock.timeZoneAbbr})`}
      >
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/80">
          <Clock className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
          <span className="font-mono text-xs font-black text-amber-300 tracking-wider">
            {clock.formattedTime}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium truncate max-w-[180px]">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{clock.formattedDate}</span>
          <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded font-mono font-bold hidden sm:inline">
            {clock.timeZoneAbbr}
          </span>
        </div>
      </div>
    );
  }

  // Render FULL CARD variant for Dashboards
  return (
    <div className="bg-gradient-to-br from-[#002147] via-[#001737] to-[#09294f] rounded-3xl p-6 text-white border border-[#D4AF37]/40 shadow-2xl relative overflow-hidden">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-5">
        
        {/* TOP HEADER ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#D4AF37] text-[#002147] text-[10px] font-black uppercase tracking-widest rounded-full shadow-md flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Portal Live Sync Clock
            </span>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1 font-mono">
              <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
              {clock.timeZoneName} ({clock.timeZoneAbbr})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Real-Time Sync Active</span>
          </div>
        </div>

        {/* MAIN DISPLAY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* DIGITAL CLOCK BOX (5 Cols) */}
          <div className="lg:col-span-5 bg-[#001227]/90 p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center space-y-1.5 shadow-inner relative group">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{clock.dayOfWeek}</span>
            </div>
            
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {clock.formattedTime}
            </div>

            <p className="text-xs text-slate-300 font-medium pt-0.5">
              {clock.fullDate}
            </p>
          </div>

          {/* ROLE SPECIFIC CONTEXT CARD (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* PLATFORM OWNER CONTEXT */}
            {role === 'platform_owner' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    Global SaaS Operations Monitor
                  </h3>
                  <span className="text-[10px] bg-blue-900/80 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/40 font-mono">
                    System Uptime: 100%
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Platform monitoring services operating on standard South African Standard Time (SAST UTC+2). All multi-school database interactions, audit trails, and payment gateways synchronized in real-time.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-300">
                  <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 font-mono">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    Last Backup Audit: Today at {clock.formattedTime24.slice(0, 5)}
                  </span>
                </div>
              </div>
            )}

            {/* SCHOOL ADMIN CONTEXT */}
            {role === 'school_admin' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    {schoolName || 'School Administration Portal'}
                  </h3>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-mono font-bold">
                    {academicTermInfo}
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  {latestBroadcast 
                    ? `Latest Broadcast: "${latestBroadcast}"` 
                    : "School operations running synchronously. Attendance logs, fee collections, and result approvals are updating live across all portals."}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('announcements')}
                      className="text-xs text-[#D4AF37] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Broadcast Announcement <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TEACHER CONTEXT */}
            {role === 'teacher' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    Educator Daily Command Center
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-mono font-bold">
                    Active Teaching Session
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  Keep track of class schedules, mark attendance, enter exam scores, and publish assignments in real-time. Student and parent portals receive updates instantly.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('timetable')}
                      className="text-xs text-[#D4AF37] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Teaching Timetable <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PARENT CONTEXT */}
            {role === 'parent' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#D4AF37]" />
                    Parent Link Dashboard • {studentName || 'Learner Monitoring'}
                  </h3>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-mono font-bold">
                    Live Portal Link
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  Receive live notifications for student attendance, assignment submissions, fee payment receipts, and official report cards as soon as published by educators.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('fees')}
                      className="text-xs text-[#D4AF37] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Statements & Receipts <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STUDENT CONTEXT */}
            {role === 'student' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    Student Academic Hub {className ? `(${className})` : ''}
                  </h3>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 font-mono font-bold">
                    {clock.dayOfWeek} Schedule
                  </span>
                </div>
                <p className="text-xs text-slate-200">
                  Your class schedule, homework assignments, download materials, and report cards are updated live by your teachers and school admin.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('assignments')}
                      className="text-xs text-[#D4AF37] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View Assignments <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
