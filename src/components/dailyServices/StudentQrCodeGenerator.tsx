import React, { useState } from 'react';
import { QrCode, Download, Printer, Copy, Check, ShieldCheck, Bus, Utensils, CreditCard, User } from 'lucide-react';
import { generateStudentQrPayload, generateQrSvgPaths, parseStudentQrPayload } from '../../services/studentQrCodeService';

interface StudentQrCodeGeneratorProps {
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  walletId?: string;
  nfcCardId?: string;
  size?: number;
  showDetails?: boolean;
}

export const StudentQrCodeGenerator: React.FC<StudentQrCodeGeneratorProps> = ({
  schoolId,
  studentId,
  studentName,
  className,
  walletId = `WAL-${studentId}`,
  nfcCardId = `NFC-${studentId}`,
  size = 180,
  showDetails = true
}) => {
  const [copied, setCopied] = useState(false);

  const qrPayloadString = generateStudentQrPayload({
    schoolId,
    studentId,
    studentName,
    className,
    walletId,
    nfcCardId
  });

  const parsed = parseStudentQrPayload(qrPayloadString);
  const svgPaths = generateQrSvgPaths(qrPayloadString);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrPayloadString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg text-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#002147] text-[#D4AF37] rounded-lg">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-black text-sm text-[#002147]">Student Identification & Payment QR</h4>
            <p className="text-[11px] text-slate-500">Universal Canteen & Transport Scanner Identity</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Active Pass
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 items-center">
        {/* Render Vector SVG QR Code */}
        <div className="bg-slate-900 p-4 rounded-2xl border-2 border-[#D4AF37] flex flex-col items-center justify-center shadow-inner relative group">
          <svg
            width={size}
            height={size}
            viewBox="0 0 210 210"
            className="bg-white p-2 rounded-xl shadow"
          >
            {svgPaths.map((d, i) => (
              <path key={i} d={d} fill="#002147" />
            ))}
          </svg>
          <div className="mt-2 text-[10px] font-mono text-[#D4AF37] font-bold tracking-wider">
            ID: {studentId}
          </div>
        </div>

        {/* Details & Actions */}
        {showDetails && (
          <div className="flex-1 space-y-3 w-full">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student Name:</span>
                <span className="font-bold text-slate-900">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Class:</span>
                <span className="font-bold text-slate-900">{className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Wallet ID:</span>
                <span className="font-mono font-bold text-emerald-600">{walletId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Transport Pass:</span>
                <span className="font-mono font-bold text-sky-600">{parsed.payload?.transportPassCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Canteen Code:</span>
                <span className="font-mono font-bold text-amber-600">{parsed.payload?.canteenPassCode}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 p-2 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 font-semibold">
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                <span>Canteen Approved</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-sky-50 text-sky-900 rounded-lg border border-sky-200 font-semibold">
                <Bus className="w-3.5 h-3.5 text-sky-600" />
                <span>Bus Pass Verified</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied QR Payload' : 'Copy Payload'}
              </button>
              <button
                onClick={handlePrint}
                className="py-1.5 px-3 bg-[#002147] hover:bg-[#00152e] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                Print Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
