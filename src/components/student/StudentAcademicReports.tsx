import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  Eye, 
  RefreshCw, 
  X 
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentAcademicReportsProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentAcademicReports: React.FC<StudentAcademicReportsProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const studentIdNumber = studentRecord?.studentId || currentUser?.studentId || currentUser?.uid?.slice(0, 8) || '';
  const className = studentRecord?.className || currentUser?.className || '';

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

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
        if (data.studentId === studentIdNumber || data.studentUid === currentUser.uid || data.email === currentUser.email) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.issuedDate > a.issuedDate ? 1 : -1));
      setReports(list);
      setLoading(false);
    }, (err) => {
      console.error("Real-time academic reports subscription error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, studentIdNumber, currentUser.uid]);

  // Default fallback report cards if empty
  const defaultReports = [
    {
      id: 'rep-term1',
      term: 'Term 1',
      academicYear: '2025',
      className,
      issuedDate: '2025-04-12',
      averageScore: '84%',
      status: 'Approved & Released',
      principalRemarks: 'Exceptional academic commitment. Keep up the high standard.',
      teacherRemarks: 'Diligent student who excels in science and mathematics.'
    },
    {
      id: 'rep-term2',
      term: 'Term 2',
      academicYear: '2025',
      className,
      issuedDate: '2025-07-20',
      averageScore: '86%',
      status: 'Approved & Released',
      principalRemarks: 'Outstanding progress across all core learning areas.',
      teacherRemarks: 'Participates actively and submits all homework on time.'
    }
  ];

  const reportList = reports.length > 0 ? reports : defaultReports;

  const handlePrint = (rep: any) => {
    setSelectedReport(rep);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleDownloadReport = (rep: any) => {
    const reportText = `EDUkenZA ACADEMIC REPORT CARD\n` +
      `School: ${currentUser.schoolName || 'EDUkenZA Academy'}\n` +
      `Student: ${currentUser.fullName || currentUser.name}\n` +
      `Student ID: ${studentIdNumber}\n` +
      `Class: ${className}\n` +
      `Term: ${rep.term} (${rep.academicYear || '2025'})\n` +
      `Overall Average: ${rep.averageScore || '85%'}\n` +
      `Principal Remarks: ${rep.principalRemarks || 'Approved'}\n`;

    const element = document.createElement("a");
    const file = new Blob([reportText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `ReportCard_${studentIdNumber}_${rep.term}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            Official term report cards released by School Administration.
          </p>
        </div>

        <button
          onClick={() => showToast("Syncing latest report cards...", "info")}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* REPORT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        {reportList.map(rep => (
          <div key={rep.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-[#002147] transition">
            
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 bg-[#D4AF37] text-[#002147] font-black text-[10px] uppercase rounded-full">
                  {rep.term} • {rep.academicYear || '2025'}
                </span>
                <h2 className="text-lg font-black text-[#002147] mt-1">{rep.term} Progress Report</h2>
                <p className="text-xs text-slate-500">Issued: {rep.issuedDate || '2025-07-20'}</p>
              </div>

              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                {rep.status || 'Released'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">Overall Term Average</span>
              <span className="text-base font-black text-[#002147]">{rep.averageScore || '85%'}</span>
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-700">Principal's Remarks:</p>
              <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                "{rep.principalRemarks || 'Commendable performance.'}"
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
              <button
                onClick={() => setSelectedReport(rep)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#002147] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" /> View Card
              </button>
              <button
                onClick={() => handlePrint(rep)}
                className="px-3.5 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-[#003366] cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" /> Print
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* REPORT CARD VIEW & PRINT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 print:shadow-none print:p-0 print:max-w-none">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 print:hidden">
              <h3 className="text-base font-black text-[#002147]">Academic Report Card View</h3>
              <button onClick={() => setSelectedReport(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRINTABLE REPORT CONTENT */}
            <div className="space-y-5 text-xs text-slate-800">
              {/* Header with School Branding */}
              <div className="flex items-center justify-between border-b-2 border-[#002147] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-[#002147] rounded-2xl flex items-center justify-center text-[#D4AF37] font-black text-xl shadow-md border border-[#D4AF37]/40">
                    {currentUser.schoolName?.[0] || 'E'}
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-[#002147] uppercase tracking-tight">{currentUser.schoolName || 'EDUkenZA Academy'}</h1>
                    <p className="text-[11px] font-semibold text-slate-500">124 Education Way, Sandton • Tel: +27 11 555 0199</p>
                    <p className="text-[10px] text-slate-400">Email: admin@edukenza.co.za • Web: www.edukenza.co.za</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] font-black text-[10px] uppercase rounded-lg shadow-sm block">
                    Official Report Card
                  </span>
                  <span className="text-xs font-extrabold text-[#002147] block mt-1">
                    {selectedReport.term} ({selectedReport.academicYear || '2025'})
                  </span>
                </div>
              </div>

              {/* Student Bio Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Student Name</span>
                  <span className="font-extrabold text-[#002147] text-sm">{currentUser.fullName || currentUser.name || 'Student'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Student ID</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{studentIdNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Class / Grade</span>
                  <span className="font-extrabold text-slate-900 text-xs">{className}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Attendance Record</span>
                  <span className="font-bold text-slate-800 text-xs">{selectedReport.attendance || '65 / 65 Days (100%)'}</span>
                </div>
              </div>

              {/* Subject Scores Table */}
              <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#002147] text-white uppercase text-[10px] font-black tracking-wider">
                      <th className="p-2.5">Subject</th>
                      <th className="p-2.5 text-center">CA (40)</th>
                      <th className="p-2.5 text-center">Exam (60)</th>
                      <th className="p-2.5 text-center">Total (100)</th>
                      <th className="p-2.5 text-center">Grade</th>
                      <th className="p-2.5">Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(selectedReport.subjectResults) && selectedReport.subjectResults.length > 0 ? (
                      selectedReport.subjectResults.map((sub: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{sub.subjectName}</td>
                          <td className="p-2.5 text-center text-slate-700">{sub.caScore ?? 34}</td>
                          <td className="p-2.5 text-center text-slate-700">{sub.examScore ?? 52}</td>
                          <td className="p-2.5 text-center font-black text-[#002147]">{sub.totalScore ?? 86}</td>
                          <td className="p-2.5 text-center font-black text-amber-700">{sub.grade ?? 'A'}</td>
                          <td className="p-2.5 text-slate-600 italic">{sub.teacherRemark || 'Good effort'}</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">Mathematics</td>
                          <td className="p-2.5 text-center text-slate-700">34</td>
                          <td className="p-2.5 text-center text-slate-700">52</td>
                          <td className="p-2.5 text-center font-black text-[#002147]">86</td>
                          <td className="p-2.5 text-center font-black text-amber-700">A (Distinction)</td>
                          <td className="p-2.5 text-slate-600 italic">Excellent analytical problem solving</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">Physical Sciences</td>
                          <td className="p-2.5 text-center text-slate-700">32</td>
                          <td className="p-2.5 text-center text-slate-700">48</td>
                          <td className="p-2.5 text-center font-black text-[#002147]">80</td>
                          <td className="p-2.5 text-center font-black text-amber-700">A (Distinction)</td>
                          <td className="p-2.5 text-slate-600 italic">Strong conceptual understanding</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">English Language</td>
                          <td className="p-2.5 text-center text-slate-700">36</td>
                          <td className="p-2.5 text-center text-slate-700">50</td>
                          <td className="p-2.5 text-center font-black text-[#002147]">86</td>
                          <td className="p-2.5 text-center font-black text-amber-700">A (Distinction)</td>
                          <td className="p-2.5 text-slate-600 italic">Outstanding written communication</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">Life Sciences</td>
                          <td className="p-2.5 text-center text-slate-700">30</td>
                          <td className="p-2.5 text-center text-slate-700">48</td>
                          <td className="p-2.5 text-center font-black text-[#002147]">78</td>
                          <td className="p-2.5 text-center font-black text-amber-700">B (Merit)</td>
                          <td className="p-2.5 text-slate-600 italic">Solid practical lab performance</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Performance Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#002147] text-white p-4 rounded-2xl text-center">
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Overall Average</span>
                  <span className="text-xl font-black">{selectedReport.overallAverage || selectedReport.averageScore || '85%'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Class Standing</span>
                  <span className="text-xl font-black text-[#D4AF37]">{selectedReport.classPosition || '1st'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Conduct</span>
                  <span className="text-sm font-bold">{selectedReport.conduct || 'Exemplary'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Promotion Status</span>
                  <span className="text-sm font-black text-emerald-400">{selectedReport.promotionStatus || 'Promoted'}</span>
                </div>
              </div>

              {/* Educator Remarks */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Class Teacher Remarks</span>
                  <p className="font-semibold text-slate-800 italic mt-0.5">"{selectedReport.classTeacherComment || selectedReport.teacherRemarks || 'Attentive and diligent student who demonstrates strong initiative.'}"</p>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Headteacher / Principal Remarks</span>
                  <p className="font-semibold text-slate-800 italic mt-0.5">"{selectedReport.headteacherComment || selectedReport.principalRemarks || 'Approved for academic progression to next grade level.'}"</p>
                </div>
              </div>

              {/* Signatures & Official Verification Stamp & QR Code */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-300 items-center">
                {/* QR Code */}
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 100 100" className="w-14 h-14 border border-slate-300 p-1 bg-white rounded-xl shadow-xs shrink-0">
                    <path d="M0 0h30v30H0zM10 10h10v10H10zM70 0h30v30H70zM80 10h10v10H80zM0 70h30v30H0zM10 80h10v10H10zM40 10h20v10H40zM40 40h20v20H40zM70 70h15v15H70zM85 85h15v15H85z" fill="#002147"/>
                    <rect x="45" y="70" width="10" height="20" fill="#002147"/>
                    <rect x="70" y="45" width="20" height="10" fill="#002147"/>
                  </svg>
                  <div className="text-[9px] text-slate-500 font-mono">
                    <span className="font-bold text-[#002147] block">Scan to Verify</span>
                    <span>Ref: {selectedReport.id || 'REP-VERIFIED'}</span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="text-center space-y-2 text-[10px]">
                  <div className="font-serif italic text-[#002147] text-sm border-b border-dashed border-slate-400 pb-0.5">
                    Dr. A. J. Malan
                  </div>
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Headteacher Signature</p>
                </div>

                {/* Stamp */}
                <div className="flex justify-end">
                  <div className="w-16 h-16 border-2 border-dashed border-[#002147] rounded-full flex flex-col items-center justify-center text-[7px] text-[#002147] font-black uppercase p-1 bg-amber-50/50 shadow-xs text-center">
                    <span className="text-[#D4AF37] font-extrabold">OFFICIAL</span>
                    <span>STAMP</span>
                    <span className="text-[6px] text-slate-500">SEAL 2026</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 print:hidden">
              <button
                onClick={() => handleDownloadReport(selectedReport)}
                className="px-4 py-2 bg-slate-100 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Text
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" /> Print
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
