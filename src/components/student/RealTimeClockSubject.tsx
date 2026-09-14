import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  BookOpen, 
  MapPin, 
  User, 
  Sparkles, 
  ChevronRight, 
  Coffee, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  CalendarX,
  GraduationCap
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface SchedulePeriod {
  id?: string;
  time: string;                  // e.g. "08:00 AM - 08:50 AM"
  startTimeFormatted: string;    // e.g. "08:00 AM"
  endTimeFormatted: string;      // e.g. "08:50 AM"
  subject: string;
  teacher: string;
  room: string;
  startMinutes: number;          // minutes from midnight
  endMinutes: number;            // minutes from midnight
  day: string;                   // e.g. "Monday"
  classId?: string;
  className?: string;
}

export interface RealTimeScheduleState {
  currentTime: Date;
  formattedTime: string;         // e.g. "09:21:49 AM"
  dayName: string;               // e.g. "Wednesday"
  formattedDate: string;         // e.g. "Wed, 29 Jul 2026"
  isLive: boolean;               // true if a class is currently in session
  currentSubject: SchedulePeriod | null;
  nextSubject: SchedulePeriod | null;
  tomorrowFirstSubject: SchedulePeriod | null;
  status: 'LIVE' | 'NO_CLASS' | 'BEFORE_SCHOOL' | 'AFTER_SCHOOL' | 'WEEKEND' | 'HOLIDAY' | 'EXAM_DAY' | 'NO_TIMETABLE';
  statusHeading: string;         // e.g. "Class in Session", "No Class in Session", "School Day Completed", "Weekend", "School Holiday", "Examination Day", "No Timetable Scheduled"
  statusDetail: string;          // supporting text
  progressPercent: number;       // 0 to 100 for current subject
  minutesRemaining: number;      // minutes left in current subject or until next class
  todaySchedule: SchedulePeriod[];
  loading: boolean;
  specialEventTitle?: string;
}

// Helpers for time calculations
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const isPM = /PM/i.test(clean);
  const isAM = /AM/i.test(clean);
  const rawParts = clean.replace(/(AM|PM)/gi, '').trim().split(':');
  let hours = parseInt(rawParts[0], 10) || 0;
  const minutes = parseInt(rawParts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function formatMinutesToTime(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = h < 10 ? `0${h}` : `${h}`;
  const mStr = m < 10 ? `0${m}` : `${m}`;
  return `${hStr}:${mStr} ${ampm}`;
}

export function extractPeriodTimes(startTime?: string, endTime?: string, timeRange?: string) {
  let startMins = 0;
  let endMins = 0;

  if (startTime && endTime) {
    startMins = parseTimeToMinutes(startTime);
    endMins = parseTimeToMinutes(endTime);
  } else if (timeRange) {
    const parts = timeRange.split('-');
    if (parts.length === 2) {
      startMins = parseTimeToMinutes(parts[0]);
      endMins = parseTimeToMinutes(parts[1]);
    } else {
      startMins = parseTimeToMinutes(timeRange);
      endMins = startMins + 45;
    }
  }

  if (endMins <= startMins && startMins > 0) {
    endMins = startMins + 45;
  }

  const startTimeFormatted = startTime ? startTime.trim() : formatMinutesToTime(startMins);
  const endTimeFormatted = endTime ? endTime.trim() : formatMinutesToTime(endMins);
  const formattedRange = (startTime && endTime) 
    ? `${startTime.trim()} - ${endTime.trim()}` 
    : `${startTimeFormatted} - ${endTimeFormatted}`;

  return { startMins, endMins, startTimeFormatted, endTimeFormatted, formattedRange };
}

// Custom Hook to manage real-time clock and active subject calculations from Firestore
export function useRealTimeSchedule(
  schoolId?: string, 
  className?: string, 
  academicYear?: string, 
  currentTerm?: string
): RealTimeScheduleState {
  const [now, setNow] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [weeklyTimetable, setWeeklyTimetable] = useState<Record<string, SchedulePeriod[]>>({});
  const [specialEvents, setSpecialEvents] = useState<any[]>([]);

  // 1. Ticking clock every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Real-time Firestore Listener for Timetables
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'timetables'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const scheduleMap: Record<string, SchedulePeriod[]> = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: []
      };

      const userClassClean = String(className || '').toLowerCase().trim();

      snap.forEach((docSnap) => {
        const data = docSnap.data();

        // Must be published
        const isPublished = data.status && String(data.status).toLowerCase() === 'published';
        if (!isPublished) return;

        // Check class match
        const docClass = String(data.className || data.targetClass || data.classId || '').toLowerCase().trim();
        const matchesClass = 
          !userClassClean || 
          !docClass || 
          docClass === userClassClean || 
          userClassClean.includes(docClass) || 
          docClass.includes(userClassClean);

        if (!matchesClass) return;

        // Check academic year & term if specified
        if (academicYear && data.academicYear && String(data.academicYear).trim() !== String(academicYear).trim()) {
          return;
        }

        // Handle case 1: Document represents an array of periods for a day
        if (Array.isArray(data.periods)) {
          const dayName = data.day ? String(data.day).charAt(0).toUpperCase() + String(data.day).slice(1) : 'Monday';
          if (!scheduleMap[dayName]) scheduleMap[dayName] = [];

          data.periods.forEach((p: any, idx: number) => {
            const times = extractPeriodTimes(p.startTime, p.endTime, p.time || p.periodTime);
            scheduleMap[dayName].push({
              id: `${docSnap.id}-${idx}`,
              time: times.formattedRange,
              startTimeFormatted: times.startTimeFormatted,
              endTimeFormatted: times.endTimeFormatted,
              subject: p.subjectName || p.subject || 'Subject',
              teacher: p.teacherName || p.teacher || 'Instructor',
              room: p.room || p.classroom || p.venue || 'Classroom',
              startMinutes: p.startMinutes || times.startMins,
              endMinutes: p.endMinutes || times.endMins,
              day: dayName,
              className: data.className || data.targetClass
            });
          });
        } 
        // Handle case 2: Document is a single timetable slot
        else if (data.subject || data.subjectName) {
          const dayName = data.day ? String(data.day).charAt(0).toUpperCase() + String(data.day).slice(1) : 'Monday';
          if (!scheduleMap[dayName]) scheduleMap[dayName] = [];

          const times = extractPeriodTimes(data.startTime, data.endTime, data.time || data.periodTime);
          scheduleMap[dayName].push({
            id: docSnap.id,
            time: times.formattedRange,
            startTimeFormatted: times.startTimeFormatted,
            endTimeFormatted: times.endTimeFormatted,
            subject: data.subjectName || data.subject || 'Subject',
            teacher: data.teacherName || data.teacher || 'Instructor',
            room: data.room || data.classroom || data.venue || 'Classroom',
            startMinutes: data.startMinutes || times.startMins,
            endMinutes: data.endMinutes || times.endMins,
            day: dayName,
            className: data.className || data.targetClass
          });
        }
      });

      // Sort period lists by start minutes for each day
      Object.keys(scheduleMap).forEach((dayKey) => {
        scheduleMap[dayKey].sort((a, b) => a.startMinutes - b.startMinutes);
      });

      setWeeklyTimetable(scheduleMap);
      setLoading(false);
    }, (err) => {
      console.warn("Real-time timetable listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, className, academicYear, currentTerm]);

  // 3. Real-time Firestore Listener for School Calendar / Holidays / Exams
  useEffect(() => {
    if (!schoolId) return;

    const q = query(
      collection(db, 'schoolCalendar'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const events: any[] = [];
      snap.forEach(d => events.push({ id: d.id, ...d.data() }));
      setSpecialEvents(events);
    }, (err) => console.warn("Calendar listener error:", err));

    return () => unsub();
  }, [schoolId]);

  // 4. Calculate dynamic schedule state for current second
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const hoursStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formattedDate = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  // Current YYYY-MM-DD
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  // Check special event for today from schoolCalendar
  const todaySpecialEvent = specialEvents.find(ev => {
    const eDate = ev.date || ev.eventDate || ev.startDate;
    if (!eDate) return false;
    if (eDate === todayYMD) return true;
    if (ev.startDate && ev.endDate && todayYMD >= ev.startDate && todayYMD <= ev.endDate) return true;
    return false;
  });

  const totalPeriodsCount = Object.values(weeklyTimetable).reduce((acc: number, list: SchedulePeriod[]) => acc + (list ? list.length : 0), 0);
  const todaySchedule = weeklyTimetable[dayName] || [];

  let isLive = false;
  let currentSubject: SchedulePeriod | null = null;
  let nextSubject: SchedulePeriod | null = null;
  let tomorrowFirstSubject: SchedulePeriod | null = null;
  let status: RealTimeScheduleState['status'] = 'NO_CLASS';
  let statusHeading = 'No Class in Session';
  let statusDetail = 'No class scheduled at this time.';
  let progressPercent = 0;
  let minutesRemaining = 0;
  let specialEventTitle: string | undefined = undefined;

  // Determine tomorrow's first subject
  const tomorrowDayIndex = (now.getDay() + 1) % 7;
  const tomorrowDayName = dayNames[tomorrowDayIndex];
  if (weeklyTimetable[tomorrowDayName] && weeklyTimetable[tomorrowDayName].length > 0) {
    tomorrowFirstSubject = weeklyTimetable[tomorrowDayName][0];
  } else if (weeklyTimetable['Monday'] && weeklyTimetable['Monday'].length > 0) {
    tomorrowFirstSubject = weeklyTimetable['Monday'][0];
  }

  // Check conditions in strict priority
  if (todaySpecialEvent) {
    const cat = String(todaySpecialEvent.category || todaySpecialEvent.type || todaySpecialEvent.title || '').toLowerCase();
    specialEventTitle = todaySpecialEvent.title || todaySpecialEvent.eventName || 'School Event';

    if (cat.includes('holiday') || cat.includes('vacation') || cat.includes('break') || cat.includes('closed')) {
      status = 'HOLIDAY';
      statusHeading = 'School Holiday';
      statusDetail = specialEventTitle || 'School closed in observance of holiday.';
    } else if (cat.includes('exam') || cat.includes('test') || cat.includes('assessment')) {
      status = 'EXAM_DAY';
      statusHeading = 'Examination Day';
      statusDetail = specialEventTitle || 'School exam schedule in effect today.';
    } else {
      status = 'HOLIDAY';
      statusHeading = specialEventTitle;
      statusDetail = todaySpecialEvent.description || 'Special school event scheduled for today.';
    }
  } else if (isWeekend) {
    status = 'WEEKEND';
    statusHeading = 'Weekend';
    statusDetail = 'No classes scheduled today. Classes resume Monday.';
  } else if (totalPeriodsCount === 0) {
    status = 'NO_TIMETABLE';
    statusHeading = 'No Timetable Scheduled';
    statusDetail = 'No active published timetable found in Firestore for your class.';
  } else if (todaySchedule.length === 0) {
    status = 'NO_CLASS';
    statusHeading = 'No Class in Session';
    statusDetail = 'No lessons scheduled for today.';
  } else {
    // We have a timetable for today! Check current time against lesson slots
    const firstPeriod = todaySchedule[0];
    const lastPeriod = todaySchedule[todaySchedule.length - 1];

    if (currentMinutes < firstPeriod.startMinutes) {
      status = 'BEFORE_SCHOOL';
      statusHeading = 'No Class in Session';
      statusDetail = `First class starts at ${firstPeriod.startTimeFormatted}`;
      nextSubject = firstPeriod;
      minutesRemaining = Math.max(0, Math.ceil(firstPeriod.startMinutes - currentMinutes));
    } else if (currentMinutes >= lastPeriod.endMinutes) {
      status = 'AFTER_SCHOOL';
      statusHeading = 'School Day Completed';
      statusDetail = 'All classes for today have concluded.';
      nextSubject = null;
    } else {
      // Current time is during school hours. Find active period or inter-class break
      let activeIndex = -1;
      for (let i = 0; i < todaySchedule.length; i++) {
        const p = todaySchedule[i];
        if (currentMinutes >= p.startMinutes && currentMinutes < p.endMinutes) {
          activeIndex = i;
          break;
        }
      }

      if (activeIndex !== -1) {
        // Active Class!
        isLive = true;
        currentSubject = todaySchedule[activeIndex];
        status = 'LIVE';
        statusHeading = 'Class in Session';
        statusDetail = `Currently in lesson: ${currentSubject.subject}`;
        nextSubject = todaySchedule[activeIndex + 1] || null;

        const totalDuration = Math.max(1, currentSubject.endMinutes - currentSubject.startMinutes);
        const elapsed = Math.max(0, currentMinutes - currentSubject.startMinutes);
        progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
        minutesRemaining = Math.max(0, Math.ceil(currentSubject.endMinutes - currentMinutes));
      } else {
        // Inter-Class Break / Recess
        status = 'NO_CLASS';
        statusHeading = 'No Class in Session';
        statusDetail = 'Recess / Inter-Class Break';

        for (let i = 0; i < todaySchedule.length; i++) {
          if (todaySchedule[i].startMinutes > currentMinutes) {
            nextSubject = todaySchedule[i];
            minutesRemaining = Math.max(0, Math.ceil(todaySchedule[i].startMinutes - currentMinutes));
            break;
          }
        }
      }
    }
  }

  return {
    currentTime: now,
    formattedTime: hoursStr,
    dayName,
    formattedDate,
    isLive,
    currentSubject,
    nextSubject,
    tomorrowFirstSubject,
    status,
    statusHeading,
    statusDetail,
    progressPercent,
    minutesRemaining,
    todaySchedule,
    loading,
    specialEventTitle
  };
}

// Compact Header Live Clock & Subject Badge
export const RealTimeHeaderWidget: React.FC<{
  schoolId?: string;
  className?: string;
  onOpenTimetable?: () => void;
}> = ({ schoolId, className, onOpenTimetable }) => {
  const scheduleState = useRealTimeSchedule(schoolId, className);
  const { formattedTime, isLive, currentSubject, status, minutesRemaining, nextSubject } = scheduleState;

  return (
    <div 
      onClick={onOpenTimetable}
      className="flex items-center gap-2 bg-[#00152e] hover:bg-[#002856] transition cursor-pointer px-3 py-1.5 rounded-xl border border-[#D4AF37]/40 text-white shadow-inner group"
      title="Click to view full Class Timetable"
    >
      {/* Digital Ticking Clock */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/70">
        <Clock className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
        <span className="font-mono text-xs font-black text-amber-300 tracking-wider">
          {formattedTime}
        </span>
      </div>

      {/* Real-Time Subject Badge */}
      <div className="flex items-center gap-1.5 text-xs">
        {isLive && currentSubject ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-emerald-300 truncate max-w-[140px]">
              {currentSubject.subject}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              ({currentSubject.room})
            </span>
            <span className="text-[9px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700 font-mono">
              {minutesRemaining}m left
            </span>
          </>
        ) : status === 'AFTER_SCHOOL' ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-blue-200 font-bold">School Day Completed</span>
          </>
        ) : nextSubject ? (
          <>
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-200 truncate max-w-[140px]">
              Next: <strong className="text-amber-300">{nextSubject.subject}</strong> ({minutesRemaining}m)
            </span>
          </>
        ) : (
          <>
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-300 font-medium">
              No Class in Session
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// Rich Overview Banner Live Clock & Subject Module for Dashboard
export const RealTimeOverviewBanner: React.FC<{
  schoolId?: string;
  className?: string;
  academicYear?: string;
  currentTerm?: string;
  onOpenTimetable?: () => void;
}> = ({ schoolId, className, academicYear, currentTerm, onOpenTimetable }) => {
  const scheduleState = useRealTimeSchedule(schoolId, className, academicYear, currentTerm);
  const { 
    formattedTime, 
    formattedDate, 
    dayName, 
    isLive,
    currentSubject, 
    nextSubject, 
    tomorrowFirstSubject,
    status, 
    statusHeading,
    statusDetail,
    progressPercent, 
    minutesRemaining,
    todaySchedule,
    specialEventTitle
  } = scheduleState;

  return (
    <div className="bg-gradient-to-br from-[#002147] via-[#001835] to-[#09294f] rounded-3xl p-6 text-white border border-[#D4AF37]/40 shadow-2xl relative overflow-hidden">
      
      {/* Background ambient glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 space-y-5">
        
        {/* TOP BAR: DATE & LIVE STATUS BADGE */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#D4AF37] text-[#002147] text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
              Real-Time Timetable
            </span>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              {formattedDate}
            </span>
          </div>

          {/* Live Status Pill */}
          <div className="flex items-center gap-2">
            {isLive ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 rounded-full text-xs font-black uppercase tracking-wider shadow-lg animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Class In Session</span>
              </div>
            ) : status === 'AFTER_SCHOOL' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-950/80 text-blue-300 border border-blue-500/50 rounded-full text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>School Day Completed</span>
              </div>
            ) : status === 'WEEKEND' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 text-slate-300 border border-slate-700 rounded-full text-xs font-bold">
                <CalendarX className="w-3.5 h-3.5 text-amber-400" />
                <span>Weekend</span>
              </div>
            ) : status === 'HOLIDAY' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 text-amber-300 border border-amber-500/50 rounded-full text-xs font-bold">
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span>School Holiday</span>
              </div>
            ) : status === 'EXAM_DAY' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-950/80 text-purple-300 border border-purple-500/50 rounded-full text-xs font-bold">
                <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                <span>Examination Day</span>
              </div>
            ) : status === 'NO_TIMETABLE' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 text-slate-300 border border-slate-700 rounded-full text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>No Timetable Scheduled</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 text-slate-300 border border-slate-700 rounded-full text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>No Class in Session</span>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE GRID: LIVE DIGITAL CLOCK & CURRENT / UPCOMING SUBJECT CARD */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* DIGITAL CLOCK SECTION (4 cols) */}
          <div className="md:col-span-4 bg-[#001227]/80 p-5 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center space-y-1 shadow-inner">
            <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">
              Live Portal Clock
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {formattedTime}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Class: <span className="text-amber-300 font-bold">{className || 'Learner Class'}</span>
            </p>
          </div>

          {/* SCHEDULE STATUS & SUBJECT DETAILS CARD (8 cols) */}
          <div className="md:col-span-8 space-y-3">
            
            {/* SCENARIO 1: CLASS IN SESSION */}
            {isLive && currentSubject ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      Ongoing Subject Now
                    </span>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                      {currentSubject.subject}
                    </h2>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-mono">Period Time</span>
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {currentSubject.startTimeFormatted} - {currentSubject.endTimeFormatted}
                    </span>
                  </div>
                </div>

                {/* Actual Subject Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                  <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Teacher: <strong>{currentSubject.teacher}</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Venue: <strong>{currentSubject.room}</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-emerald-950/70 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-600/50 font-mono font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{minutesRemaining} mins left</span>
                  </span>
                </div>

                {/* Live Real-Time Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Lesson Progress</span>
                    <span className="text-emerald-400 font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-1000 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : nextSubject ? (
              /* SCENARIO 2: NO CLASS CURRENTLY LIVE, BUT NEXT CLASS IS UPCOMING */
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                      No Class in Session
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 px-2.5 py-0.5 rounded-full">
                    Starts in {minutesRemaining} mins
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Next Class
                  </span>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    {nextSubject.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                      <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Teacher: <strong>{nextSubject.teacher}</strong></span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Venue: <strong>{nextSubject.room}</strong></span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Start Time: <strong>{nextSubject.startTimeFormatted}</strong></span>
                    </span>
                  </div>
                </div>
              </div>
            ) : status === 'AFTER_SCHOOL' ? (
              /* SCENARIO 3: SCHOOL DAY COMPLETED */
              <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-black text-blue-200">School Day Completed</h3>
                </div>
                <p className="text-xs text-slate-300">
                  All scheduled classes for today have ended. Have a great evening!
                </p>

                {tomorrowFirstSubject && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs text-slate-200">
                    <span className="text-[10px] font-bold uppercase text-[#D4AF37]">Tomorrow's First Class:</span>
                    <strong className="text-white">{tomorrowFirstSubject.subject}</strong>
                    <span>({tomorrowFirstSubject.startTimeFormatted} in {tomorrowFirstSubject.room})</span>
                  </div>
                )}
              </div>
            ) : status === 'WEEKEND' ? (
              /* SCENARIO 4: WEEKEND */
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarX className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="text-sm font-black text-amber-200">Weekend</h3>
                </div>
                <p className="text-xs text-slate-300">
                  No classes scheduled today. Enjoy your weekend! Regular classes resume Monday.
                </p>

                {tomorrowFirstSubject && (
                  <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs text-slate-200">
                    <span className="text-[10px] font-bold uppercase text-[#D4AF37]">Monday's First Class:</span>
                    <strong className="text-white">{tomorrowFirstSubject.subject}</strong>
                    <span>({tomorrowFirstSubject.startTimeFormatted} in {tomorrowFirstSubject.room})</span>
                  </div>
                )}
              </div>
            ) : status === 'HOLIDAY' || status === 'EXAM_DAY' ? (
              /* SCENARIO 5: HOLIDAY OR EXAMINATION DAY */
              <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  {status === 'EXAM_DAY' ? (
                    <GraduationCap className="w-5 h-5 text-purple-400" />
                  ) : (
                    <Coffee className="w-5 h-5 text-amber-400" />
                  )}
                  <h3 className="text-sm font-black text-amber-200">{statusHeading}</h3>
                </div>
                <p className="text-xs text-slate-200">{statusDetail}</p>
              </div>
            ) : (
              /* SCENARIO 6: NO TIMETABLE FOR STUDENT OR NO CLASSES TODAY */
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    {statusHeading}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">{statusDetail}</p>
                {onOpenTimetable && (
                  <button
                    onClick={onOpenTimetable}
                    className="text-xs text-[#D4AF37] font-bold hover:underline flex items-center gap-1 pt-1"
                  >
                    View Timetable Module <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM QUICK TIMETABLE TRACKER FOR TODAY */}
        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0">
              Today's Schedule ({dayName}):
            </span>
            {todaySchedule.length === 0 ? (
              <span className="text-[11px] text-slate-400 font-italic">No classes scheduled for today</span>
            ) : (
              todaySchedule.map((p, idx) => {
                const isCurrent = currentSubject?.id === p.id && isLive;
                return (
                  <span 
                    key={p.id || idx}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition flex items-center gap-1 ${
                      isCurrent 
                        ? 'bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md' 
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>{p.subject}</span>
                    <span className="text-[9px] opacity-80 font-mono">({p.startTimeFormatted})</span>
                  </span>
                );
              })
            )}
          </div>

          {onOpenTimetable && (
            <button
              onClick={onOpenTimetable}
              className="text-xs font-bold text-[#D4AF37] hover:text-amber-300 underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              Full Timetable Matrix <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
