import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Upload, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldAlert, 
  Layers, 
  Check 
} from 'lucide-react';
import { BackupPackage, BackupHistoryRecord, RestoreHistoryRecord } from '../../types/backup';
import { parseBackupFile, executeDatabaseRestore } from '../../services/restoreService';
import { useAuth } from '../../context/AuthContext';

interface RestoreWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'platform_owner' | 'school_admin';
  userUid: string;
  userName: string;
  schoolId: string;
  initialHistoryRecord?: BackupHistoryRecord | null;
  onRestoreSuccess?: () => void;
}

export const RestoreWizardModal: React.FC<RestoreWizardModalProps> = ({
  isOpen,
  onClose,
  role,
  userUid,
  userName,
  schoolId,
  initialHistoryRecord,
  onRestoreSuccess
}) => {
  const { showToast } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Upload & Parse state
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [backupPackage, setBackupPackage] = useState<BackupPackage | null>(null);

  // Restore selection
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');
  const [isConfirmedCheck, setIsConfirmedCheck] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [completedRecord, setCompletedRecord] = useState<RestoreHistoryRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setBackupPackage(null);
      setParseError(null);
      setConfirmText('');
      setIsConfirmedCheck(false);
      setCompletedRecord(null);
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const parsed = await parseBackupFile(file);
      setBackupPackage(parsed.rawPackage);
      setSelectedCollections(parsed.metadata.collectionsIncluded || Object.keys(parsed.dataPayload));
      setStep(2);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse backup archive file.');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleCollection = (colName: string) => {
    if (selectedCollections.includes(colName)) {
      if (selectedCollections.length === 1) return;
      setSelectedCollections(selectedCollections.filter(c => c !== colName));
    } else {
      setSelectedCollections([...selectedCollections, colName]);
    }
  };

  const handleExecuteRestore = async () => {
    if (!backupPackage) return;

    setStep(3);
    setIsExecuting(true);
    setProgressPercent(5);
    setProgressMsg('Initiating pre-restore safety validation...');

    try {
      const record = await executeDatabaseRestore({
        backupPackage,
        selectedCollections,
        role,
        userUid,
        userName,
        targetSchoolId: schoolId,
        onProgress: (pct, msg) => {
          setProgressPercent(pct);
          setProgressMsg(msg);
        }
      });

      setCompletedRecord(record);
      setStep(4);
      onRestoreSuccess?.();
    } catch (err: any) {
      showToast(`Restore Failed: ${err.message || 'An error occurred during database restore.'}`, 'error');
      setStep(2);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  const isConfirmationValid = confirmText.trim().toUpperCase() === 'RESTORE' && isConfirmedCheck;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-amber-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                EDUkenZA Disaster Recovery Engine
              </div>
              <h2 className="text-lg font-extrabold text-white">Database Restore Wizard</h2>
            </div>
          </div>

          {!isExecuting && (
            <button
              onClick={onClose}
              className="p-2 text-amber-200 hover:text-white rounded-lg hover:bg-amber-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Wizard Steps */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-amber-700' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 1 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'}`}>1</span>
            Select Archive
          </div>
          <div className="w-8 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-amber-700' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 2 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'}`}>2</span>
            Inspection & Impact
          </div>
          <div className="w-8 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-amber-700' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 3 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'}`}>3</span>
            Restore
          </div>
          <div className="w-8 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-amber-700' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 4 ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'}`}>4</span>
            Report
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          
          {/* STEP 1: Upload Archive */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-amber-600" />
                  Select or Upload Backup File
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload an EDUkenZA JSON or ZIP backup package to begin restoration.
                </p>
              </div>

              {parseError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">File Validation Error</p>
                    <p className="whitespace-pre-line mt-0.5">{parseError}</p>
                  </div>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-amber-50/20 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".json,.zip"
                  onChange={handleFileUpload}
                  disabled={isParsing}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />

                {isParsing ? (
                  <div className="space-y-2 py-4">
                    <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Validating backup file integrity & extracting schema...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to browse or drag and drop EDUkenZA backup file
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">Supports .JSON or .ZIP backup files</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Summary & Impact & Confirmation */}
          {step === 2 && backupPackage && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  Backup Summary & Restore Impact
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review archive metadata and select collections to write back to Firestore.
                </p>
              </div>

              {/* Metadata Box */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block">Backup ID:</span>
                    <span className="font-mono font-bold text-slate-900">{backupPackage.metadata.backupId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Created Date:</span>
                    <span className="font-bold text-slate-900">
                      {new Date(backupPackage.metadata.dateCreated).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scope / School ID:</span>
                    <span className="font-bold text-slate-900">
                      {backupPackage.metadata.scope.toUpperCase()} ({backupPackage.metadata.schoolId})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Archive Records:</span>
                    <span className="font-bold text-amber-800">{backupPackage.metadata.totalRecords} records</span>
                  </div>
                </div>
              </div>

              {/* Collections Checklist */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>Collections to Restore ({selectedCollections.length} selected):</span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2">
                  {Object.entries(backupPackage.data).map(([colName, docs]) => {
                    const isSelected = selectedCollections.includes(colName);
                    return (
                      <label key={colName} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer text-xs">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCollection(colName)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="font-bold text-slate-800">{colName}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {Array.isArray(docs) ? docs.length : 0} records
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Warning & Confirmation Safety */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900">
                    <p className="font-extrabold text-rose-950">Critical Warning: Data Merge & Overwrite Impact</p>
                    <p className="mt-0.5">
                      Restoring will write records directly to your Firestore database. Matching document IDs will be merged/updated.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-rose-200/60 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isConfirmedCheck}
                      onChange={(e) => setIsConfirmedCheck(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    I understand the restore impact and confirm I want to overwrite/merge existing records.
                  </label>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs font-bold text-slate-700">Type RESTORE to unlock:</span>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="RESTORE"
                      className="px-3 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold tracking-widest uppercase w-32 focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Archive
                </button>
                <button
                  onClick={handleExecuteRestore}
                  disabled={!isConfirmationValid || selectedCollections.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow transition flex items-center gap-2 disabled:opacity-50"
                >
                  Confirm & Execute Restore
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Execution Progress */}
          {step === 3 && (
            <div className="py-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Executing Database Restore</h3>
                <p className="text-xs text-slate-500 mt-1">{progressMsg}</p>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-xs font-bold text-amber-950">
                  <span>Restore Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-amber-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">Writing documents safely to Firestore collections. Please do not close your window.</p>
            </div>
          )}

          {/* STEP 4: Complete Report */}
          {step === 4 && completedRecord && (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Database Restore Complete!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  All selected collection records have been successfully restored to Firestore.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left space-y-2 max-w-lg mx-auto text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Restore ID:</span>
                  <span className="font-mono font-bold text-slate-900">{completedRecord.restoreId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Restored Documents:</span>
                  <span className="font-bold text-emerald-700">{completedRecord.totalRecords} records</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Restored Collections:</span>
                  <span className="font-semibold text-slate-800">{completedRecord.restoredCollections.join(', ')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Completed At:</span>
                  <span className="text-slate-700">{new Date(completedRecord.restoredAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Done & Refresh Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
