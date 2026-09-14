import React, { useRef } from 'react';
import { X, Award, Printer, Download, CheckCircle, ShieldCheck, Star } from 'lucide-react';
import { CbtCertificate } from '../../types/cbt';

interface CbtCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CbtCertificate | null;
}

export const CbtCertificateModal: React.FC<CbtCertificateModalProps> = ({
  isOpen,
  onClose,
  certificate
}) => {
  const certRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Action Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 rounded-xl border border-[#D4AF37]/30">
              <Award className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">EDUkenZA Official CBT Certificate</h3>
              <p className="text-xs text-slate-400">Verified Computer-Based Examination Achievement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#D4AF37] hover:bg-amber-500 text-[#002147] font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas */}
        <div className="p-8 sm:p-12 bg-[#FAF8F5] flex justify-center print:p-0">
          <div 
            ref={certRef}
            className="w-full max-w-3xl bg-white border-8 border-double border-[#002147] p-8 sm:p-12 rounded-2xl shadow-xl relative overflow-hidden text-center space-y-6"
          >
            {/* Watermark / Background Crest */}
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <Award className="w-96 h-96 text-[#002147]" />
            </div>

            {/* Corner Decorative Ornaments */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#D4AF37]" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#D4AF37]" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#D4AF37]" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#D4AF37]" />

            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-1 bg-[#002147] text-[#D4AF37] text-xs font-black uppercase tracking-widest rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                {certificate.schoolName || 'EDUkenZA International Academy'}
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#002147] tracking-tight">
                Certificate of Academic Distinction
              </h1>
              <p className="text-xs text-slate-500 font-serif italic">
                This official credential is awarded by the Examination Board for Computer-Based Testing Excellence
              </p>
            </div>

            {/* Student Name */}
            <div className="py-4 space-y-1 border-y border-amber-100">
              <p className="text-xs uppercase font-bold tracking-widest text-slate-400">This is to certify that</p>
              <h2 className="text-2xl sm:text-3xl font-black text-[#002147] underline decoration-[#D4AF37] decoration-2 underline-offset-8">
                {certificate.studentName}
              </h2>
              <p className="text-sm font-medium text-slate-600 pt-2">
                has successfully completed and passed the official CBT Examination:
              </p>
              <p className="text-base font-bold text-[#002147]">
                "{certificate.examTitle}" ({certificate.subjectName})
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Score Achieved</span>
                <span className="text-xl font-black text-[#002147]">{certificate.scorePercentage}%</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 block">Grade Awarded</span>
                <span className="text-xl font-black text-amber-900">{certificate.grade}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Verification</span>
                <span className="text-xs font-black text-emerald-900 flex items-center justify-center gap-1 mt-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Passed
                </span>
              </div>
            </div>

            {/* Footer / Signatures */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs border-t border-slate-200">
              <div className="text-left space-y-1">
                <p className="font-mono text-[10px] text-slate-400">Date Issued: <strong className="text-slate-700">{certificate.issuedDate}</strong></p>
                <p className="font-mono text-[10px] text-slate-400">Cert Code: <strong className="text-slate-700">{certificate.certificateCode}</strong></p>
              </div>
              <div className="text-right space-y-1">
                <div className="h-8 border-b border-slate-400 w-32 ml-auto" />
                <p className="font-bold text-[#002147] text-[11px]">School Principal / Exam Officer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
