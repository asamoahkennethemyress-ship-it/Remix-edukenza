import React from 'react';
import { 
  Printer, 
  X, 
  Download, 
  ShieldCheck, 
  Award, 
  Calendar, 
  CheckCircle2, 
  User, 
  Share2,
  GraduationCap
} from 'lucide-react';
import { SchoolDocumentSettings, DEFAULT_DOCUMENT_SETTINGS, GradeRule } from '../../types/documentCustomization';
import { AcademicReportRecord } from '../admin/AcademicReportManagement';

interface PrintableReportCardProps {
  report: AcademicReportRecord;
  settings?: SchoolDocumentSettings;
  classPositionText?: string;
  onClose?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PrintableReportCard: React.FC<PrintableReportCardProps> = ({
  report,
  settings = DEFAULT_DOCUMENT_SETTINGS,
  classPositionText,
  onClose,
  showToast
}) => {
  const primaryColor = settings.primaryColor || '#002147';
  const accentColor = settings.accentColor || '#D4AF37';

  const position = classPositionText || (report.classPosition ? `${report.classPosition}` : '1st');
  const gradeRules: GradeRule[] = settings.gradeRules && settings.gradeRules.length > 0 
    ? settings.gradeRules 
    : DEFAULT_DOCUMENT_SETTINGS.gradeRules;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReportId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(report.reportId || report.id);
      showToast?.(`Report ID ${report.reportId || report.id} copied!`, 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {/* Print-specific CSS styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-card-modal, #printable-report-card-modal * {
            visibility: visible;
          }
          #printable-report-card-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>

      <div 
        id="printable-report-card-modal"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[94vh]"
      >
        {/* Top Action Bar (hidden when printing) */}
        <div className="no-print bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
              Official Student Report Card • {report.studentName} ({report.className})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReportId}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
              title="Copy Report ID"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy ID</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Report Card</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Report Card Body */}
        <div className="p-6 sm:p-10 overflow-y-auto print-full-card bg-white text-slate-900 space-y-5">
          {/* REPORT HEADER */}
          <div className="border-b-2 pb-5 border-slate-200" style={{ borderBottomColor: primaryColor }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={settings.logoUrl || DEFAULT_DOCUMENT_SETTINGS.logoUrl}
                  alt={settings.schoolName}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl border border-slate-200 p-1 bg-white shadow-xs"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h1 
                    className="text-xl sm:text-2xl font-black tracking-tight uppercase"
                    style={{ color: primaryColor }}
                  >
                    {settings.schoolName}
                  </h1>
                  {settings.tagline && (
                    <p className="text-xs font-bold tracking-wide italic" style={{ color: accentColor }}>
                      "{settings.tagline}"
                    </p>
                  )}
                  <div className="text-[11px] text-slate-500 font-medium space-y-0.5 mt-1">
                    <p>{settings.address}</p>
                    <p>Tel: {settings.phone} • Email: {settings.email}</p>
                  </div>
                </div>
              </div>

              {/* Document Banner */}
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div 
                  className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider text-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  Student Termly Academic Report
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs font-mono font-black text-slate-900">
                    Term: <span style={{ color: primaryColor }}>{report.term}</span>
                  </p>
                  <p className="text-xs text-slate-600 font-bold">
                    Academic Year: <span className="text-slate-900">{report.academicYear}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Date Issued: {report.dateIssued || new Date().toISOString().split('T')[0]}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* STUDENT BIO INFORMATION CARD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Name</span>
              <span className="font-extrabold text-slate-900 text-sm">{report.studentName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Student ID / Roll No</span>
              <span className="font-mono font-bold text-slate-800">{report.studentId}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Class / Form</span>
              <span className="font-extrabold text-slate-900">{report.className}</span>
            </div>
            {settings.showAttendance && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Term Attendance</span>
                <span className="font-bold text-slate-800">{report.attendance || '65 / 65 Days (100%)'}</span>
              </div>
            )}
          </div>

          {/* ACADEMIC RESULTS TABLE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                  <th className="p-2.5 font-black uppercase text-[11px] tracking-wider">Subject</th>
                  <th className="p-2.5 font-black uppercase text-[11px] tracking-wider text-center w-24">CA (40%)</th>
                  <th className="p-2.5 font-black uppercase text-[11px] tracking-wider text-center w-24">Exam (60%)</th>
                  <th className="p-2.5 font-black uppercase text-[11px] tracking-wider text-center w-24">Total (100%)</th>
                  <th className="p-2.5 font-black uppercase text-[11px] tracking-wider text-center w-20">Grade</th>
                  <th className="p-2.5 font-black uppercase text-[11px] tracking-wider">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {report.subjectResults && report.subjectResults.length > 0 ? (
                  report.subjectResults.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5 font-black text-slate-900">{sub.subjectName}</td>
                      <td className="p-2.5 text-center font-semibold text-slate-700">{sub.caScore}</td>
                      <td className="p-2.5 text-center font-semibold text-slate-700">{sub.examScore}</td>
                      <td className="p-2.5 text-center font-black text-sm" style={{ color: primaryColor }}>
                        {sub.totalScore}
                      </td>
                      <td className="p-2.5 text-center font-black">
                        <span 
                          className={`px-2 py-0.5 rounded text-[11px] font-black ${
                            sub.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                            sub.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            sub.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {sub.grade}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium italic">
                        {sub.teacherRemark || 'Satisfactory progress'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                      No subjects recorded for this report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* OVERALL PERFORMANCE BANNER */}
          <div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-white p-4 rounded-xl text-center shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                Total Aggregate Score
              </span>
              <span className="text-xl font-black">{report.overallTotalScore}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                Overall Average
              </span>
              <span className="text-xl font-black">{report.overallAverage}%</span>
            </div>
            {settings.showPosition && (
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                  Class Position / Rank
                </span>
                <span className="text-xl font-black" style={{ color: accentColor }}>
                  {position}
                </span>
              </div>
            )}
            {settings.showConduct && (
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: accentColor }}>
                  Conduct & Attitude
                </span>
                <span className="text-base font-bold text-slate-100">{report.conduct || 'Very Good'}</span>
              </div>
            )}
          </div>

          {/* TEACHER & HEADTEACHER REMARKS */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {settings.classTeacherTitle} Remarks:
              </span>
              <p className="font-semibold text-slate-800 italic mt-0.5">
                "{report.classTeacherComment || report.teacherRemark || 'A dedicated and conscientious student with consistent performance.'}"
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {settings.principalTitle} Remarks:
              </span>
              <p className="font-semibold text-slate-800 italic mt-0.5">
                "{report.headteacherComment || 'Commendable academic effort this term. Well done.'}"
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between font-bold text-slate-700 gap-2">
              <span>
                Promotion / Academic Standing: <span className="text-emerald-700 font-black">{report.promotionStatus || 'In Good Standing'}</span>
              </span>
              {report.nextClass && (
                <span>
                  Next Class / Term: <span className="font-black" style={{ color: primaryColor }}>{report.nextClass}</span>
                </span>
              )}
            </div>
          </div>

          {/* GRADING SCALE INTERPRETATION KEY */}
          {settings.showGradeLegend && (
            <div className="border border-slate-200 rounded-xl p-3 bg-white text-[10px]">
              <span className="font-black uppercase tracking-wider text-slate-500 block mb-1">
                Official Grading Scale & Key
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {gradeRules.map((rule, idx) => (
                  <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                    <span className="font-black text-slate-900">{rule.grade} ({rule.minMark}% - {rule.maxMark}%):</span>
                    <span className="text-slate-600 font-medium">{rule.remark}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIGNATURES & STAMP AREA */}
          <div className="grid grid-cols-3 gap-6 pt-3 border-t border-slate-200 text-xs">
            <div className="space-y-3">
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-700 font-medium">
                {settings.classTeacherTitle}: <span className="font-bold text-slate-900">Endorsed</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Signature & Date</p>
            </div>

            <div className="space-y-3">
              <div className="border-b border-dashed border-slate-400 pb-1 text-slate-700 font-medium">
                {settings.principalName || settings.principalTitle}: <span className="font-bold text-slate-900">Approved</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Head of School Signature</p>
            </div>

            <div className="flex flex-col items-center justify-center">
              {settings.showOfficialStamp ? (
                <div 
                  className="w-20 h-20 border-2 border-dashed rounded-full flex flex-col items-center justify-center text-center p-1 bg-slate-50 shadow-inner"
                  style={{ borderColor: primaryColor }}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mb-0.5" />
                  <span className="text-[7px] font-black uppercase leading-tight" style={{ color: primaryColor }}>
                    {settings.schoolName?.slice(0, 16)}
                  </span>
                  <span className="text-[6px] text-slate-600 font-bold">OFFICIAL SEAL</span>
                  <span className="text-[5px] text-emerald-700 font-black">AUTHENTICATED</span>
                </div>
              ) : (
                <div className="space-y-3 w-full text-right">
                  <div className="border-b border-dashed border-slate-400 pb-1 text-slate-700 font-medium">
                    Office of the Registrar
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Official Record</p>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER NOTICE */}
          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 font-medium space-y-0.5">
            <p>{settings.footerText || DEFAULT_DOCUMENT_SETTINGS.footerText}</p>
            <p className="text-[9px] text-slate-400 font-mono">
              Issued: {report.dateIssued || new Date().toISOString().split('T')[0]} • Student Reference: {report.studentId}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
