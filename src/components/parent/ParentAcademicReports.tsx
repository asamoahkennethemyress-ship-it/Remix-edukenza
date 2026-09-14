import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle2, 
  Award, 
  X, 
  RefreshCw 
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentAcademicReportsProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParentAcademicReports: React.FC<ParentAcademicReportsProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setSelectedStudent,
  showToast
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const studentId = activeStudent?.studentId || activeStudent?.id || '';

  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReportModal, setSelectedReportModal] = useState<any | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'academicReports'),
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

      setReports(list);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to academic reports:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, studentId, activeStudent?.uid]);

  const handleDownloadPDF = (report: any) => {
    showToast(`Downloading official report card PDF: ${report.term}...`, 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Academic Report Cards</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Official termly academic reports and progress cards for <span className="font-bold text-white">{activeStudent?.fullName || activeStudent?.name || 'Student'}</span>.
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
            onClick={() => showToast('Live real-time sync active', 'info')}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* REPORTS LIST OR EMPTY STATE */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-[#002147]">No Academic Reports Published</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Official termly reports and evaluations for {activeStudent?.fullName || activeStudent?.name || 'this student'} will be visible here once published and endorsed by school administration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reports.map((rep, idx) => (
            <div key={rep.id || idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full uppercase tracking-wider">
                    {rep.status || 'Verified'}
                  </span>
                  <h3 className="text-base font-black text-[#002147] mt-1">{rep.term} ({rep.year})</h3>
                  <p className="text-xs text-slate-500 font-mono">Issued: {rep.issueDate || 'N/A'}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Average</span>
                  <span className="text-xl font-black text-[#002147]">{rep.overallAverage}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="text-slate-700">
                  <strong className="text-[#002147]">Teacher Remark:</strong> {rep.teacherComment}
                </p>
                <p className="text-slate-700">
                  <strong className="text-[#002147]">Principal Remark:</strong> {rep.principalComment}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedReportModal(rep)}
                  className="flex-1 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#D4AF37]" /> View Official Report
                </button>
                <button
                  onClick={() => handleDownloadPDF(rep)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#002147] font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* REPORT CARD FULL MODAL */}
      {selectedReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 space-y-6 shadow-2xl relative border border-slate-200">
            
            <button
              onClick={() => setSelectedReportModal(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* REPORT CARD HEADER */}
            <div className="text-center border-b border-slate-200 pb-4 space-y-1">
              <h2 className="text-2xl font-black text-[#002147] uppercase">{currentUser.schoolName || 'EDUkenZA Academy'}</h2>
              <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">OFFICIAL ACADEMIC REPORT CARD</p>
              <p className="text-xs text-slate-500 font-mono">
                Student: {activeStudent?.fullName || activeStudent?.name || 'Student'}{activeStudent?.className ? ` • Class: ${activeStudent.className}` : ''} • ID: {studentId}
              </p>
            </div>

            {/* REPORT METRICS */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Period</span>
                <span className="font-black text-[#002147]">{selectedReportModal.term}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Aggregate</span>
                <span className="font-black text-emerald-700 text-sm">{selectedReportModal.overallAverage}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Class Rank</span>
                <span className="font-black text-[#002147]">{selectedReportModal.position}</span>
              </div>
            </div>

            {/* REMARKS */}
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
                <span className="font-black text-[#002147] text-[10px] uppercase block">Educator Assessment:</span>
                <p>{selectedReportModal.teacherComment}</p>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-1">
                <span className="font-black text-[#002147] text-[10px] uppercase block">School Principal Recommendation:</span>
                <p>{selectedReportModal.principalComment}</p>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={handlePrint}
                className="flex-1 py-3 bg-[#002147] text-white font-black text-xs rounded-xl hover:bg-[#003366] transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" /> Print Official Report
              </button>
              <button
                onClick={() => setSelectedReportModal(null)}
                className="px-6 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
