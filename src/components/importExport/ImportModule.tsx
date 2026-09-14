import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  RefreshCw, 
  HelpCircle,
  ArrowRight,
  Database,
  Loader2,
  Check,
  Search,
  Filter
} from 'lucide-react';
import { ImportEntityType, ImportValidationError } from '../../types/importExport';
import { IMPORT_TEMPLATES, downloadImportTemplate } from '../../utils/templateDefinitions';
import { parseImportFile, processFileImport } from '../../services/importService';
import { validateImportData, PreImportValidationResult } from '../../services/importValidator';
import { downloadImportAuditReport } from '../../services/auditHistoryService';
import { useAuth } from '../../context/AuthContext';

interface ImportModuleProps {
  schoolId: string;
  schoolName?: string;
  userUid: string;
  userName: string;
  userRole: string;
  onImportCompleted?: () => void;
}

export const ImportModule: React.FC<ImportModuleProps> = ({
  schoolId,
  schoolName,
  userUid,
  userName,
  userRole,
  onImportCompleted
}) => {
  const { showToast } = useAuth();
  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>('students');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<PreImportValidationResult | null>(null);

  // Import Processing State
  const [isImporting, setIsImporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [completedReport, setCompletedReport] = useState<any | null>(null);

  // Error Table Search
  const [errorSearch, setErrorSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateDef = IMPORT_TEMPLATES[selectedEntity];

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setValidationResult(null);
    setCompletedReport(null);

    // Trigger pre-import validation immediately
    setIsValidating(true);
    try {
      const parsed = await parseImportFile(selectedFile);
      const res = await validateImportData(selectedEntity, parsed, schoolId);
      setValidationResult(res);
    } catch (err: any) {
      showToast(`File Error: ${err.message || 'Could not parse spreadsheet file.'}`, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (!file || !validationResult) return;

    setIsImporting(true);
    setProgressPercent(5);
    setStatusMessage('Initiating import pipeline...');

    try {
      const { result, historyItem } = await processFileImport({
        file,
        entityType: selectedEntity,
        schoolId,
        schoolName,
        userUid,
        userName,
        userRole,
        onProgress: (pct, msg) => {
          setProgressPercent(pct);
          setStatusMessage(msg);
        }
      });

      setCompletedReport(historyItem);
      onImportCompleted?.();
    } catch (err: any) {
      showToast(`Import Failed: ${err.message || 'An unexpected error occurred during database import.'}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setCompletedReport(null);
    setProgressPercent(0);
    setStatusMessage('');
  };

  const filteredErrors = validationResult?.errors.filter(e => 
    e.field.toLowerCase().includes(errorSearch.toLowerCase()) ||
    e.message.toLowerCase().includes(errorSearch.toLowerCase()) ||
    String(e.rowNumber).includes(errorSearch)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Entity Selection Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          1. Select Entity to Import
        </h3>
        <p className="text-xs text-slate-500 mb-4">Choose the category of school data you want to import into EDUkenZA.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(Object.keys(IMPORT_TEMPLATES) as ImportEntityType[]).map((key) => {
            const t = IMPORT_TEMPLATES[key];
            const active = selectedEntity === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedEntity(key);
                  handleReset();
                }}
                disabled={isImporting}
                className={`p-3 rounded-lg border text-left transition-all ${
                  active
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold leading-tight">{t.title.replace(' Import Template', '')}</p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{t.columns.length} columns</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Download & Upload Area */}
      {!completedReport && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instructions & Template Box */}
          <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <FileSpreadsheet className="w-4 h-4" />
                Download Template
              </div>
              <h4 className="text-lg font-bold mb-2">{templateDef.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {templateDef.description}
              </p>

              <div className="bg-slate-800/80 rounded-lg p-3 text-xs space-y-1.5 border border-slate-700 mb-4">
                <p className="font-semibold text-slate-200">Required Columns:</p>
                <div className="flex flex-wrap gap-1">
                  {templateDef.columns.filter(c => c.required).map(c => (
                    <span key={c.key} className="bg-indigo-950 text-indigo-200 border border-indigo-800/60 px-2 py-0.5 rounded text-[11px]">
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => downloadImportTemplate(selectedEntity, 'xlsx')}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 shadow"
              >
                <Download className="w-4 h-4" />
                Download Excel Template (.xlsx)
              </button>
              <button
                onClick={() => downloadImportTemplate(selectedEntity, 'csv')}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition flex items-center justify-center gap-2 border border-slate-700"
              >
                <FileText className="w-4 h-4" />
                Download CSV Template (.csv)
              </button>
            </div>
          </div>

          {/* File Upload Dropzone */}
          <div className="md:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                2. Upload & Validate File
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Upload your completed Excel or CSV file. The system will run real-time validations before importing.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .csv"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : file
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
                }`}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • Click or drag to replace</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">
                      Drag & Drop your file here, or <span className="text-indigo-600 underline">Browse</span>
                    </p>
                    <p className="text-xs text-slate-400">Supports .xlsx and .csv file formats up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Loading Indicator */}
            {isValidating && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-3 text-indigo-900 text-xs">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-bold">Analyzing and validating file data...</p>
                  <p className="text-indigo-700">Checking for duplicate IDs, missing required fields, and formatting errors.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Result Box */}
      {validationResult && !completedReport && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">3. Pre-Import Validation Summary</h3>
                {validationResult.isValid ? (
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Import
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Validation Issues Found
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review data health metrics below before proceeding with the database write.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Clear & Re-upload
              </button>
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || validationResult.validRowCount === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow transition flex items-center gap-2"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Import {validationResult.validRowCount} Valid Records
              </button>
            </div>
          </div>

          {/* Validation Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Total Rows Detected</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{validationResult.totalRows}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <p className="text-xs text-emerald-700 font-medium">Valid Rows (Pass)</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">{validationResult.validRowCount}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
              <p className="text-xs text-rose-700 font-medium">Failed Rows (Errors)</p>
              <p className="text-2xl font-bold text-rose-800 mt-1">{validationResult.invalidRowCount}</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
              <p className="text-xs text-indigo-700 font-medium">Total Issue Count</p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{validationResult.errors.length}</p>
            </div>
          </div>

          {/* Progress Bar when importing */}
          {isImporting && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-indigo-950">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  {statusMessage}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-indigo-700 text-center">
                Writing valid rows safely to Firestore collections. Do not close this window.
              </p>
            </div>
          )}

          {/* Validation Errors Detail Table */}
          {validationResult.errors.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Validation Error Details ({validationResult.errors.length})
                </h4>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search errors or rows..."
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 border-b">Row #</th>
                      <th className="py-2.5 px-3 border-b">Field</th>
                      <th className="py-2.5 px-3 border-b">Error Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-semibold text-rose-700 bg-rose-50/30">
                          {err.rowNumber > 0 ? `Row ${err.rowNumber}` : 'Header'}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{err.field}</td>
                        <td className="py-2 px-3 text-slate-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Note: You can proceed with importing valid rows. Invalid rows will be skipped and included in the final audit report.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Completion Report View */}
      {completedReport && (
        <div className="bg-white rounded-xl border border-emerald-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-slate-900">Import Job Complete</h3>
            <p className="text-xs text-slate-500 mt-1">
              Data successfully processed for <span className="font-bold text-slate-800">{selectedEntity}</span>.
            </p>
          </div>

          <div className="max-w-lg mx-auto bg-slate-50 rounded-xl p-5 border border-slate-200 grid grid-cols-3 gap-3 text-left">
            <div>
              <p className="text-[11px] text-slate-500 font-medium">Total Processed</p>
              <p className="text-lg font-bold text-slate-900">{completedReport.totalRows}</p>
            </div>
            <div>
              <p className="text-[11px] text-emerald-700 font-medium">Successfully Imported</p>
              <p className="text-lg font-bold text-emerald-700">{completedReport.successfulRows}</p>
            </div>
            <div>
              <p className="text-[11px] text-rose-700 font-medium">Failed / Skipped</p>
              <p className="text-lg font-bold text-rose-700">{completedReport.failedRows}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => downloadImportAuditReport(completedReport)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Official Import Audit Report (PDF)
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
