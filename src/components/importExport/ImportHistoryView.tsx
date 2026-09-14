import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  User 
} from 'lucide-react';
import { ImportHistoryItem } from '../../types/importExport';
import { fetchImportHistory, downloadImportAuditReport } from '../../services/auditHistoryService';

interface ImportHistoryViewProps {
  schoolId: string;
}

export const ImportHistoryView: React.FC<ImportHistoryViewProps> = ({ schoolId }) => {
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await fetchImportHistory(schoolId);
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const filtered = history.filter(item => 
    item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.importType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.importedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.importId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Import Activity History
          </h3>
          <p className="text-xs text-slate-500">Track all past spreadsheet import executions and download audit reports.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search file, user or entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          Loading import history records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No import history found</p>
          <p className="text-xs text-slate-400">Import files using the Import Module to see historical logs here.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="py-3 px-4 border-b">File / Import ID</th>
                <th className="py-3 px-4 border-b">Entity</th>
                <th className="py-3 px-4 border-b">Processed Rows</th>
                <th className="py-3 px-4 border-b">Success / Failed</th>
                <th className="py-3 px-4 border-b">Imported By</th>
                <th className="py-3 px-4 border-b">Date & Time</th>
                <th className="py-3 px-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{item.fileName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{item.importId}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-indigo-50 text-indigo-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase">
                      {item.importType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{item.totalRows}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-emerald-700 font-bold">{item.successfulRows} pass</span>
                      {item.failedRows > 0 && (
                        <span className="text-rose-600 font-bold">({item.failedRows} fail)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{item.importedByName}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(item.importedAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => downloadImportAuditReport(item)}
                      className="px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Report
                    </button>
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
