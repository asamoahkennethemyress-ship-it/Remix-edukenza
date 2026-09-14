import React, { useState } from 'react';
import { Search, RotateCcw, CheckCircle2, User, Database } from 'lucide-react';
import { RestoreHistoryRecord } from '../../types/backup';

interface RestoreHistoryTableProps {
  records: RestoreHistoryRecord[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const RestoreHistoryTable: React.FC<RestoreHistoryTableProps> = ({
  records,
  isLoading,
  onRefresh
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = records.filter(rec => 
    rec.restoreId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.backupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.restoredBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Restore ID, Backup ID, or User..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
        >
          Refresh History
        </button>
      </div>

      {/* Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Restore ID</th>
              <th className="py-3 px-4">Source Backup ID</th>
              <th className="py-3 px-4">Restored By</th>
              <th className="py-3 px-4">Restored Collections & Count</th>
              <th className="py-3 px-4">Impact Details</th>
              <th className="py-3 px-4">Restored Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Loading restore audit history from Firestore...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No restore execution history recorded yet.
                </td>
              </tr>
            ) : (
              filtered.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      {rec.restoreId}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-700">
                    {rec.backupId}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {rec.restoredBy}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">{rec.role.replace('_', ' ')}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-emerald-700">{rec.totalRecords} records</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                      {rec.restoredCollections.join(', ')}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-[11px] text-slate-600">
                    {rec.impactSummary || 'Standard document merge'}
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    <div>{new Date(rec.restoredAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">{new Date(rec.restoredAt).toLocaleTimeString()}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
