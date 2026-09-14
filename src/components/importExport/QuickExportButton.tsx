import React, { useState } from 'react';
import { Download, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import { ExportEntityType, ExportFormat } from '../../types/importExport';
import { executeDataExport } from '../../services/exportService';
import { useAuth } from '../../context/AuthContext';

interface QuickExportButtonProps {
  entityType: ExportEntityType;
  title: string;
  userRole: string;
  userUid: string;
  userName: string;
  schoolId: string;
  schoolName?: string;
  filters?: Record<string, any>;
  defaultFormat?: ExportFormat;
  className?: string;
}

export const QuickExportButton: React.FC<QuickExportButtonProps> = ({
  entityType,
  title,
  userRole,
  userUid,
  userName,
  schoolId,
  schoolName,
  filters = {},
  defaultFormat = 'pdf',
  className = ''
}) => {
  const { showToast } = useAuth();
  const [loading, setLoading] = useState(false);
  const activeFormat: ExportFormat = (defaultFormat as ExportFormat) || 'pdf';

  const handleExport = async (format: ExportFormat) => {
    setLoading(true);
    try {
      await executeDataExport({
        entityType,
        format,
        filters,
        schoolId,
        schoolName,
        userUid,
        userName,
        userRole
      });
    } catch (err: any) {
      showToast(`Export Error: ${err?.message || 'Could not export file.'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        onClick={() => handleExport(activeFormat)}
        disabled={loading}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Export {title} ({activeFormat.toUpperCase()})
      </button>

      <button
        onClick={() => {
          const altFormat: ExportFormat = activeFormat === 'pdf' ? 'xlsx' : 'pdf';
          handleExport(altFormat);
        }}
        disabled={loading}
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
        title={`Export as ${activeFormat === 'pdf' ? 'XLSX' : 'PDF'}`}
      >
        {activeFormat === 'pdf' ? <FileSpreadsheet className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
