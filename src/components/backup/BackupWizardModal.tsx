import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Database, 
  HardDrive, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Download, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Layers, 
  Clock, 
  FileType 
} from 'lucide-react';
import { BackupType, BackupFormat, SystemHealthCheckResult, CollectionBackupMeta } from '../../types/backup';
import { BACKUP_COLLECTIONS, getCollectionsForRole } from '../../utils/backupCollections';
import { runSystemHealthCheck, estimateCollectionRecords } from '../../services/backupValidationService';
import { createDatabaseBackup, triggerBlobDownload } from '../../services/backupService';
import { useAuth } from '../../context/AuthContext';

interface BackupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'platform_owner' | 'school_admin';
  userUid: string;
  userName: string;
  schoolId: string;
  schoolName?: string;
  onBackupSuccess?: () => void;
}

export const BackupWizardModal: React.FC<BackupWizardModalProps> = ({
  isOpen,
  onClose,
  role,
  userUid,
  userName,
  schoolId,
  schoolName = 'EDUkenZA Academy',
  onBackupSuccess
}) => {
  const { showToast } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Health Check State
  const [isHealthChecking, setIsHealthChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<SystemHealthCheckResult | null>(null);

  // Configuration State
  const [backupType, setBackupType] = useState<BackupType>('full');
  const [fileFormat, setFileFormat] = useState<BackupFormat>('json');
  
  // Collections Selection
  const availableCollections = getCollectionsForRole(role);
  const [selectedColIds, setSelectedColIds] = useState<string[]>(availableCollections.map(c => c.id));
  const [collectionMetas, setCollectionMetas] = useState<CollectionBackupMeta[]>([]);
  const [isEstimating, setIsEstimating] = useState(false);

  // Progress State
  const [isExecuting, setIsExecuting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [completedResult, setCompletedResult] = useState<{
    record: any;
    blob: Blob;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedColIds(availableCollections.map(c => c.id));
      setCompletedResult(null);
      runHealthChecks();
    }
  }, [isOpen]);

  const runHealthChecks = async () => {
    setIsHealthChecking(true);
    try {
      const res = await runSystemHealthCheck(role, schoolId);
      setHealthResult(res);
    } catch (e) {
      console.warn("Health check warning:", e);
    } finally {
      setIsHealthChecking(false);
    }
  };

  const handleNextToCollections = async () => {
    if (backupType === 'full') {
      setSelectedColIds(availableCollections.map(c => c.id));
    }
    
    setStep(2);
    setIsEstimating(true);
    try {
      const metas = await estimateCollectionRecords(
        backupType === 'full' ? availableCollections.map(c => c.id) : selectedColIds,
        role,
        schoolId
      );
      setCollectionMetas(metas);
    } catch (e) {
      console.warn("Error estimating collections:", e);
    } finally {
      setIsEstimating(false);
    }
  };

  const toggleCollection = (id: string) => {
    if (selectedColIds.includes(id)) {
      if (selectedColIds.length === 1) return; // Must keep at least one
      setSelectedColIds(selectedColIds.filter(c => c !== id));
    } else {
      setSelectedColIds([...selectedColIds, id]);
    }
  };

  const handleExecuteBackup = async () => {
    setStep(3);
    setIsExecuting(true);
    setProgressPercent(5);
    setProgressMsg('Initiating backup pipeline...');

    try {
      const targetCols = backupType === 'full' ? availableCollections.map(c => c.id) : selectedColIds;
      
      const res = await createDatabaseBackup({
        role,
        userUid,
        userName,
        schoolId,
        schoolName,
        backupType,
        selectedCollections: targetCols,
        fileFormat,
        onProgress: (pct, msg) => {
          setProgressPercent(pct);
          setProgressMsg(msg);
        }
      });

      setCompletedResult({
        record: res.backupRecord,
        blob: res.downloadBlob,
        fileName: res.fileName
      });

      setStep(4);
      onBackupSuccess?.();
    } catch (err: any) {
      showToast(`Backup Failed: ${err.message || 'An error occurred during database backup.'}`, 'error');
      setStep(2);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  const totalEstimatedRecords = collectionMetas.reduce((acc, curr) => acc + curr.recordCount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                EDUkenZA Disaster Recovery Engine
              </div>
              <h2 className="text-lg font-extrabold text-white">Create Database Backup</h2>
            </div>
          </div>

          {!isExecuting && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Wizard Step Indicator */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>1</span>
            Diagnostics
          </div>
          <div className="w-8 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>2</span>
            Scope & Options
          </div>
          <div className="w-8 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>3</span>
            Execution
          </div>
          <div className="w-8 h-0.5 bg-slate-300" />
          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-indigo-600' : ''}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'}`}>4</span>
            Complete
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          
          {/* STEP 1: Diagnostics */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Pre-Backup Diagnostics & Connectivity
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifying Firestore database, Cloud Storage access, and permissions for <span className="font-bold text-slate-800">{schoolName}</span>.
                </p>
              </div>

              {isHealthChecking ? (
                <div className="py-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Testing connection health & permissions...</p>
                </div>
              ) : healthResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-xl border ${healthResult.firestoreConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'}`}>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        {healthResult.firestoreConnected ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                        Firestore Connection
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {healthResult.firestoreConnected ? 'Ready for bulk reading & backup queries' : 'Connection unreachable'}
                      </p>
                    </div>

                    <div className={`p-4 rounded-xl border ${healthResult.storageConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                      <div className="flex items-center gap-2 font-bold text-xs">
                        {healthResult.storageConnected ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        Firebase Storage
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {healthResult.storageConnected ? 'Storage bucket ready for file uploads' : 'Direct blob download active'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-800 mb-2">Collection Authorization Status ({availableCollections.length} available):</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      {availableCollections.map(col => {
                        const ok = healthResult.collectionAccessStatus[col.id];
                        return (
                          <div key={col.id} className="flex items-center gap-1.5 text-slate-700">
                            <div className={`w-2 h-2 rounded-full ${ok !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="truncate">{col.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNextToCollections}
                  disabled={isHealthChecking || !healthResult?.firestoreConnected}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition flex items-center gap-2 disabled:opacity-50"
                >
                  Next: Scope & Options
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Scope & Options */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    Configure Backup Options
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select full vs partial scope and export file format.</p>
                </div>
              </div>

              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setBackupType('full');
                    setSelectedColIds(availableCollections.map(c => c.id));
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    backupType === 'full'
                      ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-600" />
                    Full Backup
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Backup all {availableCollections.length} available collections in system scope.
                  </p>
                </button>

                <button
                  onClick={() => setBackupType('partial')}
                  className={`p-4 rounded-xl border text-left transition ${
                    backupType === 'partial'
                      ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Partial Backup
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select specific collections to include in backup file.
                  </p>
                </button>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Output Format:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFileFormat('json')}
                    className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                      fileFormat === 'json'
                        ? 'border-indigo-600 bg-indigo-950 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Standard JSON (.json)</p>
                      <p className="text-[11px] text-slate-400">Single unified JSON data package</p>
                    </div>
                    {fileFormat === 'json' && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>

                  <button
                    onClick={() => setFileFormat('zip')}
                    className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
                      fileFormat === 'zip'
                        ? 'border-indigo-600 bg-indigo-950 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Compressed ZIP Archive (.zip)</p>
                      <p className="text-[11px] text-slate-400">Folder with separate collection files</p>
                    </div>
                    {fileFormat === 'zip' && <Check className="w-4 h-4 text-indigo-400" />}
                  </button>
                </div>
              </div>

              {/* Collection Checklist if Partial */}
              {backupType === 'partial' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>Select Collections ({selectedColIds.length} / {availableCollections.length}):</span>
                    <button
                      onClick={() => setSelectedColIds(availableCollections.map(c => c.id))}
                      className="text-indigo-600 text-[11px] hover:underline"
                    >
                      Select All
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 space-y-1">
                    {availableCollections.map(col => {
                      const selected = selectedColIds.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleCollection(col.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <p className="font-bold text-slate-800">{col.label}</p>
                              <p className="text-[11px] text-slate-400">{col.description}</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                            {col.id}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pre-flight summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="text-slate-500">Estimated Total Records:</p>
                  <p className="text-lg font-bold text-slate-900">
                    {isEstimating ? 'Calculating...' : `${totalEstimatedRecords} records`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Target Collections:</p>
                  <p className="font-bold text-indigo-600">
                    {backupType === 'full' ? availableCollections.length : selectedColIds.length} collections
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleExecuteBackup}
                  disabled={selectedColIds.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition flex items-center gap-2 disabled:opacity-50"
                >
                  Execute Backup Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Execution Progress */}
          {step === 3 && (
            <div className="py-8 space-y-6 text-center">
              <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Creating Backup Package</h3>
                <p className="text-xs text-slate-500 mt-1">{progressMsg}</p>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <div className="flex justify-between text-xs font-bold text-indigo-950">
                  <span>Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Safely extracting Firestore snapshots and compiling metadata archive. Please wait...
              </p>
            </div>
          )}

          {/* STEP 4: Success & Download */}
          {step === 4 && completedResult && (
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Backup Successfully Created!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Database snapshot is archived and logged in system audit history.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-left space-y-2.5 max-w-lg mx-auto text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Backup ID:</span>
                  <span className="font-mono font-bold text-slate-900">{completedResult.record.backupId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Total Records Archived:</span>
                  <span className="font-bold text-emerald-700">{completedResult.record.totalRecords} records</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">File Format & Size:</span>
                  <span className="font-bold text-slate-800 uppercase">{completedResult.record.fileFormat} ({completedResult.record.fileSize})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Created At:</span>
                  <span className="text-slate-700">{new Date(completedResult.record.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => triggerBlobDownload(completedResult.blob, completedResult.fileName)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Backup Archive ({completedResult.record.fileFormat.toUpperCase()})
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition"
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
