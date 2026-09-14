import React, { useState, useEffect } from 'react';
import { 
  Award, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  User, 
  Calendar, 
  CheckCircle2, 
  ShieldAlert,
  FileText
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentBehaviourProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent?: (student: any) => void;
}

export const ParentBehaviour: React.FC<ParentBehaviourProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const studentId = activeStudent?.studentId || activeStudent?.id || '';

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Real-time listener for student behaviour records
  useEffect(() => {
    if (!schoolId || !studentId) return;
    setLoading(true);

    const q = query(
      collection(db, 'studentBehaviour'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentId || data.studentUid === activeStudent?.uid || data.studentId === activeStudent?.id) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setRecords(list);
      setLoading(false);
    }, (err) => {
      console.warn('Student behaviour listener error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, studentId, activeStudent?.uid]);

  const filtered = records.filter(r => {
    const title = (r.title || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    const matchSearch = title.includes(searchTerm.toLowerCase()) || desc.includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'All' || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const positiveCount = records.filter(r => (r.category || '').includes('Positive') || (r.category || '').includes('Merit')).length;
  const warningCount = records.filter(r => (r.category || '').includes('Disciplinary') || (r.category || '').includes('Incident')).length;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Conduct & Merit History</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official commendations, merit awards, and discipline logs for <span className="font-bold text-white">{activeStudent?.fullName || activeStudent?.name || 'Student'}</span>.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl text-xs font-black text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{positiveCount} Merits / Commendations</span>
          </div>
          <div className="px-3.5 py-1.5 bg-rose-500/20 border border-rose-400/40 rounded-2xl text-xs font-black text-rose-300 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{warningCount} Warnings / Incidents</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search record title or remarks..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Conduct Categories</option>
            <option value="Positive Achievement">Positive Achievement</option>
            <option value="Merit Award">Merit Award</option>
            <option value="Disciplinary Warning">Disciplinary Warning</option>
            <option value="Class Incident">Class Incident</option>
          </select>
        </div>
      </div>

      {/* RECORDS LIST */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
          <p className="text-xs">Loading behaviour and conduct logs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs space-y-2">
          <Award className="w-8 h-8 mx-auto text-slate-300" />
          <p className="font-bold text-slate-600">No conduct logs recorded for this student.</p>
          <p className="text-slate-400">Class educators will log positive achievements and discipline updates here in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((record, idx) => {
            const isPositive = (record.category || '').includes('Positive') || (record.category || '').includes('Merit');
            return (
              <div 
                key={record.id || idx}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isPositive 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {record.category || 'Conduct Log'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {record.date || 'Recorded'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-[#002147]">{record.title}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      Teacher: {record.teacherName || 'Class Educator'} • Class: {record.className || activeStudent?.className}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-2 border border-slate-100">
                    <p className="text-slate-700 leading-relaxed">{record.description}</p>
                    {record.actionTaken && (
                      <div className="pt-2 border-t border-slate-200/60 font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Action Taken / Award: {record.actionTaken}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
