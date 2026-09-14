import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Printer, 
  Download, 
  BookOpen, 
  User, 
  RefreshCw 
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentTimetablesProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
}

export const ParentTimetables: React.FC<ParentTimetablesProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setSelectedStudent
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const className = activeStudent?.className || '';

  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, any[]>>({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: []
  });
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'timetables'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const scheduleMap: Record<string, any[]> = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: []
      };

      const userClassClean = String(className || '').toLowerCase().trim();

      snap.forEach((docSnap) => {
        const data = docSnap.data();

        // Must be Published
        const isPublished = data.status && String(data.status).toLowerCase() === 'published';
        if (!isPublished) return;

        // Class matching
        const docClass = String(data.className || data.targetClass || data.classId || '').toLowerCase().trim();
        const matchesClass = 
          !userClassClean || 
          !docClass || 
          docClass === userClassClean || 
          userClassClean.includes(docClass) || 
          docClass.includes(userClassClean);

        if (!matchesClass) return;

        const dayName = data.day ? String(data.day).charAt(0).toUpperCase() + String(data.day).slice(1) : 'Monday';
        if (!scheduleMap[dayName]) scheduleMap[dayName] = [];

        if (Array.isArray(data.periods)) {
          data.periods.forEach((p: any, idx: number) => {
            const sTime = p.startTime || data.startTime || '';
            const eTime = p.endTime || data.endTime || '';
            const formattedTime = (sTime && eTime) ? `${sTime} - ${eTime}` : (p.time || '08:00 - 08:40');
            scheduleMap[dayName].push({
              id: `${docSnap.id}-${idx}`,
              time: formattedTime,
              subject: p.subjectName || p.subject || 'Subject',
              teacher: p.teacherName || p.teacher || 'Instructor',
              room: p.room || p.classroom || p.venue || 'Classroom',
              startTime: sTime,
              endTime: eTime
            });
          });
        } else {
          const sTime = data.startTime || '';
          const eTime = data.endTime || '';
          const formattedTime = (sTime && eTime) ? `${sTime} - ${eTime}` : (data.time || '08:00 - 08:40');
          scheduleMap[dayName].push({
            id: docSnap.id,
            time: formattedTime,
            subject: data.subjectName || data.subject || 'Subject',
            teacher: data.teacherName || data.teacher || 'Instructor',
            room: data.room || data.classroom || data.venue || 'Classroom',
            startTime: sTime,
            endTime: eTime
          });
        }
      });

      setWeeklySchedule(scheduleMap);
      setLoading(false);
    }, (err) => {
      console.warn("Real-time parent timetable listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, className]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Class Academic Timetable</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Weekly subject schedule and period allocations for <span className="font-bold text-white">{activeStudent?.fullName || activeStudent?.name || 'Student'}</span> ({className}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {linkedStudents.length > 1 && (
            <select
              value={activeStudent?.id || activeStudent?.studentId || ''}
              onChange={(e) => {
                const found = linkedStudents.find(s => (s.id === e.target.value || s.studentId === e.target.value));
                if (found) setSelectedStudent(found);
              }}
              className="bg-white/10 text-white font-bold text-xs p-2.5 rounded-xl outline-none cursor-pointer border border-white/20"
            >
              {linkedStudents.map(s => (
                <option key={s.id || s.studentId} value={s.id || s.studentId} className="bg-[#002147]">
                  {s.fullName || s.name} {s.className ? `(${s.className})` : ''}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Timetable
          </button>
        </div>
      </div>

      {/* VIEW TOGGLE STRIP */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'weekly' ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Weekly Schedule Grid
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'daily' ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Daily View
          </button>
        </div>

        {viewMode === 'daily' && (
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            {daysOfWeek.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedDay === day ? 'bg-[#D4AF37] text-[#002147]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TIMETABLE GRID (PRINTABLE) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* PRINT HEADER */}
        <div className="hidden print:block text-center border-b border-slate-200 pb-4">
          <h1 className="text-xl font-black text-[#002147]">{currentUser.schoolName || 'EDUkenZA Academy'}</h1>
          <p className="font-bold text-xs text-slate-600">OFFICIAL CLASS TIMETABLE</p>
          <p className="text-xs font-mono font-bold text-[#D4AF37]">
            Student: {activeStudent?.fullName || activeStudent?.name || 'Student'} • Class: {className}
          </p>
        </div>

        {viewMode === 'weekly' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {daysOfWeek.map(day => {
              const daySlots = weeklySchedule[day] || [];
              return (
                <div key={day} className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="bg-[#002147] text-white text-center py-1.5 rounded-xl font-black text-xs">
                    {day}
                  </div>

                  <div className="space-y-2">
                    {daySlots.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-4">No published class</p>
                    ) : (
                      daySlots.map((slot, i) => (
                        <div key={slot.id || i} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{slot.time}</span>
                          </div>
                          <p className="font-black text-[#002147]">{slot.subject}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{slot.teacher}</p>
                          <span className="text-[9px] bg-amber-50 text-amber-900 font-mono font-bold px-1.5 py-0.5 rounded">
                            {slot.room}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-[#002147] border-b border-slate-100 pb-2">
              {selectedDay} Schedule
            </h3>

            <div className="space-y-2">
              {(weeklySchedule[selectedDay] || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold">No published lessons for {selectedDay}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Please check back once the school administrator publishes the timetable.</p>
                </div>
              ) : (
                (weeklySchedule[selectedDay] || []).map((slot, i) => (
                  <div key={slot.id || i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#002147] font-black flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-[#002147]" />
                      </div>
                      <div>
                        <p className="font-black text-[#002147] text-sm">{slot.subject}</p>
                        <p className="text-slate-500 font-medium">{slot.teacher} • {slot.room}</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 bg-white font-mono font-bold text-[#002147] rounded-xl border border-slate-200">
                      {slot.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
