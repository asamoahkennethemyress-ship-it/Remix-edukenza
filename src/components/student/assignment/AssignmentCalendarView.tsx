import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface AssignmentCalendarViewProps {
  assignments: any[];
  submissions: any[];
  onOpenDetails: (assignment: any) => void;
}

export const AssignmentCalendarView: React.FC<AssignmentCalendarViewProps> = ({
  assignments,
  submissions,
  onOpenDetails
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map assignments by due date (YYYY-MM-DD)
  const assignmentsByDate = new Map<string, any[]>();
  assignments.forEach(ass => {
    if (ass.dueDate) {
      const list = assignmentsByDate.get(ass.dueDate) || [];
      list.push(ass);
      assignmentsByDate.set(ass.dueDate, list);
    }
  });

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();
  const paddingDaysBefore = firstDayOfMonth;

  const calendarCells = [];

  // Previous month padding
  for (let i = paddingDaysBefore - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      dateStr: ''
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    calendarCells.push({
      day: d,
      isCurrentMonth: true,
      dateStr
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const subMap = new Map<string, any>();
  submissions.forEach(s => subMap.set(s.assignmentId, s));

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      
      {/* CALENDAR HEADER CONTROLS */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#D4AF37]" />
            Assignment & Exam Deadlines Calendar
          </h3>
          <p className="text-xs text-slate-500">Interactive month view. Click any deadline to view assignment instructions.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#002147] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm font-black text-[#002147] font-mono min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#002147] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DAYS OF WEEK HEADER */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider py-1 border-b border-slate-100">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* MONTH GRID CELLS */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {calendarCells.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return (
              <div key={idx} className="min-h-[90px] p-2 bg-slate-50/50 rounded-2xl opacity-40 text-xs font-mono">
                {cell.day}
              </div>
            );
          }

          const dayAssignments = cell.dateStr ? (assignmentsByDate.get(cell.dateStr) || []) : [];
          const isToday = cell.dateStr === todayStr;

          return (
            <div
              key={idx}
              className={`min-h-[95px] p-2 rounded-2xl border transition flex flex-col justify-between ${
                isToday 
                  ? 'bg-amber-50/60 border-amber-300 ring-2 ring-[#D4AF37]/30' 
                  : 'bg-white border-slate-200 hover:border-[#002147]'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-xs font-black font-mono ${isToday ? 'text-amber-900 bg-[#D4AF37] px-2 py-0.5 rounded-md' : 'text-[#002147]'}`}>
                  {cell.day}
                </span>

                {dayAssignments.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#002147] text-white rounded-full font-mono">
                    {dayAssignments.length}
                  </span>
                )}
              </div>

              {/* EVENTS ON THIS DAY */}
              <div className="space-y-1 mt-1 overflow-y-auto max-h-[60px]">
                {dayAssignments.map(ass => {
                  const sub = subMap.get(ass.id);
                  const isDone = !!sub;

                  return (
                    <div
                      key={ass.id}
                      onClick={() => onOpenDetails(ass)}
                      className={`p-1.5 rounded-lg text-[10px] font-bold truncate cursor-pointer transition flex items-center justify-between gap-1 ${
                        isDone 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' 
                          : 'bg-[#002147] text-white hover:bg-[#00152e]'
                      }`}
                      title={`${ass.title} (${ass.subjectName || 'Subject'})`}
                    >
                      <span className="truncate">{ass.title}</span>
                      {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> : <Clock className="w-3 h-3 text-[#D4AF37] shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
