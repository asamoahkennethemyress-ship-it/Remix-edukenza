import React, { useState, useEffect } from 'react';
import { 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  Printer, 
  Download, 
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentResultsProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentResults: React.FC<StudentResultsProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || currentUser?.uid?.slice(0, 8) || '';
  const className = studentRecord?.className || currentUser?.className || '';

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'studentResults'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const isMyDoc = data.studentId === studentIdNumber || data.studentUid === currentUser.uid || data.email === currentUser.email;
        const isPublished = data.published === true || data.status === 'Published' || data.isPublished === true || data.status === 'published';
        
        if (isMyDoc && isPublished) {
          list.push({ id: d.id, ...data });
        }
      });
      setResults(list);
      setLoading(false);
    }, (err) => {
      console.error("Real-time results subscription error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, studentIdNumber, currentUser.uid]);

  const resultsToDisplay = results;

  const filtered = resultsToDisplay.filter(r =>
    r.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSum = filtered.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
  const averageScore = filtered.length > 0 ? Math.round(totalSum / filtered.length) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Academic Results & Scores</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official published term marks, Continuous Assessment (CA), Examination scores, and promotion status.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
        >
          <Printer className="w-4 h-4" /> Print Results
        </button>
      </div>

      {/* SUMMARY STATS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Mark Average</span>
          <p className="text-3xl font-black text-[#002147]">{averageScore}%</p>
          <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Distinctions Achieved
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Standing</span>
          <p className="text-3xl font-black text-[#002147]">Top 5%</p>
          <p className="text-[10px] text-slate-500 font-medium">Class: {className}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promotion Status</span>
          <p className="text-xl font-black text-emerald-700">Promoted to Next Grade</p>
          <p className="text-[10px] text-emerald-600 font-bold">Passed with Distinction</p>
        </div>

      </div>

      {/* RESULTS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-base font-black text-[#002147]">Published Subject Scores</h2>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search subject..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#002147] text-white uppercase text-[10px] font-black tracking-wider">
                <th className="p-3.5 rounded-l-xl">Subject</th>
                <th className="p-3.5">CA Score (40%)</th>
                <th className="p-3.5">Exam Score (60%)</th>
                <th className="p-3.5">Total Score</th>
                <th className="p-3.5">Grade</th>
                <th className="p-3.5 rounded-r-xl">Educator Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.length > 0 ? (
                filtered.map((res, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-[#002147]">{res.subject || res.subjectName}</td>
                    <td className="p-3.5 font-mono">{res.caScore ?? res.ca ?? '-'}</td>
                    <td className="p-3.5 font-mono">{res.examScore ?? res.exam ?? '-'}</td>
                    <td className="p-3.5 font-mono font-black text-[#002147]">{res.total != null ? `${res.total}%` : '-'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 bg-blue-100 text-blue-900 font-black font-mono rounded-md">
                        {res.grade || '-'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 italic">{res.remark || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    No published examination results found for your profile. Results will appear here once approved by your educators.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
