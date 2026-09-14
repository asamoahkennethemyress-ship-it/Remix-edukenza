import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Filter, 
  UserCheck 
} from 'lucide-react';
import { AuditLogRecord } from '../../types/importExport';
import { fetchAuditLogs } from '../../services/auditHistoryService';

interface AuditLogsViewProps {
  schoolId: string;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ schoolId }) => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'IMPORT' | 'EXPORT'>('ALL');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchAuditLogs(schoolId);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const filtered = logs.filter(log => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            Security & System Audit Logs
          </h3>
          <p className="text-xs text-slate-500">Immutable trail of data import, export, and authorization events.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={actionFilter}
            onChange={(e: any) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="IMPORT">Import Actions Only</option>
            <option value="EXPORT">Export Actions Only</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user, role or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full sm:w-56 focus:outline-none"
            />
          </div>

          <button
            onClick={loadData}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          Fetching system audit log records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No audit records found</p>
          <p className="text-xs text-slate-400">All data operations will automatically record audit entries here.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4 border-b">Action</th>
                <th className="py-3 px-4 border-b">User & Role</th>
                <th className="py-3 px-4 border-b">Entity & Format</th>
                <th className="py-3 px-4 border-b">Record Count</th>
                <th className="py-3 px-4 border-b">Details & Description</th>
                <th className="py-3 px-4 border-b">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4">
                    {log.action === 'IMPORT' ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-emerald-200">
                        <ArrowDownLeft className="w-3 h-3" /> IMPORT
                      </span>
                    ) : (
                      <span className="bg-indigo-100 text-indigo-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 border border-indigo-200">
                        <ArrowUpRight className="w-3 h-3" /> EXPORT
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{log.userName}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{log.userRole.replace('_', ' ')}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800 capitalize">{log.entityType}</p>
                    {log.fileFormat && (
                      <p className="text-[11px] text-slate-400 uppercase font-mono">{log.fileFormat}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">{log.recordCount} records</td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
