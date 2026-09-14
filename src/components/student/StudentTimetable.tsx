import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Printer, 
  Download, 
  CheckCircle2, 
  BookOpen, 
  User, 
  RefreshCw,
  Sparkles,
  MapPin,
  Coffee
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentTimetableProps {
  currentUser: any;
  studentRecord: any;
}

interface PeriodItem {
  time: string;
  subject: string;
  teacher: string;
  room: string;
  startMinutes?: number;
  endMinutes?: number;
}

function parseTimeToMinutes(timeStr: string): { startMinutes: number; endMinutes: number } {
  try {
    const parts = timeStr.split('-');
    if (parts.length === 2) {
      const start = parseSingleTime(parts[0].trim());
      const end = parseSingleTime(parts[1].trim());
      return { startMinutes: start, endMinutes: end };
    }
  } catch (e) {
    // fallback
  }
  return { startMinutes: 480, endMinutes: 525 };
}

function parseSingleTime(t: string): number {
  const isPM = t.toUpperCase().includes('PM');
  const isAM = t.toUpperCase().includes('AM');
  const clean = t.replace(/(AM|PM)/i, '').trim();
  const [hStr, mStr] = clean.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

export const StudentTimetable: React.FC<StudentTimetableProps> = ({
  currentUser,
  studentRecord
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const className = studentRecord?.className || currentUser?.className || '';
  const classId = studentRecord?.classId || currentUser?.classId || '';

  const [viewMode, setViewMode] = useState<'today' | 'weekly' | 'daily'>('today');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [loading, setLoading] = useState(true);
  const [firestoreTimetable, setFirestoreTimetable] = useState<Record<string, PeriodItem[]>>({});
  const [now, setNow] = useState<Date>(new Date());

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // 1. Ticking clock update
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set default selected day to current day if weekday
  useEffect(() => {
    const todayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
    if (daysOfWeek.includes(todayStr)) {
      setSelectedDay(todayStr);
    }
  }, []);

  // 2. Real-time Firestore Listener for Timetable changes published by School Admin
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'timetables'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const scheduleMap: Record<string, PeriodItem[]> = {};
      const userClassClean = String(className || '').toLowerCase().trim();

      snap.forEach(d => {
        const data = d.data();
        
        // Must be published by School Admin
        const isPublished = data.status && String(data.status).toLowerCase() === 'published';
        if (!isPublished) return;

        // Class matching check
        const docClassId = data.classId;
        const docClassName = String(data.className || data.targetClass || '').toLowerCase().trim();

        const matchesClass = 
          (classId && docClassId === classId) ||
          !userClassClean ||
          !docClassName ||
          docClassName === userClassClean ||
          userClassClean.includes(docClassName) ||
          docClassName.includes(userClassClean);

        if (matchesClass) {
          const day = data.day ? String(data.day).charAt(0).toUpperCase() + String(data.day).slice(1) : 'Monday';
          if (!scheduleMap[day]) scheduleMap[day] = [];

          if (Array.isArray(data.periods)) {
            data.periods.forEach((p: any) => {
              const sTime = p.startTime || data.startTime || '';
              const eTime = p.endTime || data.endTime || '';
              const timeDisplay = (sTime && eTime) 
                ? `${sTime} - ${eTime}` 
                : (p.time || p.periodTime || '08:00 - 08:40');
              const startMinutes = sTime ? parseSingleTime(sTime) : parseTimeToMinutes(timeDisplay).startMinutes;
              const endMinutes = eTime ? parseSingleTime(eTime) : parseTimeToMinutes(timeDisplay).endMinutes;

              scheduleMap[day].push({
                time: timeDisplay,
                subject: p.subjectName || p.subject || 'Subject',
                teacher: p.teacherName || p.teacher || 'Instructor',
                room: p.room || p.classroom || 'Room',
                startMinutes: p.startMinutes || startMinutes,
                endMinutes: p.endMinutes || endMinutes
              });
            });
          } else if (data.subject || data.subjectName) {
            const sTime = data.startTime || '';
            const eTime = data.endTime || '';
            const timeDisplay = (sTime && eTime) 
              ? `${sTime} - ${eTime}` 
              : (data.time || '08:00 - 08:40');
            const startMinutes = sTime ? parseSingleTime(sTime) : parseTimeToMinutes(timeDisplay).startMinutes;
            const endMinutes = eTime ? parseSingleTime(eTime) : parseTimeToMinutes(timeDisplay).endMinutes;

            scheduleMap[day].push({
              time: timeDisplay,
              subject: data.subjectName || data.subject || 'Subject',
              teacher: data.teacherName || data.teacher || 'Instructor',
              room: data.room || data.classroom || 'Room',
              startMinutes: data.startMinutes || startMinutes,
              endMinutes: data.endMinutes || endMinutes
            });
          }
        }
      });

      // Sort period lists by start time
      Object.keys(scheduleMap).forEach(dayKey => {
        scheduleMap[dayKey].sort((a, b) => (a.startMinutes || 0) - (b.startMinutes || 0));
      });

      setFirestoreTimetable(scheduleMap);
      setLoading(false);
    }, (err) => {
      console.warn("Real-time timetable listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, className, classId]);

  const activeScheduleMap = firestoreTimetable;

  const currentDayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formattedDate = now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const todayPeriods = activeScheduleMap[currentDayName] || [];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textData = `REAL-TIME CLASS TIMETABLE FOR ${className.toUpperCase()}\n` +
      `Generated: ${formattedDate} ${formattedTime}\n\n` +
      daysOfWeek.map(day => {
        const periods = activeScheduleMap[day] || [];
        return `${day.toUpperCase()}:\n` + periods.map(p => `  ${p.time} | ${p.subject} | ${p.teacher} (${p.room})`).join('\n');
      }).join('\n\n');

    const element = document.createElement("a");
    const file = new Blob([textData], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${className}_RealTime_Timetable.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6 print:p-0 print:bg-white">
      
      {/* REAL-TIME HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/40 print:hidden relative overflow-hidden">
        
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Real-Time Class Timetable</h1>
            <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-black text-[10px] rounded-full uppercase tracking-widest flex items-center gap-1 shadow">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
              Live Sync
            </span>
          </div>
          <p className="text-slate-300 text-xs">
            Live weekly schedule matrix for <span className="font-bold text-white">{className}</span> • Updates automatically when teachers adjust classes.
          </p>
        </div>

        {/* Real-time digital clock display & Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="bg-[#001227]/90 px-4 py-2 rounded-2xl border border-white/10 text-center font-mono">
            <span className="text-[9px] font-black uppercase text-[#D4AF37] block tracking-wider">Portal Time</span>
            <span className="text-sm font-black text-amber-300">{formattedTime}</span>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Print</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* PRINT PAPER HEADER */}
      <div className="hidden print:block text-center space-y-1 mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold text-[#002147]">{currentUser.schoolName || 'EDUkenZA Academy'}</h1>
        <h2 className="text-sm font-semibold">Official Class Timetable - {className}</h2>
        <p className="text-xs text-slate-500">Live Real-Time Schedule • Academic Term 2026</p>
      </div>

      {/* VIEW CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center print:hidden">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('today')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'today' ? 'bg-[#002147] text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Live Today ({currentDayName})
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'weekly' ? 'bg-[#002147] text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Matrix
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'daily' ? 'bg-[#002147] text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Day Selector
          </button>
        </div>

        {viewMode === 'daily' && (
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
            {daysOfWeek.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                  selectedDay === day ? 'bg-[#D4AF37] text-[#002147]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LIVE TODAY VIEW WITH ACTIVE PERIOD TRACKING */}
      {viewMode === 'today' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-[#002147] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#D4AF37]" />
                  Today's Live Class Schedule ({currentDayName})
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {formattedDate} • Real-time status highlights current class session
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-[#002147] rounded-full text-xs font-bold border border-slate-200">
                {className}
              </span>
            </div>

            {Object.keys(activeScheduleMap).length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Coffee className="w-8 h-8 mx-auto text-amber-500" />
                <p className="font-bold text-sm">No published timetable is available for your class.</p>
                <p className="text-xs text-slate-400">Timetable schedules published by the School Admin will appear here automatically.</p>
              </div>
            ) : todayPeriods.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Coffee className="w-8 h-8 mx-auto text-amber-500" />
                <p className="font-bold text-sm">No classes scheduled for today.</p>
                <p className="text-xs">Enjoy your break or review homework assignments!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayPeriods.map((slot, i) => {
                  const startMin = slot.startMinutes || parseTimeToMinutes(slot.time).startMinutes;
                  const endMin = slot.endMinutes || parseTimeToMinutes(slot.time).endMinutes;

                  const isLive = currentMinutes >= startMin && currentMinutes <= endMin;
                  const isCompleted = currentMinutes > endMin;

                  const totalDuration = Math.max(1, endMin - startMin);
                  const elapsed = Math.max(0, currentMinutes - startMin);
                  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
                  const minsRemaining = Math.max(0, Math.ceil(endMin - currentMinutes));

                  return (
                    <div 
                      key={i} 
                      className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                        isLive 
                          ? 'bg-gradient-to-r from-emerald-950 via-[#002147] to-[#00152e] text-white border-emerald-500 shadow-xl ring-2 ring-emerald-400/50' 
                          : isCompleted 
                          ? 'bg-slate-50 border-slate-200 opacity-75' 
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {/* Active glowing accent line */}
                      {isLive && (
                        <div className="absolute top-0 left-0 bottom-0 w-2 bg-gradient-to-b from-emerald-400 to-teal-300"></div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        
                        <div className="flex items-start sm:items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isLive 
                              ? 'bg-emerald-500 text-slate-950 shadow-md' 
                              : isCompleted 
                              ? 'bg-slate-200 text-slate-600' 
                              : 'bg-[#002147] text-white'
                          }`}>
                            P{i + 1}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-base font-black ${isLive ? 'text-white' : 'text-[#002147]'}`}>
                                {slot.subject}
                              </h3>
                              {isLive && (
                                <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                                  NOW LIVE
                                </span>
                              )}
                              {isCompleted && (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Ended
                                </span>
                              )}
                            </div>

                            <div className={`flex flex-wrap items-center gap-3 text-xs ${isLive ? 'text-slate-300' : 'text-slate-500'}`}>
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                                {slot.teacher}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                                {slot.room}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* TIME & PROGRESS BADGE */}
                        <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
                          <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold ${
                            isLive 
                              ? 'bg-white/10 text-amber-300 border border-white/20' 
                              : 'bg-slate-100 text-[#002147] border border-slate-200'
                          }`}>
                            {slot.time}
                          </div>

                          {isLive && (
                            <span className="text-[11px] font-mono font-bold text-emerald-300">
                              {minsRemaining} mins remaining
                            </span>
                          )}
                        </div>

                      </div>

                      {/* Live Period Progress Bar */}
                      {isLive && (
                        <div className="mt-3 space-y-1 pt-2 border-t border-white/10">
                          <div className="flex justify-between text-[10px] font-mono text-slate-300">
                            <span>Period Completion</span>
                            <span className="text-emerald-300 font-bold">{progressPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-1000 rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEEKLY GRID VIEW */}
      {viewMode === 'weekly' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-[#002147] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#D4AF37]" />
              Full Weekly Timetable Matrix
            </h2>
            <span className="text-xs text-slate-500 font-bold">{className}</span>
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-5 gap-4 min-w-[800px]">
              {daysOfWeek.map(day => {
                const isToday = day === currentDayName;
                const periods = activeScheduleMap[day] || [];

                return (
                  <div key={day} className="space-y-3">
                    <div className={`p-3 rounded-2xl text-center font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm ${
                      isToday ? 'bg-[#D4AF37] text-[#002147] ring-2 ring-amber-400' : 'bg-[#002147] text-white'
                    }`}>
                      <span>{day}</span>
                      {isToday && <span className="text-[9px] bg-[#002147] text-white px-1.5 py-0.5 rounded font-bold">TODAY</span>}
                    </div>

                    <div className="space-y-2">
                      {periods.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-2xl text-xs">
                          No Classes
                        </div>
                      ) : (
                        periods.map((slot, i) => {
                          const startMin = slot.startMinutes || parseTimeToMinutes(slot.time).startMinutes;
                          const endMin = slot.endMinutes || parseTimeToMinutes(slot.time).endMinutes;
                          const isLiveSlot = isToday && currentMinutes >= startMin && currentMinutes <= endMin;

                          return (
                            <div 
                              key={i} 
                              className={`p-3 rounded-2xl space-y-1 text-xs transition border ${
                                isLiveSlot 
                                  ? 'bg-emerald-950 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/50' 
                                  : 'bg-slate-50 border-slate-200 hover:border-[#002147]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-mono font-bold ${isLiveSlot ? 'text-amber-300' : 'text-slate-500'}`}>
                                  {slot.time}
                                </span>
                                {isLiveSlot && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                )}
                              </div>
                              <p className={`font-black ${isLiveSlot ? 'text-white' : 'text-[#002147]'}`}>
                                {slot.subject}
                              </p>
                              <p className={`text-[10px] ${isLiveSlot ? 'text-slate-300' : 'text-slate-500'}`}>
                                {slot.teacher}
                              </p>
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                                isLiveSlot ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {slot.room}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAILY VIEW SELECTOR */}
      {viewMode === 'daily' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h2 className="text-base font-black text-[#002147] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              {selectedDay}'s Class Schedule
            </h2>
            <span className="text-xs text-slate-500 font-bold">{className}</span>
          </div>

          <div className="space-y-3">
            {(activeScheduleMap[selectedDay] || []).map((slot, i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#002147] text-white font-black text-xs flex items-center justify-center shrink-0">
                    P{i + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#002147]">{slot.subject}</h3>
                    <p className="text-xs text-slate-500">{slot.teacher} • Room: {slot.room}</p>
                  </div>
                </div>

                <div className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#002147] shrink-0">
                  {slot.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

