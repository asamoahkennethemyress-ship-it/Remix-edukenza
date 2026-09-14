import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  Clock, 
  ShieldAlert, 
  Database, 
  Building2, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { ImportModule } from './ImportModule';
import { ExportModule } from './ExportModule';
import { ImportHistoryView } from './ImportHistoryView';
import { ExportHistoryView } from './ExportHistoryView';
import { AuditLogsView } from './AuditLogsView';
import { fetchImportHistory, fetchExportHistory, fetchAuditLogs } from '../../services/auditHistoryService';

interface ImportExportCenterProps {
  userRole: 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  currentUser: any;
  defaultSchoolId?: string;
  defaultSchoolName?: string;
}

export const ImportExportCenter: React.FC<ImportExportCenterProps> = ({
  userRole,
  currentUser,
  defaultSchoolId = '',
  defaultSchoolName = ''
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'import-history' | 'export-history' | 'audit-logs'>(
    userRole === 'teacher' || userRole === 'student' || userRole === 'parent' ? 'export' : 'import'
  );

  const [selectedSchoolId, setSelectedSchoolId] = useState(defaultSchoolId || currentUser?.schoolId || 'global');
  const [selectedSchoolName, setSelectedSchoolName] = useState(defaultSchoolName || currentUser?.schoolName || 'EDUkenZA Academy');

  // KPI Stats
  const [stats, setStats] = useState({
    totalImports: 0,
    totalExports: 0,
    totalAuditLogs: 0,
    failedImportRows: 0
  });

  const loadStats = async () => {
    try {
      const imps = await fetchImportHistory(selectedSchoolId);
      const exps = await fetchExportHistory(selectedSchoolId);
      const logs = await fetchAuditLogs(selectedSchoolId);

      const failedCount = imps.reduce((acc, curr) => acc + (curr.failedRows || 0), 0);

      setStats({
        totalImports: imps.length,
        totalExports: exps.length,
        totalAuditLogs: logs.length,
        failedImportRows: failedCount
      });
    } catch (e) {
      console.warn("Error loading center stats:", e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedSchoolId]);

  const canImport = userRole === 'platform_owner' || userRole === 'school_admin';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              <FileSpreadsheet className="w-4 h-4" />
              EDUkenZA Platform Enterprise System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Import & Export Data Management</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Bulk data ingestion, pre-import validation, custom filtered spreadsheet report exports, and security audit logs.
            </p>
          </div>

          {/* Quick KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-xl">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Imports</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">{stats.totalImports}</p>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-xl">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Exports</p>
              <p className="text-lg font-bold text-indigo-400 mt-0.5">{stats.totalExports}</p>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 p-3 rounded-xl col-span-2 sm:col-span-1">
              <p className="text-[11px] text-slate-400 font-semibold uppercase">Audit Log Trails</p>
              <p className="text-lg font-bold text-amber-400 mt-0.5">{stats.totalAuditLogs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm flex flex-wrap gap-1">
        {canImport && (
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Data Import
          </button>
        )}

        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'export'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Download className="w-4 h-4" />
          Data Export
        </button>

        {canImport && (
          <button
            onClick={() => setActiveTab('import-history')}
            className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'import-history'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Import History
          </button>
        )}

        <button
          onClick={() => setActiveTab('export-history')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'export-history'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Export History
        </button>

        <button
          onClick={() => setActiveTab('audit-logs')}
          className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 ${
            activeTab === 'audit-logs'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Audit Logs
        </button>
      </div>

      {/* Main Tab Content */}
      <div>
        {activeTab === 'import' && canImport && (
          <ImportModule
            schoolId={selectedSchoolId}
            schoolName={selectedSchoolName}
            userUid={currentUser?.uid || 'user_anon'}
            userName={currentUser?.fullName || currentUser?.name || 'Administrator'}
            userRole={userRole}
            onImportCompleted={loadStats}
          />
        )}

        {activeTab === 'export' && (
          <ExportModule
            schoolId={selectedSchoolId}
            schoolName={selectedSchoolName}
            userUid={currentUser?.uid || 'user_anon'}
            userName={currentUser?.fullName || currentUser?.name || 'User'}
            userRole={userRole}
            onExportCompleted={loadStats}
          />
        )}

        {activeTab === 'import-history' && canImport && (
          <ImportHistoryView schoolId={selectedSchoolId} />
        )}

        {activeTab === 'export-history' && (
          <ExportHistoryView schoolId={selectedSchoolId} />
        )}

        {activeTab === 'audit-logs' && (
          <AuditLogsView schoolId={selectedSchoolId} />
        )}
      </div>
    </div>
  );
};
