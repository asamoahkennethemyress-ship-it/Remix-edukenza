import React, { useState, useEffect } from 'react';
import { 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Search, 
  RefreshCw,
  Award
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  onSnapshot,
  updateDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherResultSubmissionProps {
  schoolId: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface SubjectResultDoc {
  id: string;
  schoolId: string;
  className: string;
  subjectName: string;
  term: string;
  academicYear: string;
  teacherId: string;
  teacherName: string;
  scores: any[];
  submissionStatus: 'Draft' | 'Submitted for Approval' | 'Approved' | 'Rejected';
  rejectionReason?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const TeacherResultSubmission: React.FC<TeacherResultSubmissionProps> = ({
  schoolId,
  assignedClasses,
  assignedSubjects,
  currentUser,
  showToast
}) => {
  const [resultSheets, setResultSheets] = useState<SubjectResultDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch subject results
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'subjectResults'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: SubjectResultDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as SubjectResultDoc));
      setResultSheets(list);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to subject results:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId]);

  // Submit to Admin
  const handleSubmitToAdmin = async (sheetId: string) => {
    setProcessingId(sheetId);
    try {
      await updateDoc(doc(db, 'subjectResults', sheetId), {
        submissionStatus: 'Submitted for Approval',
        submittedAt: serverTimestamp()
      });
      showToast("Result sheet submitted to School Admin for approval!", "success");
    } catch (err) {
      showToast("Failed to submit result sheet", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Recall Submission
  const handleRecallSubmission = async (sheetId: string) => {
    setProcessingId(sheetId);
    try {
      await updateDoc(doc(db, 'subjectResults', sheetId), {
        submissionStatus: 'Draft',
        recalledAt: serverTimestamp()
      });
      showToast("Result sheet recalled back to Draft", "info");
    } catch (err) {
      showToast("Failed to recall result sheet", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSheets = resultSheets.filter(s => 
    s.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Result Submission & Approval Tracking</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Submit complete class score sheets to School Admin for review, or recall submitted sheets before approval.
          </p>
        </div>
      </div>

      {/* SEARCH AND REFRESH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search class or subject..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <button
          onClick={() => showToast('Live real-time sync active', 'info')}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* RESULT SHEETS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading result sheets...</p>
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            No score sheets found. First enter scores in the <strong className="text-[#002147]">Score Entry</strong> tab.
          </div>
        ) : (
          filteredSheets.map(sheet => (
            <div key={sheet.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    sheet.submissionStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    sheet.submissionStatus === 'Submitted for Approval' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    sheet.submissionStatus === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                    'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {sheet.submissionStatus}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {sheet.term} • {sheet.academicYear}
                  </span>
                </div>

                <h3 className="text-base font-black text-[#002147]">{sheet.className}</h3>
                <p className="text-xs font-bold text-amber-800">{sheet.subjectName}</p>

                <div className="p-2.5 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Graded Students:</span>
                    <span className="font-bold text-[#002147]">{sheet.scores?.length || 0} Students</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Teacher:</span>
                    <span className="font-semibold">{sheet.teacherName}</span>
                  </div>
                </div>

                {sheet.rejectionReason && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    <strong>Admin Note:</strong> {sheet.rejectionReason}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                {sheet.submissionStatus === 'Draft' || sheet.submissionStatus === 'Rejected' ? (
                  <button
                    onClick={() => handleSubmitToAdmin(sheet.id)}
                    disabled={processingId === sheet.id}
                    className="w-full py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{processingId === sheet.id ? 'Submitting...' : 'Submit to Admin for Approval'}</span>
                  </button>
                ) : sheet.submissionStatus === 'Submitted for Approval' ? (
                  <button
                    onClick={() => handleRecallSubmission(sheet.id)}
                    disabled={processingId === sheet.id}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recall Submission (Make Edits)</span>
                  </button>
                ) : (
                  <div className="w-full py-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl text-center border border-emerald-200 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approved & Locked by Admin</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
