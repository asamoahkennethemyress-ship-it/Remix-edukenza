import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  FileCheck, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  UserCheck, 
  Search, 
  Activity, 
  Key, 
  Eye, 
  Clock, 
  Sparkles,
  Server
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  runAutomatedSecurityAudit, 
  downloadSecurityAuditPDF, 
  SecurityAuditReport, 
  SecurityCheckResult 
} from '../../services/securityTestRunnerService';
import { fetchAuditLogs } from '../../services/auditHistoryService';
import { AuditLogRecord } from '../../types/importExport';
import { UserAuthAuditModal } from './UserAuthAuditModal';

export const SecurityAuditCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [report, setReport] = useState<SecurityAuditReport | null>(null);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'compliance' | 'audit_logs' | 'user_audit'>('compliance');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  const isOwner = currentUser?.role === 'platform_owner';

  useEffect(() => {
    executeAudit();
    loadLogs();
  }, [currentUser]);

  const executeAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await runAutomatedSecurityAudit(currentUser);
      setReport(res);
    } catch (err) {
      console.error('Security audit execution failed:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const schoolId = isOwner ? 'global' : currentUser?.schoolId;
      const logs = await fetchAuditLogs(schoolId, 150);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredChecks = report?.checkResults.filter(r => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  }) || [];

  const filteredLogs = auditLogs.filter(log => {
    if (!logSearchQuery) return true;
    const q = logSearchQuery.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.userName && log.userName.toLowerCase().includes(q)) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.eventType && log.eventType.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-400/30 rounded-xl text-indigo-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Security & Compliance Control Center</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Hardened Production Build
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Role-Based Access Control (RBAC), Firestore Security Rules, Storage Hardening, & Audit Event Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={executeAudit}
              disabled={loadingAudit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAudit ? 'animate-spin' : ''}`} />
              Run Security Audit
            </button>
            {report && (
              <button
                onClick={() => downloadSecurityAuditPDF(report)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-amber-400" />
                Download Report PDF
              </button>
            )}
          </div>
        </div>

        {/* Audit Metric Highlights */}
        {report && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-800">
            <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-medium">Compliance Rating</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {report.overallComplianceScore}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Enterprise Ready</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-medium">Total Security Checks</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {report.totalChecks}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Automated Test Matrix</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-medium">Passed Checks</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {report.passedCount}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-0.5">Fully Verified</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-medium">Warnings</div>
              <div className="text-2xl font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                {report.warningCount}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-0.5">Low Priority</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 p-3.5 rounded-xl">
              <div className="text-xs text-slate-400 font-medium">Failed Checks</div>
              <div className="text-2xl font-extrabold text-rose-400 mt-1 flex items-center gap-1.5">
                <XCircle className="w-5 h-5 text-rose-400" />
                {report.failedCount}
              </div>
              <div className="text-[11px] text-rose-400/80 mt-0.5">Critical Action Required</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === 'compliance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Security Compliance Matrix ({report?.checkResults.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === 'audit_logs'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          Live Security Audit Trail ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('user_audit')}
          className={`pb-3 px-4 font-semibold text-sm transition border-b-2 flex items-center gap-2 ${
            activeTab === 'user_audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" />
          User Firestore UID & Auth Match Audit
        </button>
      </div>

      {/* TAB 1: COMPLIANCE MATRIX */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-medium text-slate-600">
            {['all', 'Access Control', 'Firestore Rules', 'Storage Rules', 'Authentication', 'Rate Limiting', 'Audit & Logging'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg transition capitalize ${
                  selectedCategory === cat
                    ? 'bg-white text-indigo-600 font-bold shadow-sm'
                    : 'hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {/* List of Security Test Results */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {filteredChecks.map(check => (
              <div key={check.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {check.status === 'passed' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {check.status === 'warning' && (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    {check.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400 font-bold">{check.id}</span>
                      <h3 className="text-sm font-bold text-slate-900">{check.testName}</h3>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
                        {check.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{check.description}</p>
                    <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded mt-2 border border-slate-100 font-mono">
                      <span className="font-semibold text-slate-700">Audit Finding: </span>
                      {check.details}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                    check.status === 'passed' ? 'bg-emerald-100 text-emerald-800' :
                    check.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {check.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE AUDIT TRAIL LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search audit logs by email, action, details..."
                value={logSearchQuery}
                onChange={e => setLogSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              Refresh Logs
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Details & Incident Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No security audit logs found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 font-bold rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                            {log.action || log.eventType || 'EVENT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-800 font-medium">
                          {log.userEmail || log.userName || 'System'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 capitalize">
                          {log.userRole || 'Global'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER FIRESTORE UID & AUTH AUDIT */}
      {activeTab === 'user_audit' && (
        <UserAuthAuditModal />
      )}
    </div>
  );
};
