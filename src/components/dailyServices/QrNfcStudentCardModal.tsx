import React, { useState } from 'react';
import { 
  QrCode, 
  CreditCard, 
  Wifi, 
  ShieldCheck, 
  User, 
  BookOpen, 
  Bus, 
  Utensils, 
  CheckCircle2, 
  X, 
  Smartphone,
  Printer,
  Sparkles
} from 'lucide-react';
import { StudentWallet } from '../../types/dailyServicesWallet';

interface Props {
  wallet: StudentWallet;
  schoolName?: string;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const QrNfcStudentCardModal: React.FC<Props> = ({
  wallet,
  schoolName = 'EDUkenZA International Academy',
  onClose,
  showToast
}) => {
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcSuccess, setNfcSuccess] = useState(false);

  const triggerNfcTap = () => {
    setNfcScanning(true);
    setNfcSuccess(false);
    setTimeout(() => {
      setNfcScanning(false);
      setNfcSuccess(true);
      if (showToast) {
        showToast(`NFC Card ${wallet.nfcCardId} Scanned Successfully! Verified for student ${wallet.studentName}`, 'success');
      }
    }, 1200);
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-[#002147] text-white p-5 flex items-center justify-between border-b-4 border-[#D4AF37]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#D4AF37] text-[#002147] rounded-xl font-black">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg">Digital Student ID Card</h3>
              <p className="text-xs text-slate-300">QR Code & Contactless NFC Wallet Identity</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* DIGITAL CARD DISPLAY */}
          <div className="bg-gradient-to-br from-[#002147] via-[#003366] to-[#00152e] text-white p-6 rounded-2xl shadow-xl border-2 border-[#D4AF37]/40 relative overflow-hidden">
            {/* Background Accent Gradients */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D4AF37]">
                  {schoolName}
                </span>
                <h4 className="text-xs text-slate-300 font-semibold">Official Student Identity Pass</h4>
              </div>
              <div className="flex items-center gap-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/50 px-2.5 py-1 rounded-full">
                <Wifi className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase">NFC Enabled</span>
              </div>
            </div>

            <div className="flex gap-4 items-center mb-6">
              <div className="w-20 h-20 rounded-xl bg-white/10 border-2 border-[#D4AF37] flex items-center justify-center text-white shadow-inner font-black text-2xl">
                <User className="w-10 h-10 text-[#D4AF37]" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-white">{wallet.studentName}</h2>
                <div className="text-xs text-slate-300 font-medium">Class: <span className="font-bold text-white">{wallet.className}</span></div>
                <div className="text-[11px] text-[#D4AF37] font-bold font-mono">ID: {wallet.studentId}</div>
              </div>
            </div>

            {/* IDS GRID */}
            <div className="grid grid-cols-2 gap-2 bg-black/20 p-3 rounded-xl border border-white/10 text-[11px] mb-4">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Wallet ID</span>
                <span className="font-mono font-bold text-emerald-300">{wallet.walletId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">NFC Identity</span>
                <span className="font-mono font-bold text-sky-300">{wallet.nfcCardId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Library ID</span>
                <span className="font-mono font-bold text-amber-300">LIB-{wallet.studentId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Transport ID</span>
                <span className="font-mono font-bold text-purple-300">BUS-{wallet.studentId}</span>
              </div>
            </div>

            {/* QR CODE BOX */}
            <div className="bg-white p-3 rounded-xl flex items-center justify-between shadow-inner text-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <QrCode className="w-12 h-12 text-[#002147]" />
                </div>
                <div>
                  <div className="text-xs font-black text-[#002147]">Universal Scanner Code</div>
                  <div className="text-[10px] text-slate-500 font-mono">{wallet.qrCodeData}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-400 uppercase font-bold block">Status</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>
            </div>
          </div>

          {/* PERMISSIONS & CAPABILITIES */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Authorized Pass Features
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 text-slate-700 font-medium">
                <Utensils className="w-4 h-4 text-amber-500" />
                <span>Canteen Purchases</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 text-slate-700 font-medium">
                <Bus className="w-4 h-4 text-sky-500" />
                <span>School Bus Attendance</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 text-slate-700 font-medium">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span>Library Borrowing</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 text-slate-700 font-medium">
                <Printer className="w-4 h-4 text-purple-500" />
                <span>Printing & Copies</span>
              </div>
            </div>
          </div>

          {/* NFC TAP SIMULATOR */}
          <div className="border border-sky-100 bg-sky-50/70 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-600 text-white rounded-xl">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-black text-[#002147]">NFC Contactless Terminal</h5>
                <p className="text-[11px] text-slate-600">Simulate tapping physical NFC card to POS reader</p>
              </div>
            </div>

            <button
              onClick={triggerNfcTap}
              disabled={nfcScanning}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                nfcSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#002147] text-white hover:bg-[#003366]'
              }`}
            >
              {nfcScanning ? (
                <>
                  <Wifi className="w-4 h-4 animate-spin text-[#D4AF37]" />
                  <span>Scanning...</span>
                </>
              ) : nfcSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Verified!</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 text-[#D4AF37]" />
                  <span>Simulate NFC Tap</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-100 p-4 flex justify-between items-center border-t border-slate-200">
          <button
            onClick={handlePrintCard}
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print ID Card</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#003366] transition cursor-pointer"
          >
            Close Card
          </button>
        </div>
      </div>
    </div>
  );
};
