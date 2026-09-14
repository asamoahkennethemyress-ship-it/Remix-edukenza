import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileJson, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  User, 
  Lock, 
  GraduationCap, 
  Bell, 
  Activity, 
  KeyRound, 
  Database,
  ExternalLink,
  Eye,
  Sliders
} from 'lucide-react';
import { 
  gatherPersonalData, 
  downloadPersonalDataAsJson, 
  PersonalDataExportPackage 
} from '../../utils/personalDataExporter';

export interface DownloadPersonalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DownloadPersonalDataModal: React.FC<DownloadPersonalDataModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  showToast
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('Initializing data collector...');
  const [exportData, setExportData] = useState<PersonalDataExportPackage | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'json_preview'>('summary');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-gather data when modal is opened
  useEffect(() => {
    if (isOpen && currentUser?.uid) {
      handlePrepareData();
    } else {
      setExportData(null);
      setProgress(0);
      setDownloaded(false);
      setErrorMsg(null);
    }
  }, [isOpen, currentUser?.uid]);

  const handlePrepareData = async () => {
    setLoading(true);
    setProgress(5);
    setProgressText('Connecting to EDUkenZA Data Repositories...');
    setErrorMsg(null);

    try {
      const data = await gatherPersonalData(currentUser, (text, pct) => {
        setProgressText(text);
        setProgress(pct);
      });
      setExportData(data);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to gather personal data:', err);
      setErrorMsg(err.message || 'Unable to gather all user records at this time.');
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!exportData) return;
    downloadPersonalDataAsJson(exportData);
    setDownloaded(true);
    if (showToast) {
      showToast('Personal data JSON file downloaded successfully!', 'success');
    }
  };

  const handleCopyJson = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (showToast) {
      showToast('Raw JSON data copied to clipboard!', 'info');
    }
  };

  if (!isOpen) return null;

  const fileSizeKb = exportData 
    ? (new Blob([JSON.stringify(exportData)]).size / 1024).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] text-white p-6 border-b border-[#D4AF37]/30 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shadow-inner">
              <FileJson className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Download Personal Data</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#D4AF37] text-[#002147] text-[10px] font-black uppercase tracking-wider">
                  JSON Export
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                POPIA & GDPR Right to Data Portability • Machine-Readable Archive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t-2 ${
              activeTab === 'summary'
                ? 'bg-white text-[#002147] border-[#002147] shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            Data Categories & Download
          </button>
          <button
            onClick={() => setActiveTab('json_preview')}
            disabled={!exportData}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t-2 flex items-center gap-1.5 ${
              activeTab === 'json_preview'
                ? 'bg-white text-[#002147] border-[#002147] shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-800 disabled:opacity-40'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Raw JSON Preview</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* LOADING STATE */}
          {loading && (
            <div className="py-10 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#002147] animate-spin" />
                <FileJson className="w-6 h-6 text-[#D4AF37] absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-[#002147] text-sm">Gathering & Packaging Your Personal Data</h3>
                <p className="text-slate-500 text-xs">{progressText}</p>
              </div>

              {/* Progress Bar */}
              <div className="max-w-md mx-auto bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div 
                  className="bg-[#002147] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400 font-bold">{progress}% Complete</span>
            </div>
          )}

          {/* ERROR STATE */}
          {errorMsg && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Error generating personal data package</span>
              </div>
              <p className="text-[11px] text-red-700">{errorMsg}</p>
              <button
                onClick={handlePrepareData}
                className="mt-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Gathering Data</span>
              </button>
            </div>
          )}

          {/* SUMMARY TAB */}
          {!loading && exportData && activeTab === 'summary' && (
            <div className="space-y-6">
              {/* STATUS CARD */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">Personal Data Package Ready</h4>
                    <p className="text-emerald-700 text-[11px]">
                      Archive generated for <strong>{exportData.metadata.dataSubject.email}</strong> • {fileSizeKb} KB
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-lg font-mono font-bold text-[10px]">
                  {exportData.metadata.summary.totalRecordsExtracted} Records
                </span>
              </div>

              {/* INCLUDED CATEGORIES GRID */}
              <div>
                <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider mb-3">
                  What is included in your export:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Category 1: Profile & Identity */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#002147] font-bold">
                      <User className="w-4 h-4 text-[#D4AF37]" />
                      <span>Identity & Profile Records</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Account UID, Full Name, Email, Phone Number, Home Address, Emergency Contacts, Bio, and Avatar URLs.
                    </p>
                  </div>

                  {/* Category 2: Educational / Role Data */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#002147] font-bold">
                      <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                      <span>Role & Academic Data</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Assigned classes, subjects, attendance timestamps, grade results, guardian links, or institution configurations.
                    </p>
                  </div>

                  {/* Category 3: Biometric & Security */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#002147] font-bold">
                      <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                      <span>Biometric & Passkeys Metadata</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      WebAuthn credentials list, device authenticators, AAGUIDs, biometric verification audit logs (zero private keys).
                    </p>
                  </div>

                  {/* Category 4: Activity & Notices */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#002147] font-bold">
                      <Bell className="w-4 h-4 text-[#D4AF37]" />
                      <span>Notifications & Activity Logs</span>
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      In-app alerts, school announcements, login sessions history, and system preferences.
                    </p>
                  </div>

                </div>
              </div>

              {/* COMPLIANCE & PRIVACY NOTE */}
              <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 text-slate-600 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-slate-800">POPIA & GDPR Data Subject Access:</span> Your data is packaged strictly in standard, uncompressed JSON format according to international data portability standards. No credentials or passwords are ever stored or included in unhashed forms.
                </div>
              </div>

            </div>
          )}

          {/* RAW JSON PREVIEW TAB */}
          {!loading && exportData && activeTab === 'json_preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#002147]" />
                  <span className="font-bold text-[#002147]">Personal Data JSON Structure</span>
                  <span className="text-[10px] text-slate-400 font-mono">({fileSizeKb} KB)</span>
                </div>

                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer text-[11px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] max-h-72 overflow-y-auto border border-slate-800 leading-relaxed shadow-inner">
                <pre>{JSON.stringify(exportData, null, 2)}</pre>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Export ID: <strong className="font-mono text-slate-700">{exportData?.metadata.exportId || '---'}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs flex-1 sm:flex-initial"
            >
              Close
            </button>

            <button
              onClick={handleDownload}
              disabled={loading || !exportData}
              className="px-5 py-2 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-xs flex-1 sm:flex-initial disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#D4AF37]" />
              <span>{downloaded ? 'Download Again (.json)' : 'Download JSON File'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
