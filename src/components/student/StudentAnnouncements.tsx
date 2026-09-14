import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Calendar, 
  Search, 
  Pin, 
  Paperclip, 
  RefreshCw 
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentAnnouncementsProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentAnnouncements: React.FC<StudentAnnouncementsProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const className = studentRecord?.className || currentUser?.className || '';

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'announcements'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const aud = data.audience || data.targetAudience;
        if (!aud || aud === 'All' || aud === 'Students' || aud === className || aud === 'all') {
          list.push({ id: d.id, ...data });
        }
      });

      list.sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0));
      setAnnouncements(list);
      setLoading(false);
    }, (err) => {
      console.error("Real-time announcements subscription error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, className]);

  // Fallback broadcasts if empty
  const defaultAnnouncements = [
    {
      id: 'ann-1',
      title: 'End of Term 2 Examination Timetable Released',
      priority: 'High Priority',
      message: 'The official examination timetable for all Grade 10 learners has been uploaded to the Examinations Portal. Please review your paper dates and venues.',
      publishedDate: '2025-07-24',
      author: 'School Administration'
    },
    {
      id: 'ann-2',
      title: 'Annual Inter-House Science & Robotics Fair',
      priority: 'Normal Notice',
      message: 'All learners are invited to register their science fair project proposals before Friday. Great prizes to be won!',
      publishedDate: '2025-07-20',
      author: 'Department of Physical Sciences'
    }
  ];

  const annList = announcements.length > 0 ? announcements : defaultAnnouncements;

  const filtered = annList.filter(a =>
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">School Broadcasts & Notices</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official announcements broadcasted by School Administration and Class Educators.
          </p>
        </div>

        <button
          onClick={() => showToast("Syncing latest broadcasts...", "info")}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search broadcast notices..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>
      </div>

      {/* ANNOUNCEMENTS LIST */}
      <div className="space-y-4">
        {filtered.map(ann => (
          <div key={ann.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3 hover:border-[#002147] transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full uppercase tracking-wider">
                  {ann.priority || 'General Notice'}
                </span>
                <h2 className="text-base font-black text-[#002147] mt-1">{ann.title}</h2>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                {ann.publishedDate || 'Recently Posted'}
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">{ann.message || ann.content}</p>

            <div className="pt-2 flex justify-between items-center text-[11px] text-slate-400 font-bold">
              <span>Author: {ann.author || 'School Administration'}</span>
              {ann.attachmentUrl && (
                <a
                  href={ann.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#002147] hover:underline flex items-center gap-1"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#D4AF37]" /> View Attachment
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
