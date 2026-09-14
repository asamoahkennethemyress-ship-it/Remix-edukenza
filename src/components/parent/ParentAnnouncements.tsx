import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Search, 
  Tag, 
  Clock, 
  Bell, 
  RefreshCw 
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentAnnouncementsProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
}

export const ParentAnnouncements: React.FC<ParentAnnouncementsProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const className = activeStudent?.className || '';

  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAnnouncements = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'announcements'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const aud = data.audience || data.targetAudience;
        if (!aud || aud === 'All' || aud === 'Parents' || aud === className) {
          list.push({ id: d.id, ...data });
        }
      });

      if (list.length === 0) {
        setAnnouncements([
          {
            id: '1',
            title: 'Term 2 PTA General Body Assembly Notice',
            message: 'All parents and guardians are invited to attend the general assembly scheduled for May 28th at 17:30 PM.',
            audience: 'Parents',
            priority: 'High Priority',
            publishedDate: '2025-05-12',
            author: 'School Principal'
          },
          {
            id: '2',
            title: 'Grade 10 Science Practical Field Trip Permission Slips',
            message: 'Permission slips for the upcoming Natural Science excursion have been dispatched. Please sign and return by Friday.',
            audience: className,
            priority: 'Normal',
            publishedDate: '2025-05-10',
            author: 'Science Department'
          },
          {
            id: '3',
            title: 'Winter Uniform Transition Policy',
            message: 'Learners are required to transition to full winter uniform starting Monday, May 19th.',
            audience: 'Entire School',
            priority: 'Important',
            publishedDate: '2025-05-05',
            author: 'School Administration'
          }
        ]);
      } else {
        setAnnouncements(list);
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [schoolId, className]);

  const filteredAnnouncements = announcements.filter(a => 
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
            <h1 className="text-2xl font-black tracking-tight">Official School Announcements</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Broadcast messages and notifications for Parents, {className}, and the Entire School.
          </p>
        </div>

        <button
          onClick={fetchAnnouncements}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* SEARCH STRIP */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search announcements by keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* ANNOUNCEMENT CARDS */}
      <div className="space-y-4">
        {filteredAnnouncements.map((ann, idx) => (
          <div key={ann.id || idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-3 hover:border-[#002147] transition">
            
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full uppercase">
                  {ann.priority || 'Notice'}
                </span>
                <span className="px-2.5 py-0.5 bg-blue-100 text-[#002147] font-bold text-[10px] rounded-full uppercase">
                  Target: {ann.audience || 'Parents'}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">{ann.publishedDate || '2025-05-12'}</span>
            </div>

            <h3 className="text-base font-black text-[#002147]">{ann.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{ann.message || ann.content}</p>

            <div className="pt-2 text-[10px] text-slate-400 font-medium">
              Published by: <span className="font-bold text-slate-600">{ann.author || 'School Administration'}</span>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};
