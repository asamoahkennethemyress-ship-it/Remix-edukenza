import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Filter, 
  Tag, 
  Users, 
  GraduationCap, 
  RefreshCw 
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentSchoolCalendarProps {
  currentUser: any;
}

export const ParentSchoolCalendar: React.FC<ParentSchoolCalendarProps> = ({ currentUser }) => {
  const schoolId = currentUser?.schoolId || '';

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

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
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });

      if (list.length === 0) {
        setEvents([
          {
            id: '1',
            title: 'Parent-Teacher Association (PTA) Term 2 Meeting',
            date: '2025-05-28',
            time: '17:30 PM - 19:00 PM',
            category: 'PTA Meetings',
            venue: 'Main School Auditorium',
            description: 'Discussion of Term 2 academic performance, upcoming school developments, and sporting fixtures.'
          },
          {
            id: '2',
            title: 'Mid-Term 2 Examination Period',
            date: '2025-06-02 - 2025-06-12',
            time: '08:00 AM - 14:00 PM',
            category: 'Exams',
            venue: 'Examination Halls',
            description: 'Formal mid-year assessments for all Grade 8 through Grade 12 learners.'
          },
          {
            id: '3',
            title: 'Youth Day Public Holiday (School Closed)',
            date: '2025-06-16',
            time: 'All Day',
            category: 'Holidays',
            venue: 'N/A',
            description: 'Official national public holiday observed across South Africa.'
          },
          {
            id: '4',
            title: 'Annual Inter-House Sports & Cultural Gala',
            date: '2025-06-20',
            time: '09:00 AM - 15:00 PM',
            category: 'Events',
            venue: 'Sports Fields & Pavilion',
            description: 'All parents and guardians are warmly invited to attend and support our athletic teams.'
          }
        ]);
      } else {
        setEvents(list);
      }
    } catch (err) {
      console.error("Error fetching school calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [schoolId]);

  const filteredEvents = categoryFilter === 'All' 
    ? events 
    : events.filter(e => e.category === categoryFilter);

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Official School Calendar & Events</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Stay informed about term dates, PTA meetings, holidays, and examination schedules.
          </p>
        </div>

        <button
          onClick={fetchCalendar}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* CATEGORY FILTER BUTTONS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
        {['All', 'PTA Meetings', 'Exams', 'Holidays', 'Events'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              categoryFilter === cat
                ? 'bg-[#002147] text-white font-black shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* EVENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((evt, idx) => (
          <div key={evt.id || idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-[#002147] transition">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <span className={`px-2.5 py-0.5 font-bold text-[10px] rounded-full uppercase tracking-wider ${
                evt.category === 'PTA Meetings'
                  ? 'bg-purple-100 text-purple-800'
                  : evt.category === 'Exams'
                  ? 'bg-rose-100 text-rose-800'
                  : evt.category === 'Holidays'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {evt.category}
              </span>
              <span className="font-mono font-bold text-xs text-[#002147] bg-slate-100 px-3 py-1 rounded-xl">
                {evt.date}
              </span>
            </div>

            <h3 className="text-base font-black text-[#002147]">{evt.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{evt.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{evt.venue}</span>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
