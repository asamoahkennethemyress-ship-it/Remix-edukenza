import React, { useState, useEffect } from 'react';
import { 
  FileCheck, 
  Clock, 
  Award, 
  MessageSquare, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  Search 
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentSubmissionsProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentSubmissions: React.FC<StudentSubmissionsProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || currentUser?.uid?.slice(0, 8) || '';

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'assignmentSubmissions'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentIdNumber || data.studentUid === currentUser?.uid) {
          list.push({ id: d.id, ...data });
        }
      });
      setSubmissions(list);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to submissions:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, studentIdNumber, currentUser?.uid]);

  const filtered = submissions.filter(s => 
    s.assignmentTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Assignment Submissions</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Complete history of submitted homework, assigned grades, and teacher notes.
          </p>
        </div>

        <button
          onClick={() => showToast('Live real-time sync active', 'info')}
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
            placeholder="Search submitted assignments..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>
      </div>

      {/* SUBMISSIONS LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Fetching submission records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No assignment submissions recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(sub => (
              <div key={sub.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                  <div>
                    <span className="px-2 py-0.5 bg-slate-200 text-[#002147] font-bold text-[10px] rounded-lg">
                      {sub.subject || 'General Subject'}
                    </span>
                    <h3 className="text-sm font-black text-[#002147] mt-1">{sub.assignmentTitle}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                      {sub.status || 'Submitted'}
                    </span>
                    {sub.grade && (
                      <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] font-mono font-black text-xs rounded-xl shadow-sm">
                        Grade: {sub.grade}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Submission Notes:</span>
                    <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 mt-1">
                      {sub.notes || 'No student notes attached.'}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-500 block text-[10px] uppercase">Teacher Feedback:</span>
                    <p className="text-blue-900 bg-blue-50/80 p-2.5 rounded-xl border border-blue-200 mt-1 font-medium">
                      {sub.feedback || 'Pending teacher review.'}
                    </p>
                  </div>
                </div>

                {sub.fileUrl && (
                  <div className="pt-2 flex justify-end">
                    <a
                      href={sub.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-[#002147] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-[#003366] transition"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D4AF37]" /> View Attached File
                    </a>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
