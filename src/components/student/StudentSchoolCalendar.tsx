import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Search, 
  RefreshCw 
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentSchoolCalendarProps {
  currentUser: any;
  studentRecord: any;
}

export const StudentSchoolCalendar: React.FC<StudentSchoolCalendarProps> = ({
  currentUser,
  studentRecord
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCalendar = async () => {
      if (!schoolId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'schoolCalendar'),
          where('schoolId', '==', schoolId)
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setEvents(list);
      } catch (err) {
        console.error("Error fetching school calendar:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, [schoolId]);

  // Fallback events if empty
  const defaultEvents = [
    { title: 'Youth Day Public Holiday', date: '2025-06-16', category: 'Holiday', venue: 'Nationwide', description: 'School closed in observance of Youth Day.' },
    { title: 'Term 2 Final Examinations', date: '2025-11-18 to 2025-11-28', category: 'Examinations', venue: 'School Exam Halls', description: 'Mandatory term-end assessments for all grades.' },
    { title: 'Annual Inter-House Sports Day', date: '2025-08-15', category: 'Sports', venue: 'Main Athletics Track', description: 'Track and field competitions.' },
    { title: 'Parent-Teacher Consultations', date: '2025-09-05', category: 'PTA Event', venue: 'School Hall & Classrooms', description: 'Term 3 academic progress discussions.' },
  ];

  const calendarEvents = events.length > 0 ? events : defaultEvents;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Official School Calendar</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Academic terms, public holidays, examination windows, and school extra-curricular events.
          </p>
        </div>
      </div>

      {/* EVENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {calendarEvents.map((ev, i) => (
          <div key={ev.id || i} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3 hover:border-[#002147] transition">
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 bg-slate-100 text-[#002147] font-bold text-[10px] rounded-lg uppercase">
                {ev.category || 'School Event'}
              </span>
              <span className="text-xs font-mono font-bold text-[#D4AF37]">{ev.date || ev.eventDate}</span>
            </div>

            <h2 className="text-base font-black text-[#002147]">{ev.title || ev.eventName}</h2>
            <p className="text-xs text-slate-600">{ev.description}</p>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Venue: {ev.venue || 'School Grounds'}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
