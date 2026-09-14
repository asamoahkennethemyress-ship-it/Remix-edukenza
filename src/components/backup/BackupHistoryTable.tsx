import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  RotateCcw, 
  Database, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  FileArchive, 
  Clock, 
  User 
} from 'lucide-react';
import { BackupHistoryRecord } from '../../types/backup';
import { triggerBlobDownload } from '../../services/backupService';

interface BackupHistoryTableProps {
  records: BackupHistoryRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onRestoreSelect?: (record: BackupHistoryRecord) => void;
}

export const BackupHistoryTable: React.FC<BackupHistoryTableProps> = ({
  records,
  isLoading,
  onRefresh,
  onRestoreSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'full' | 'partial'>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'json' | 'zip'>('all');

  const filtered = records.filter(rec => {
    const matchesSearch = 
      rec.backupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || rec.backupType === typeFilter;
    const matchesFormat = formatFilter === 'all' || rec.fileFormat === formatFilter;

    return matchesSearch && matchesType && matchesFormat;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Backup ID, Creator, or School..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Scope Types</option>
            <option value="full">Full Backups</option>
            <option value="partial">Partial Backups</option>
          </select>

          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Formats</option>
            <option value="json">JSON (.json)</option>
            <option value="zip">ZIP Archive (.zip)</option>
          </select>

          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Backup ID / Scope</th>
              <th className="py-3 px-4">Created By</th>
              <th className="py-3 px-4">Type & Format</th>
              <th className="py-3 px-4">Records & Size</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Loading backup history records from Firestore...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No backup records found matching filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">{rec.backupId}</div>
                    <div className="text-[11px] text-slate-500">{rec.schoolName || rec.schoolId}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {rec.createdBy}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">{rec.role.replace('_', ' ')}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rec.backupType === 'full' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {rec.backupType}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {rec.fileFormat}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{rec.totalRecords} records</div>
                    <div className="text-[11px] text-slate-500">{rec.fileSize}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-600">
                    <div>{new Date(rec.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">{new Date(rec.createdAt).toLocaleTimeString()}</div>
                  </td>

                  <td className="py-3 px-4 text-right space-x-2">
                    {rec.downloadUrl && (
                      <a
                        href={rec.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                        title="Download backup file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    )}

                    {onRestoreSelect && (
                      <button
                        onClick={() => onRestoreSelect(rec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition"
                        title="Restore database from this backup"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    )}
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
