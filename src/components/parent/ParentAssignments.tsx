import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Award, 
  User, 
  Search, 
  Eye, 
  MessageSquare, 
  RefreshCw, 
  Sparkles 
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { MathFormulaRenderer } from '../assignment/MathFormulaRenderer';
import { AssignmentQnAModal } from '../assignment/AssignmentQnAModal';

export interface ParentAssignmentsProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParentAssignments: React.FC<ParentAssignmentsProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setSelectedStudent
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const studentId = activeStudent?.studentId || activeStudent?.id || '';
  const className = activeStudent?.className || '';

  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Graded' | 'Overdue'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [qnaModal, setQnaModal] = useState<{ open: boolean; assignment: any | null }>({
    open: false,
    assignment: null
  });

  // Real-time listener for assignments
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const qAss = query(collection(db, 'assignments'), where('schoolId', '==', schoolId));
    const unsubAss = onSnapshot(qAss, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!className || data.className === className || data.targetClass === className || !data.className) {
          list.push({ id: d.id, ...data });
        }
      });
      setAssignments(list);
      setLoading(false);
    }, (err) => {
      console.warn("Assignments real-time listener error:", err);
      setLoading(false);
    });

    return () => unsubAss();
  }, [schoolId, className]);

  // Real-time listener for student submissions
  useEffect(() => {
    if (!schoolId || !studentId) return;

    const qSub = query(collection(db, 'submissions'), where('schoolId', '==', schoolId));
    const unsubSub = onSnapshot(qSub, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentId || data.studentUid === activeStudent?.uid) {
          list.push({ id: d.id, ...data });
        }
      });
      setSubmissions(list);
    }, (err) => {
      console.warn("Submissions real-time listener error:", err);
    });

    return () => unsubSub();
  }, [schoolId, studentId, activeStudent?.uid]);

  const mappedAssignments = assignments.map(ass => {
    const sub = submissions.find(s => s.assignmentId === ass.id);
    let status = 'Pending';
    if (sub) {
      if (sub.status === 'Graded' || sub.score !== undefined || sub.grade !== undefined) {
        status = 'Graded';
      } else {
        status = 'Submitted';
      }
    } else if (ass.dueDate && new Date(ass.dueDate) < new Date()) {
      status = 'Overdue';
    }

    return {
      ...ass,
      submission: sub || null,
      status,
      grade: sub?.score ?? sub?.grade ?? null,
      feedback: sub?.feedback ?? null
    };
  });

  const filteredAssignments = mappedAssignments.filter(item => {
    const matchesSearch = (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (activeTab === 'All') return matchesSearch;
    if (activeTab === 'Pending') return matchesSearch && (item.status === 'Pending' || item.status === 'Submitted');
    if (activeTab === 'Graded') return matchesSearch && item.status === 'Graded';
    if (activeTab === 'Overdue') return matchesSearch && item.status === 'Overdue';
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex justify-between items-center border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Parent Portal — Academic Assignments</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Real-time monitoring of your child's homework progress, teacher rubric scores, feedback notes, and due date alerts.
          </p>
        </div>
      </div>

      {/* CHILD SELECTOR & TABS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        {linkedStudents.length > 0 ? (
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-xs font-bold text-slate-600">Child Roster:</span>
            <select
              value={studentId}
              onChange={(e) => {
                const found = linkedStudents.find(s => (s.id === e.target.value || s.studentId === e.target.value));
                if (found) setSelectedStudent(found);
              }}
              className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-[#002147]"
            >
              {linkedStudents.map(c => (
                <option key={c.id || c.studentId} value={c.id || c.studentId}>
                  {c.fullName || c.name} ({c.className || 'Class'})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-500">Linked Child Profile Active</div>
        )}

        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold">
          {(['All', 'Pending', 'Graded', 'Overdue'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-xl transition ${
                activeTab === t ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ASSIGNMENTS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs font-bold">Synchronizing real-time assignment reports...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border">
            No assignment records found under "{activeTab}".
          </div>
        ) : (
          filteredAssignments.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-[#002147]">
                      {item.subject || item.subjectName || 'Subject'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                      {item.type || 'Homework'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      item.status === 'Graded' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-[#002147] mt-1.5">{item.title}</h3>
                </div>

                <button
                  onClick={() => setQnaModal({ open: true, assignment: item })}
                  className="p-2 bg-blue-50 text-[#002147] rounded-xl hover:bg-blue-100 transition flex items-center gap-1 font-bold text-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                  <span>Discussion</span>
                </button>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Due Date</span>
                  <span className="font-bold text-slate-800">{item.dueDate || 'No due date'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Score / Total</span>
                  <span className="font-black text-emerald-700 font-mono">
                    {item.grade !== null && item.grade !== undefined
                      ? `${item.grade}/${item.maxScore || item.totalMarks || 100}` 
                      : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Submission Date</span>
                  <span className="font-medium text-slate-600">
                    {item.submission?.submittedAt || item.submission?.submissionDate || 'Not Submitted'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Teacher Feedback</span>
                  <span className="font-medium text-slate-700 truncate block">
                    {item.feedback || item.submission?.feedback || 'Pending evaluation'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Q&A MODAL */}
      {qnaModal.open && qnaModal.assignment && (
        <AssignmentQnAModal
          isOpen={qnaModal.open}
          onClose={() => setQnaModal({ open: false, assignment: null })}
          assignment={qnaModal.assignment}
          currentUser={currentUser}
        />
      )}

    </div>
  );
};
