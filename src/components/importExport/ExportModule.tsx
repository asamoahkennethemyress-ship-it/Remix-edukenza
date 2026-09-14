import React, { useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  FileType, 
  Filter, 
  Calendar, 
  Building2, 
  BookOpen, 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  Users, 
  GraduationCap, 
  ClipboardCheck, 
  BarChart3, 
  ShieldAlert 
} from 'lucide-react';
import { ExportEntityType, ExportFormat, ExportFilters } from '../../types/importExport';
import { executeDataExport } from '../../services/exportService';
import { useAuth } from '../../context/AuthContext';

interface ExportModuleProps {
  schoolId: string;
  schoolName?: string;
  userUid: string;
  userName: string;
  userRole: string;
  onExportCompleted?: () => void;
}

const EXPORT_CATEGORIES: {
  type: ExportEntityType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: 'students', title: 'Students Roster', description: 'All enrolled students, class lists & demographics', icon: GraduationCap },
  { type: 'teachers', title: 'Teachers & Staff', description: 'Faculty members, departments & subjects taught', icon: Users },
  { type: 'parents', title: 'Parents Directory', description: 'Parent contact details & linked student IDs', icon: Users },
  { type: 'classes', title: 'Classes & Streams', description: 'Class structures, grade levels & capacities', icon: Building2 },
  { type: 'subjects', title: 'Academic Subjects', description: 'Subject codes, departments & credit weighting', icon: BookOpen },
  { type: 'timetables', title: 'Class Timetables', description: 'Weekly class schedules, rooms & teachers', icon: Calendar },
  { type: 'attendance', title: 'Attendance Register', description: 'Daily attendance, present/absent logs', icon: ClipboardCheck },
  { type: 'examination-results', title: 'Exam Scores & Grades', description: 'Term assessment marks, grades & remarks', icon: FileText },
  { type: 'academic-reports', title: 'Academic Report Cards', description: 'Student report card evaluation data', icon: FileText },
  { type: 'payments', title: 'Payments & Fees', description: 'Tuition transactions, paid/pending invoices', icon: CreditCard },
  { type: 'payment-receipts', title: 'Payment Receipts', description: 'Official transaction receipt archives', icon: CreditCard },
  { type: 'school-analytics', title: 'School Analytics', description: 'Overall academic & operations KPIs', icon: BarChart3 },
  { type: 'audit-logs', title: 'System Audit Logs', description: 'Comprehensive security audit & activity trails', icon: ShieldAlert }
];

export const ExportModule: React.FC<ExportModuleProps> = ({
  schoolId,
  schoolName,
  userUid,
  userName,
  userRole,
  onExportCompleted
}) => {
  const { showToast } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ExportEntityType>('students');
  const [format, setFormat] = useState<ExportFormat>('xlsx');

  // Filters
  const [academicYear, setAcademicYear] = useState('2026');
  const [term, setTerm] = useState('Term 1');
  const [className, setClassName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('all');

  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setSuccessMessage(null);

    const filters: ExportFilters = {
      academicYear,
      term,
      className,
      subjectName,
      startDate,
      endDate,
      paymentStatus
    };

    try {
      const res = await executeDataExport({
        entityType: selectedCategory,
        format,
        filters,
        schoolId,
        schoolName,
        userUid,
        userName,
        userRole
      });

      setSuccessMessage(`Successfully generated '${res.fileName}' containing ${res.recordCount} records.`);
      onExportCompleted?.();
    } catch (err: any) {
      showToast(`Export Error: ${err.message || 'Failed to export data.'}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          1. Select Export Category
        </h3>
        <p className="text-xs text-slate-500 mb-4">Choose the data collection you wish to export into a report.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {EXPORT_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.type;
            return (
              <button
                key={cat.type}
                onClick={() => {
                  setSelectedCategory(cat.type);
                  setSuccessMessage(null);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  active
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <p className="text-xs font-bold">{cat.title}</p>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{cat.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Export Filters Panel */}
        <div className="md:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-600" />
                2. Apply Export Filters
              </h3>
              <p className="text-xs text-slate-500">Refine the dataset before generating the report file.</p>
            </div>
            <button
              onClick={() => {
                setClassName('');
                setSubjectName('');
                setStartDate('');
                setEndDate('');
                setPaymentStatus('all');
              }}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Term</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Term 4">Term 4</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Class</label>
              <input
                type="text"
                placeholder="e.g. Grade 10A"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Subject</label>
              <input
                type="text"
                placeholder="e.g. Mathematics"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {(selectedCategory === 'payments' || selectedCategory === 'payment-receipts') && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Format Selection & Download Box */}
        <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col justify-between shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              3. Choose File Format
            </h3>
            <p className="text-xs text-slate-300 mb-4">Select format for automatic browser download.</p>

            <div className="space-y-2.5">
              <button
                onClick={() => setFormat('xlsx')}
                className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between ${
                  format === 'xlsx'
                    ? 'border-indigo-500 bg-indigo-950/80 text-white'
                    : 'border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold">Excel Spreadsheet (.xlsx)</p>
                    <p className="text-[11px] text-slate-400">Formatted tables & auto-sized columns</p>
                  </div>
                </div>
                {format === 'xlsx' && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
              </button>

              <button
                onClick={() => setFormat('pdf')}
                className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between ${
                  format === 'pdf'
                    ? 'border-indigo-500 bg-indigo-950/80 text-white'
                    : 'border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-rose-400" />
                  <div>
                    <p className="text-xs font-bold">PDF Document (.pdf)</p>
                    <p className="text-[11px] text-slate-400">Branded header, school logo & pagination</p>
                  </div>
                </div>
                {format === 'pdf' && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
              </button>

              <button
                onClick={() => setFormat('csv')}
                className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between ${
                  format === 'csv'
                    ? 'border-indigo-500 bg-indigo-950/80 text-white'
                    : 'border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileType className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold">CSV Text (.csv)</p>
                    <p className="text-[11px] text-slate-400">UTF-8 compatible comma-separated values</p>
                  </div>
                </div>
                {format === 'csv' && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
              </button>
            </div>
          </div>

          <div>
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Export File...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate & Download Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
