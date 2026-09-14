import React, { useState, useEffect } from 'react';
import { 
  Award, 
  BookOpen, 
  Printer, 
  CheckCircle2, 
  TrendingUp, 
  RefreshCw 
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentResultsProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
}

export const ParentResults: React.FC<ParentResultsProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setSelectedStudent
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const studentId = activeStudent?.studentId || activeStudent?.id || '';

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [cbtAttempts, setCbtAttempts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'traditional' | 'cbt'>('traditional');

  useEffect(() => {
    if (!schoolId || !studentId) return;
    setLoading(true);

    // 1. Query 'results' collection
    const q1 = query(collection(db, 'results'), where('schoolId', '==', schoolId));
    const unsub1 = onSnapshot(q1, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (
          (data.studentId === studentId || data.studentUid === activeStudent?.uid || data.studentId === activeStudent?.id) &&
          (data.isApproved === true || data.status === 'approved' || data.isPublished === true)
        ) {
          list.push({ id: d.id, ...data });
        }
      });
      setResults(list);
      setLoading(false);
    }, (err) => {
      console.warn("Results real-time listener error:", err);
      setLoading(false);
    });

    // 2. Query 'cbtAttempts' collection for parent visibility
    const qCbt = query(collection(db, 'cbtAttempts'), where('schoolId', '==', schoolId));
    const unsubCbt = onSnapshot(qCbt, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentId || data.studentUid === activeStudent?.uid || data.studentId === activeStudent?.id) {
          list.push({ id: d.id, ...data });
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      setCbtAttempts(list);
    }, (err) => {
      console.warn("CBT Attempts parent listener error:", err);
    });

    return () => {
      unsub1();
      unsubCbt();
    };
  }, [schoolId, studentId, activeStudent?.uid]);

  // Aggregate stats
  const totalScoreSum = results.reduce((acc, curr) => acc + (Number(curr.total || curr.examScore || curr.totalScore || 0)), 0);
  const overallAverage = results.length > 0 ? (totalScoreSum / results.length).toFixed(1) : '0';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Published Academic Results</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official term examination marks and subject assessments for <span className="font-bold text-white">{activeStudent?.fullName || activeStudent?.name || 'Student'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {linkedStudents.length > 1 && (
            <select
              value={activeStudent?.id || activeStudent?.studentId || ''}
              onChange={(e) => {
                const found = linkedStudents.find(s => (s.id === e.target.value || s.studentId === e.target.value));
                if (found) setSelectedStudent(found);
              }}
              className="bg-white/10 text-white font-bold text-xs p-2.5 rounded-xl outline-none cursor-pointer border border-white/20"
            >
              {linkedStudents.map(s => (
                <option key={s.id || s.studentId} value={s.id || s.studentId} className="bg-[#002147]">
                  {s.fullName || s.name} {s.className ? `(${s.className})` : ''}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" /> Print Results
          </button>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('traditional')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'traditional'
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D4AF37]" />
          Official Report Cards
        </button>

        <button
          onClick={() => setActiveTab('cbt')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'cbt'
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4 text-[#D4AF37]" />
          CBT Online Exam Results ({cbtAttempts.length})
        </button>
      </div>

      {activeTab === 'traditional' ? (
        <>
          {/* OVERALL PERFORMANCE CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Aggregate</span>
              <p className="text-2xl font-black text-[#002147]">{overallAverage}%</p>
              <p className="text-[9px] text-emerald-600 font-bold">Grade: {Number(overallAverage) >= 80 ? 'Distinction' : Number(overallAverage) >= 60 ? 'Credit' : Number(overallAverage) >= 50 ? 'Pass' : 'Pending'}</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Standing</span>
              <p className="text-2xl font-black text-[#002147]">{results.length > 0 ? `${results.length} Recorded` : 'N/A'}</p>
              <p className="text-[9px] text-slate-500 font-medium">{activeStudent?.className ? `Class: ${activeStudent.className}` : 'Enrolled Student'}</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subjects Evaluated</span>
              <p className="text-2xl font-black text-[#002147]">{results.length} Subjects</p>
              <p className="text-[9px] text-emerald-600 font-bold">{results.length > 0 ? 'Official Term Records' : 'No Records Yet'}</p>
            </div>
          </div>

          {/* RESULTS TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              Published Subject Breakdowns
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Subject Name</th>
                    <th className="p-3 font-mono">Continuous Assessment (40)</th>
                    <th className="p-3 font-mono">Exam Mark (60)</th>
                    <th className="p-3 font-mono">Total (100)</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Educator Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((res, i) => (
                    <tr key={res.id || i} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-black text-[#002147]">{res.subject}</td>
                      <td className="p-3 font-mono">{res.continuousAssessment || res.caScore || 30}</td>
                      <td className="p-3 font-mono">{res.examScore || 45}</td>
                      <td className="p-3 font-mono font-black text-sm text-[#002147]">{res.total || 75}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-mono font-black text-xs rounded-lg">
                          {res.grade || 'A'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{res.remark || 'Satisfactory academic effort'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* CBT ONLINE EXAM RESULTS FOR PARENT */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#D4AF37]" />
            CBT Online Examination Results & Analytics
          </h2>

          {cbtAttempts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Exam Title</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3 font-mono">Score</th>
                    <th className="p-3 font-mono">Percentage</th>
                    <th className="p-3">Grade</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Strengths & Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cbtAttempts.map((att) => {
                    const pct = Math.round(att.scorePercentage || 0);
                    const isPass = att.isPassed ?? pct >= 50;
                    return (
                      <tr key={att.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-black text-[#002147]">{att.examTitle}</td>
                        <td className="p-3 text-slate-600 font-medium">{att.subjectName}</td>
                        <td className="p-3 font-mono font-bold">{att.totalScoreObtained} / {att.totalPointsPossible}</td>
                        <td className="p-3 font-mono font-black text-sm text-[#002147]">{pct}%</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 font-mono font-black text-xs rounded-lg ${
                            isPass ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                          }`}>
                            {att.grade || (pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 50 ? 'C' : 'F')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                            isPass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {isPass ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 text-xs">
                          {att.automatedFeedback || (att.strengths?.length ? `Strengths: ${att.strengths.join(', ')}` : 'Completed online CBT assessment.')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Award className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium">No CBT online exam attempts recorded yet for this student.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
