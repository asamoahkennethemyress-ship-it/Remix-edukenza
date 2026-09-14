import React, { useState } from 'react';
import { 
  Download, 
  FileJson, 
  ShieldCheck, 
  Database, 
  Lock, 
  ArrowRight,
  ExternalLink 
} from 'lucide-react';
import { DownloadPersonalDataModal } from './DownloadPersonalDataModal';
import { useAuth } from '../../context/AuthContext';

export interface PersonalDataExportCardProps {
  currentUser?: any;
  customTitle?: string;
  customDescription?: string;
  variant?: 'card' | 'compact' | 'banner';
  className?: string;
}

export const PersonalDataExportCard: React.FC<PersonalDataExportCardProps> = ({
  currentUser: propUser,
  customTitle,
  customDescription,
  variant = 'card',
  className = ''
}) => {
  const { currentUser: authUser, showToast } = useAuth();
  const userToUse = propUser || authUser;
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!userToUse) return null;

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-[#002147] font-bold text-xs rounded-xl shadow-sm transition cursor-pointer ${className}`}
          title="Download all user-related information in JSON format"
        >
          <FileJson className="w-4 h-4 text-[#D4AF37]" />
          <span>Download Personal Data (JSON)</span>
        </button>

        <DownloadPersonalDataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentUser={userToUse}
          showToast={showToast}
        />
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`p-4 bg-gradient-to-r from-slate-900 to-[#002147] rounded-2xl text-white border border-[#D4AF37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-xl text-[#D4AF37]">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-white">{customTitle || 'Data Portability & Personal Archive'}</h4>
              <p className="text-xs text-slate-300">
                {customDescription || 'Export your full account records, educational data, and passkey metadata as a JSON file.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Personal Data</span>
          </button>
        </div>

        <DownloadPersonalDataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentUser={userToUse}
          showToast={showToast}
        />
      </>
    );
  }

  return (
    <>
      <div className={`bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 ${className}`}>
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-xl text-[#002147]">
              <FileJson className="w-5 h-5 text-[#002147]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#002147] uppercase tracking-wide">
                {customTitle || 'Personal Data Portability & Export'}
              </h3>
              <p className="text-xs text-slate-500">
                {customDescription || 'Download a machine-readable JSON archive containing all user-related information, attendance history, academic marks, and biometric credentials metadata.'}
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono border border-slate-200">
            JSON Format
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Compliance</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              POPIA & GDPR
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Security Assurance</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              Zero Private Keys
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Format</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <Database className="w-3.5 h-3.5 text-[#002147]" />
              Structured .json
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Archive includes profile, enrolled role records, passkeys, and logs.</span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#D4AF37]" />
            <span>Download Personal Data</span>
          </button>
        </div>
      </div>

      <DownloadPersonalDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={userToUse}
        showToast={showToast}
      />
    </>
  );
};
