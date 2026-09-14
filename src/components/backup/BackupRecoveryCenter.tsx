import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Database, 
  RotateCcw, 
  Clock, 
  History, 
  HardDrive, 
  Plus, 
  Upload, 
  FileCheck, 
  ShieldAlert, 
  RefreshCw, 
  Search, 
  Filter, 
  ListFilter 
} from 'lucide-react';
import { BackupHistoryRecord, RestoreHistoryRecord } from '../../types/backup';
import { fetchBackupHistory } from '../../services/backupService';
import { fetchRestoreHistory } from '../../services/restoreService';
import { BackupWizardModal } from './BackupWizardModal';
import { RestoreWizardModal } from './RestoreWizardModal';
import { BackupHistoryTable } from './BackupHistoryTable';
import { RestoreHistoryTable } from './RestoreHistoryTable';
import { ScheduledBackupConfig } from './ScheduledBackupConfig';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface BackupRecoveryCenterProps {
  role: 'platform_owner' | 'school_admin';
  currentUser: any;
  defaultSchoolId?: string;
  defaultSchoolName?: string;
}

export const BackupRecoveryCenter: React.FC<BackupRecoveryCenterProps> = ({
  role,
  currentUser,
  defaultSchoolId = 'global',
  defaultSchoolName = 'EDUkenZA Platform'
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'backups' | 'restores' | 'schedule' | 'audit'>('overview');

  // Modals state
  const [isBackupWizardOpen, setIsBackupWizardOpen] = useState(false);
  const [isRestoreWizardOpen, setIsRestoreWizardOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupHistoryRecord | null>(null);

  // Data state
  const [backupHistory, setBackupHistory] = useState<BackupHistoryRecord[]>([]);
  const [restoreHistory, setRestoreHistory] = useState<RestoreHistoryRecord[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const schoolId = role === 'platform_owner' ? 'global' : (currentUser?.schoolId || defaultSchoolId || 'global');
  const userUid = currentUser?.uid || currentUser?.id || 'admin_user';
  const userName = currentUser?.name || currentUser?.fullName || currentUser?.email || 'Administrator';

  useEffect(() => {
    loadAllData();
  }, [role, schoolId]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [bkps, rsts] = await Promise.all([
        fetchBackupHistory(role, schoolId),
        fetchRestoreHistory(role, schoolId)
      ]);
      setBackupHistory(bkps);
      setRestoreHistory(rsts);

      // Fetch audit logs related to backup
      try {
        const auditSnap = await getDocs(query(collection(db, 'auditLogs'), limit(50)));
        const logs = auditSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const backupLogs = logs.filter((l: any) => 
          l.action?.includes('BACKUP') || l.action?.includes('RESTORE')
        );
        setAuditLogsList(backupLogs);
      } catch (e) {
        console.warn("Audit logs fetch warning:", e);
      }

    } catch (e) {
      console.error("Error loading backup center data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchRestoreForBackup = (rec: BackupHistoryRecord) => {
    setSelectedBackupForRestore(rec);
    setIsRestoreWizardOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Enterprise Data Protection Engine
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Backup & Disaster Recovery
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Protect {role === 'platform_owner' ? 'all platform schools, accounts, and system data' : `${defaultSchoolName} database records`} against accidental deletion, corruption, or hardware failure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsBackupWizardOpen(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Backup
            </button>

            <button
              onClick={() => {
                setSelectedBackupForRestore(null);
                setIsRestoreWizardOpen(true);
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restore Database
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Total Backups</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{backupHistory.length}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Firestore Snapshots</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Restores Executed</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{restoreHistory.length}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Data Restorations</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Auto Backup</p>
            <p className="text-lg font-black text-emerald-700 mt-1">Daily (02:00 UTC)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Firebase Storage Sync</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">System Protection</p>
            <p className="text-lg font-black text-indigo-900 mt-1">100% Secured</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Firestore Rules Enforced</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          Overview & Quick Actions
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'backups'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Backup History ({backupHistory.length})
        </button>

        <button
          onClick={() => setActiveTab('restores')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'restores'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Restore History ({restoreHistory.length})
        </button>

        {role === 'platform_owner' && (
          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Automatic Schedules
          </button>
        )}

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Audit Log Trail ({auditLogsList.length})
        </button>
      </div>

      {/* Tab Views */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Quick Manual Actions Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Manual Backup Operations
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Generate instant JSON or ZIP data packages for offline archiving or disaster readiness.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-2">
                <p className="font-bold text-indigo-950">Scope: {role === 'platform_owner' ? 'All Platform Collections' : defaultSchoolName}</p>
                <p className="text-slate-600">
                  Runs pre-flight connectivity checks, aggregates Firestore collection documents, and produces encrypted archives.
                </p>
              </div>

              <button
                onClick={() => setIsBackupWizardOpen(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Launch Backup Wizard
              </button>
            </div>

            {/* Quick Restore Actions Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                  Database Restoration Pipeline
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Restore entire backups or selected collections directly into Firestore with safety verification.
                </p>
              </div>

              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 text-xs space-y-2">
                <p className="font-bold text-amber-950">Safeguard Enforced:</p>
                <p className="text-slate-600">
                  Pre-restore file schema validation, selective collection restoration, and explicit confirmation typing required.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedBackupForRestore(null);
                  setIsRestoreWizardOpen(true);
                }}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> Upload & Restore Archive
              </button>
            </div>

          </div>

          {/* Recent History Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Backup Archives</h3>
              <button
                onClick={() => setActiveTab('backups')}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View All Backups ({backupHistory.length}) &rarr;
              </button>
            </div>

            <BackupHistoryTable
              records={backupHistory.slice(0, 5)}
              isLoading={isLoading}
              onRefresh={loadAllData}
              onRestoreSelect={handleLaunchRestoreForBackup}
            />
          </div>
        </div>
      )}

      {/* 2. BACKUP HISTORY */}
      {activeTab === 'backups' && (
        <BackupHistoryTable
          records={backupHistory}
          isLoading={isLoading}
          onRefresh={loadAllData}
          onRestoreSelect={handleLaunchRestoreForBackup}
        />
      )}

      {/* 3. RESTORE HISTORY */}
      {activeTab === 'restores' && (
        <RestoreHistoryTable
          records={restoreHistory}
          isLoading={isLoading}
          onRefresh={loadAllData}
        />
      )}

      {/* 4. AUTOMATIC SCHEDULES */}
      {activeTab === 'schedule' && role === 'platform_owner' && (
        <ScheduledBackupConfig
          schoolId={schoolId}
          userUid={userUid}
          userName={userName}
        />
      )}

      {/* 5. AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Disaster Recovery Audit Logs</h3>
              <p className="text-xs text-slate-500">Security audit records for all backup and restore operations.</p>
            </div>
            <button
              onClick={loadAllData}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition"
            >
              Refresh Logs
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit log entries recorded yet.</p>
            ) : (
              auditLogsList.map((log: any) => (
                <div key={log.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px] uppercase mr-2">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-800">{log.userName || log.userRole}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <BackupWizardModal
        isOpen={isBackupWizardOpen}
        onClose={() => setIsBackupWizardOpen(false)}
        role={role}
        userUid={userUid}
        userName={userName}
        schoolId={schoolId}
        schoolName={defaultSchoolName}
        onBackupSuccess={loadAllData}
      />

      <RestoreWizardModal
        isOpen={isRestoreWizardOpen}
        onClose={() => {
          setIsRestoreWizardOpen(false);
          setSelectedBackupForRestore(null);
        }}
        role={role}
        userUid={userUid}
        userName={userName}
        schoolId={schoolId}
        initialHistoryRecord={selectedBackupForRestore}
        onRestoreSuccess={loadAllData}
      />

    </div>
  );
};
