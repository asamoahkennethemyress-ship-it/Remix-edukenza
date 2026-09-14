import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  BookOpen, 
  MapPin, 
  UserCheck,
  Video,
  ExternalLink,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { generateGoogleMeetLink, createOnlineClassSession } from '../../services/googleMeetService';

export interface TimetableSlot {
  id?: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  time: string;
  class: string;
  subject: string;
  room: string;
  isOnlineClass?: boolean;
  meetLink?: string;
  meetingId?: string;
}

export interface TeacherTimetableProps {
  timetableData: TimetableSlot[];
  teacherName: string;
  schoolName: string;
  assignedClasses: any[];
  schoolId?: string;
  teacherId?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeacherTimetable: React.FC<TeacherTimetableProps> = ({
  timetableData,
  teacherName,
  schoolName,
  assignedClasses,
  schoolId,
  teacherId,
  showToast
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [slotsState, setSlotsState] = useState<TimetableSlot[]>(timetableData || []);

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Handle converting a timetable slot to Google Meet
  const handleToggleOnlineClass = async (index: number) => {
    const updated = [...slotsState];
    const target = updated[index];
    if (!target) return;

    if (!target.isOnlineClass) {
      const { meetLink, meetingId } = generateGoogleMeetLink();
      target.isOnlineClass = true;
      target.meetLink = meetLink;
      target.meetingId = meetingId;
      target.room = 'Google Meet (Virtual)';

      // Extract times from slot.time e.g. "08:00 - 09:00"
      const timeParts = target.time.split('-').map(t => t.trim());
      const startTime = timeParts[0] || '09:00';
      const endTime = timeParts[1] || '10:00';

      try {
        await createOnlineClassSession({
          schoolId: schoolId || '',
          title: `${target.subject} (${target.class}) Google Meet Class`,
          subject: target.subject,
          className: target.class,
          teacherId: teacherId || '',
          teacherName,
          meetLink,
          meetingId,
          date: new Date().toISOString().split('T')[0],
          startTime,
          endTime,
          status: 'scheduled',
          isApproved: true
        });
        if (showToast) showToast(`Google Meet generated for ${target.subject}! Link: ${meetLink}`, 'success');
      } catch (err) {
        if (showToast) showToast('Google Meet generated locally for timetable', 'info');
      }
    } else {
      target.isOnlineClass = false;
      target.room = 'Room 101';
      if (showToast) showToast(`Reverted ${target.subject} to physical classroom.`, 'info');
    }

    setSlotsState(updated);
  };

  // Active timetable strictly using published data
  const activeTimetable = timetableData || [];

  // Filtered timetable
  const filteredSlots = activeTimetable.filter(slot => {
    const matchDay = selectedDay === 'All' || slot.day === selectedDay;
    const matchClass = selectedClassFilter === 'All' || slot.class === selectedClassFilter;
    return matchDay && matchClass;
  });

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle PDF / CSV Export
  const handleExportCSV = () => {
    const headers = ['Day', 'Time', 'Class', 'Subject', 'Room'];
    const rows = filteredSlots.map(s => [s.day, s.time, s.class, s.subject, s.room]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${teacherName.replace(/\s+/g, '_')}_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 print:p-0 print:bg-white">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Personal Teaching Timetable</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Weekly class schedule for {teacherName} • {schoolName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Print Timetable</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV / PDF</span>
          </button>
        </div>
      </div>

      {/* PRINT HEADER FOR PAPER EXPORT */}
      <div className="hidden print:block text-center space-y-1 mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold text-[#002147]">{schoolName}</h1>
        <h2 className="text-sm font-semibold">Teacher Schedule & Timetable - {teacherName}</h2>
        <p className="text-xs text-slate-500">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      {/* CONTROLS & FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center print:hidden">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Day:
          </span>
          <button
            onClick={() => setSelectedDay('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedDay === 'All' ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Days
          </button>
          {daysList.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedDay === d ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-auto flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Class:</span>
          <select
            value={selectedClassFilter}
            onChange={e => setSelectedClassFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Assigned Classes</option>
            {assignedClasses.map((c, i) => (
              <option key={i} value={c.name || c.className || c}>
                {c.name || c.className || c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TIMETABLE GRID TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[#002147] font-black border-b border-slate-200">
              <tr>
                <th className="p-4">Day</th>
                <th className="p-4">Time Slot</th>
                <th className="p-4">Assigned Class</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Room / Venue</th>
                <th className="p-4 text-right">Google Meet Integration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No classes scheduled for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-[#002147]">
                      <span className="px-2.5 py-1 bg-slate-100 text-[#002147] rounded-lg font-black text-[11px]">
                        {slot.day}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {slot.time}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-[#002147]">
                      {slot.class}
                    </td>
                    <td className="p-4 font-medium text-amber-800">
                      <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md">
                        {slot.subject}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        {slot.isOnlineClass ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded flex items-center gap-1 text-[11px]">
                            <Video className="w-3 h-3 text-emerald-600" /> Virtual Meet
                          </span>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {slot.room}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {slot.isOnlineClass && slot.meetLink ? (
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={slot.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition flex items-center gap-1 text-[11px] shadow-sm"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Start Meet</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleToggleOnlineClass(index)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-[11px]"
                            title="Revert to physical class"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleToggleOnlineClass(index)}
                          className="px-3 py-1.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black rounded-xl transition flex items-center gap-1 text-[11px] ml-auto cursor-pointer shadow-sm"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Online Class = TRUE</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
