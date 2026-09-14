import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Building2, 
  CreditCard, 
  ShieldAlert, 
  BrainCircuit, 
  Sparkles, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Presentation, 
  RefreshCw, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  HeartHandshake, 
  HelpCircle, 
  Award, 
  Clock, 
  Zap, 
  ShieldCheck, 
  MessageSquare,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sliders,
  DollarSign,
  AlertCircle
} from 'lucide-react';

import { 
  AnalyticsFilter, 
  AnalyticsFullDataset, 
  AnalyticsTimeFrame, 
  UserRoleType 
} from '../../types/analytics';
import { AiAnalyticsService } from '../../services/aiAnalyticsService';
import { AnalyticsExporter } from '../../utils/analyticsExport';
import { AiChatAnalyst } from './AiChatAnalyst';

interface EnterpriseAiAnalyticsCenterProps {
  userRole: UserRoleType;
  currentUser?: any;
  schoolId?: string;
  schoolName?: string;
  students?: any[];
  teachers?: any[];
  parents?: any[];
  classes?: any[];
  subjects?: any[];
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const COLORS = ['#002147', '#D4AF37', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6'];

export const EnterpriseAiAnalyticsCenter: React.FC<EnterpriseAiAnalyticsCenterProps> = ({
  userRole,
  currentUser,
  schoolId = '',
  schoolName = '',
  students = [],
  teachers = [],
  parents = [],
  classes = [],
  subjects = [],
  showToast
}) => {
  // Navigation Modules Tab State
  const [activeModule, setActiveModule] = useState<
    | 'executive'
    | 'academic'
    | 'student_perf'
    | 'teacher_perf'
    | 'attendance'
    | 'financial'
    | 'enrollment'
    | 'predictions'
    | 'risk_alerts'
    | 'behavioral'
    | 'learning_progress'
    | 'school_health'
    | 'chat_analyst'
  >(userRole === 'student' ? 'student_perf' : userRole === 'parent' ? 'student_perf' : 'executive');

  // Filters State
  const [filter, setFilter] = useState<AnalyticsFilter>({
    timeFrame: 'term',
    academicYear: '2025/2026',
    term: 'Term 1'
  });

  const [dataset, setDataset] = useState<AnalyticsFullDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState<boolean>(true);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [showPptModal, setShowPptModal] = useState<boolean>(false);

  // Load analytics dataset & subscribe to real-time changes
  useEffect(() => {
    let unsubscribe: () => void;

    const loadData = async () => {
      setLoading(true);
      const data = await AiAnalyticsService.fetchEnterpriseAnalytics(
        schoolId,
        filter,
        userRole,
        currentUser?.uid || currentUser?.id
      );
      setDataset(data);
      setLoading(false);

      // Subscribe to real-time updates
      unsubscribe = AiAnalyticsService.subscribeRealTimeAnalytics(
        schoolId,
        filter,
        userRole,
        (updatedDataset) => {
          setDataset(updatedDataset);
          setIsRealtimeSyncing(true);
          setTimeout(() => setIsRealtimeSyncing(false), 2000);
        }
      );
    };

    loadData();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [schoolId, filter, userRole, currentUser]);

  const handleExport = (type: 'pdf' | 'excel' | 'csv' | 'ppt' | 'print') => {
    if (!dataset) return;
    if (type === 'pdf') {
      AnalyticsExporter.exportToPDF(dataset, schoolName);
      showToast?.('Exporting PDF Report...', 'info');
    } else if (type === 'excel') {
      AnalyticsExporter.exportToExcel(dataset, schoolName);
      showToast?.('Exporting Excel Spreadsheet...', 'info');
    } else if (type === 'csv') {
      AnalyticsExporter.exportToCSV(dataset, schoolName);
      showToast?.('Exporting CSV File...', 'info');
    } else if (type === 'ppt') {
      setShowPptModal(true);
    } else if (type === 'print') {
      AnalyticsExporter.launchPrintableReport(dataset, schoolName);
    }
  };

  if (loading || !dataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[450px]">
        <RefreshCw className="w-10 h-10 text-[#002147] animate-spin mb-4" />
        <h3 className="font-bold text-base text-slate-800">Initializing Enterprise AI Analytics Engine...</h3>
        <p className="text-xs text-slate-500 mt-1">Fetching live Firestore records, calculating predictive ML models, and indexing school health metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-[#002147] text-white rounded-3xl p-6 shadow-md relative overflow-hidden border border-[#D4AF37]/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider bg-[#D4AF37]/20 px-2.5 py-1 rounded-full border border-[#D4AF37]/40 flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-[#D4AF37]" />
                Predictive Intelligence Center
              </span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Real-Time Firestore Sync
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Enterprise AI Analytics Center
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Commercial-grade predictive dashboards, academic benchmarks, financial forecasts & early warning risk intelligence.
            </p>
          </div>

          {/* Export Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowChatModal(true)}
              className="bg-[#D4AF37] hover:bg-[#c39f2e] text-[#002147] font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <BrainCircuit className="w-4 h-4 text-[#002147]" />
              AI Analyst Chat
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <button
              onClick={() => handleExport('pdf')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Export PDF Report"
            >
              <FileText className="w-3.5 h-3.5 text-red-400" />
              PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Export Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Excel
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Export CSV Data"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              CSV
            </button>
            <button
              onClick={() => handleExport('ppt')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Export Presentation Deck"
            >
              <Presentation className="w-3.5 h-3.5 text-amber-400" />
              Deck
            </button>
            <button
              onClick={() => handleExport('print')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
              title="Printable Report"
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              Print
            </button>
          </div>
        </div>

        {/* AI INSIGHTS TICKER BANNER */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {dataset.aiInsights.map(ins => (
            <div 
              key={ins.id}
              className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                ins.severity === 'critical' ? 'bg-red-950/40 border-red-500/50 text-red-200' :
                ins.severity === 'warning' ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' :
                ins.severity === 'positive' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' :
                'bg-slate-900/60 border-slate-700 text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-white">{ins.title}</span>
                <p className="text-[11px] opacity-90 mt-0.5">{ins.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER BAR & TIME HORIZON SELECTOR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Analytics Horizon:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly', 'term', 'yearly'] as AnalyticsTimeFrame[]).map(tf => (
              <button
                key={tf}
                onClick={() => setFilter(prev => ({ ...prev, timeFrame: tf }))}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition capitalize cursor-pointer ${
                  filter.timeFrame === tf
                    ? 'bg-[#002147] text-[#D4AF37] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">Academic Year:</span>
          <select
            value={filter.academicYear}
            onChange={e => setFilter(prev => ({ ...prev, academicYear: e.target.value }))}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none"
          >
            <option value="2025/2026">2025/2026</option>
            <option value="2024/2025">2024/2025</option>
          </select>

          <span className="text-slate-500">Term:</span>
          <select
            value={filter.term}
            onChange={e => setFilter(prev => ({ ...prev, term: e.target.value }))}
            className="bg-slate-100 text-slate-800 font-semibold px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none"
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
            <option value="Term 4">Term 4</option>
          </select>
        </div>
      </div>

      {/* MODULE NAVIGATION TABS (ALL 12 MODULES) */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 no-scrollbar">
        {[
          { id: 'executive', label: 'Executive Dashboard', icon: BarChart3, roles: ['platform_owner', 'school_admin'] },
          { id: 'school_health', label: 'School Health Score', icon: Activity, roles: ['platform_owner', 'school_admin'] },
          { id: 'academic', label: 'Academic Analytics', icon: GraduationCap, roles: ['platform_owner', 'school_admin', 'teacher'] },
          { id: 'student_perf', label: 'Student Performance', icon: Users, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
          { id: 'teacher_perf', label: 'Teacher Performance', icon: BookOpen, roles: ['platform_owner', 'school_admin', 'teacher'] },
          { id: 'attendance', label: 'Attendance Analytics', icon: Clock, roles: ['platform_owner', 'school_admin', 'teacher', 'parent'] },
          { id: 'financial', label: 'Financial AI', icon: DollarSign, roles: ['platform_owner', 'school_admin'] },
          { id: 'enrollment', label: 'Enrollment Analytics', icon: Building2, roles: ['platform_owner', 'school_admin'] },
          { id: 'predictions', label: 'AI Predictions', icon: Zap, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
          { id: 'risk_alerts', label: 'Risk Alerts & Early Warnings', icon: ShieldAlert, roles: ['platform_owner', 'school_admin', 'teacher', 'parent'], badge: dataset.riskAlerts.length },
          { id: 'behavioral', label: 'Behavioral Insights', icon: HeartHandshake, roles: ['platform_owner', 'school_admin', 'teacher', 'parent'] },
          { id: 'learning_progress', label: 'Learning Progress', icon: TrendingUp, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] },
          { id: 'chat_analyst', label: 'AI Chat Analyst', icon: BrainCircuit, roles: ['platform_owner', 'school_admin', 'teacher', 'student', 'parent'] }
        ]
        .filter(mod => mod.roles.includes(userRole))
        .map(mod => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4AF37]' : 'text-slate-500'}`} />
              {mod.label}
              {mod.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-[#D4AF37] text-[#002147]' : 'bg-red-500 text-white'
                }`}>
                  {mod.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* MODULE 1: EXECUTIVE DASHBOARD */}
      {activeModule === 'executive' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">School Health Index</span>
              <div className="text-2xl font-black text-[#002147] mt-1 flex items-center justify-between">
                <span>{dataset.schoolHealth.overallScore}/100</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                  {dataset.schoolHealth.rating}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Composite across academics, attendance & finance.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Academic Pass Rate</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 flex items-center justify-between">
                <span>{dataset.academic.passRate}%</span>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +3.2%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Overall Average: {dataset.academic.overallAverage}%</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Attendance Rate</span>
              <div className="text-2xl font-black text-blue-600 mt-1 flex items-center justify-between">
                <span>{dataset.attendance.overallAttendanceRate}%</span>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600">
                  {dataset.attendance.presentTodayCount} Present
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">{dataset.attendance.absentTodayCount} unexcused absences today</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Fee Collection Rate</span>
              <div className="text-2xl font-black text-[#D4AF37] mt-1 flex items-center justify-between">
                <span>{dataset.financial.feeCollectionEfficiency}%</span>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700">
                  R{(dataset.financial.totalCollected / 1000).toFixed(0)}k
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Outstanding: R{dataset.financial.totalOutstanding.toLocaleString()}</p>
            </div>
          </div>

          {/* Owner-Specific Platform Infrastructure Cards if role is platform_owner */}
          {userRole === 'platform_owner' && (
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md">
              <h3 className="text-sm font-bold text-[#D4AF37] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                SaaS Platform Owner Infrastructure & System Diagnostics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 font-bold block">Total SaaS Schools</span>
                  <span className="text-xl font-black text-white">{dataset.executive.totalSchools} ({dataset.executive.activeSchoolsCount} Active)</span>
                </div>
                <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 font-bold block">Monthly Platform Users</span>
                  <span className="text-xl font-black text-white">{dataset.executive.monthlyActiveUsers.toLocaleString()} MAU</span>
                </div>
                <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 font-bold block">System Health & Latency</span>
                  <span className="text-xl font-black text-emerald-400">{dataset.executive.systemHealthStatus} ({dataset.executive.platformResponseLatencyMs}ms)</span>
                </div>
                <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                  <span className="text-[11px] text-slate-400 font-bold block">Storage & Firestore Reads</span>
                  <span className="text-xl font-black text-amber-300">{dataset.executive.storageUsageGb} GB / {dataset.executive.firestoreReadsDaily.toLocaleString()} Reads</span>
                </div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#002147]" />
                Academic Subject Performance Comparison (%)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataset.academic.subjectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="subject" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Bar dataKey="average" fill="#002147" radius={[6, 6, 0, 0]} name="Average Score %" />
                    <Bar dataKey="passRate" fill="#D4AF37" radius={[6, 6, 0, 0]} name="Pass Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#002147]" />
                Historical Academic Pass Rate & Target Trend
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dataset.academic.historicalTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[50, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                    <Area type="monotone" dataKey="average" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2.5} name="Average %" />
                    <Line type="monotone" dataKey="target" stroke="#002147" strokeDasharray="4 4" name="Target %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: SCHOOL HEALTH SCORE */}
      {activeModule === 'school_health' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-base text-[#002147]">School Health Composite Matrix</h3>
                <p className="text-xs text-slate-500">Calculated across 5 core institutional pillars using weighted algorithms.</p>
              </div>
              <div className="px-4 py-2 bg-[#002147] text-[#D4AF37] rounded-2xl font-black text-xl border border-[#D4AF37]/30">
                Score: {dataset.schoolHealth.overallScore}/100 ({dataset.schoolHealth.rating})
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Academic (30%)</span>
                <div className="text-2xl font-black text-indigo-600 mt-2">{dataset.schoolHealth.academicHealth}%</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Attendance (25%)</span>
                <div className="text-2xl font-black text-blue-600 mt-2">{dataset.schoolHealth.attendanceHealth}%</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Financial (25%)</span>
                <div className="text-2xl font-black text-amber-600 mt-2">{dataset.schoolHealth.financialHealth}%</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Teacher (10%)</span>
                <div className="text-2xl font-black text-emerald-600 mt-2">{dataset.schoolHealth.teacherEngagementHealth}%</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Retention (10%)</span>
                <div className="text-2xl font-black text-purple-600 mt-2">{dataset.schoolHealth.studentRetentionHealth}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 3: ACADEMIC ANALYTICS */}
      {activeModule === 'academic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4">Grade Distribution Across School (A-F)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dataset.academic.gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} label>
                      {dataset.academic.gradeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4">Class Level Performance Breakdown</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataset.academic.classPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="className" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#002147" radius={[6, 6, 0, 0]} name="Average Score %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: STUDENT PERFORMANCE & PERSONAL LEARNING DASHBOARD */}
      {activeModule === 'student_perf' && (
        <div className="space-y-6">
          {dataset.studentPerf ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-black text-[#002147]">
                    Personal Learning Dashboard - {dataset.studentPerf.studentName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Class: {dataset.studentPerf.className} | Overall GPA: <strong className="text-emerald-600">{dataset.studentPerf.overallGpa}</strong> ({dataset.studentPerf.overallPercentage}%)
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl">
                    Weekly Improvement: +{dataset.studentPerf.weeklyImprovementPercent}%
                  </span>
                  <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1.5 rounded-xl">
                    Expected Exam: {dataset.studentPerf.expectedExamPerformance}%
                  </span>
                </div>
              </div>

              {/* Subject Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dataset.studentPerf.subjectBreakdown.map((sb, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-xs text-slate-800">{sb.subject}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        sb.strengthLevel === 'Mastered' ? 'bg-emerald-100 text-emerald-800' :
                        sb.strengthLevel === 'Strong' ? 'bg-blue-100 text-blue-800' :
                        sb.strengthLevel === 'Moderate' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sb.strengthLevel}
                      </span>
                    </div>
                    <div className="text-xl font-black text-[#002147]">{sb.currentScore}%</div>
                  </div>
                ))}
              </div>

              {/* Study Planner Recommendations */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-bold text-[#D4AF37] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Study Planner & Daily Target Recommendation
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                  {dataset.studentPerf.studyPlanner.map((sp, idx) => (
                    <div key={idx} className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                      <span className="font-bold text-[#D4AF37] block">{sp.day}</span>
                      <span className="text-white font-semibold block mt-1">{sp.recommendedSubject} ({sp.durationMinutes}m)</span>
                      <p className="text-[10px] text-slate-300 mt-1">{sp.focusTopic}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600">Select a specific student to inspect personal learning dashboard and AI study recommendations.</p>
            </div>
          )}
        </div>
      )}

      {/* MODULE 5: TEACHER PERFORMANCE & AI RECOMMENDATIONS */}
      {activeModule === 'teacher_perf' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dataset.teacherPerf.map(tp => (
              <div key={tp.teacherId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#002147]">{tp.teacherName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {tp.department}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Engagement</span>
                    <strong className="text-emerald-600 font-black">{tp.studentEngagementScore}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Workload Index</span>
                    <strong className="text-amber-600 font-black">{tp.workloadIndex}/100</strong>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <strong>AI Recommendation:</strong> {tp.teachingRecommendations[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODULE 6: ATTENDANCE ANALYTICS */}
      {activeModule === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4">Daily Attendance & Tardiness Trend (%)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataset.attendance.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="presentRate" fill="#10B981" radius={[4, 4, 0, 0]} name="Present %" />
                    <Bar dataKey="lateRate" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Late %" />
                    <Bar dataKey="absentRate" fill="#EF4444" radius={[4, 4, 0, 0]} name="Absent %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                <span>Chronic Absenteeism Risk List</span>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {dataset.attendance.chronicAbsenteeismRisk.length} High Risk
                </span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {dataset.attendance.chronicAbsenteeismRisk.map(ca => (
                  <div key={ca.studentId} className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-red-950 block">{ca.studentName}</span>
                      <span className="text-[10px] text-red-700">{ca.className} • {ca.consecutiveAbsences} consecutive absences</span>
                    </div>
                    <span className="font-black text-red-600">{ca.attendanceRate}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 7: FINANCIAL AI */}
      {activeModule === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Revenue Collected</span>
              <div className="text-2xl font-black text-[#002147] mt-1">
                R{dataset.financial.totalCollected.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Expected: R{dataset.financial.totalExpectedRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Outstanding Balance</span>
              <div className="text-2xl font-black text-red-600 mt-1">
                R{dataset.financial.totalOutstanding.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Efficiency: {dataset.financial.feeCollectionEfficiency}%</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Estimated Cash Flow</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                R{dataset.financial.cashFlowEstimate.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">3-Month Forecast Projection</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 mb-4">Monthly Revenue Collection vs Target (ZAR)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataset.financial.monthlyRevenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="collected" fill="#002147" radius={[6, 6, 0, 0]} name="Collected R" />
                  <Bar dataKey="expected" fill="#D4AF37" radius={[6, 6, 0, 0]} name="Expected R" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 8: ENROLLMENT ANALYTICS */}
      {activeModule === 'enrollment' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4">Historical Enrollment Growth</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataset.enrollment.enrollmentHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#002147" strokeWidth={3} dot={{ fill: '#D4AF37', r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-4">Grade-Wise Student Enrollment Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataset.enrollment.gradeWiseEnrollment}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="grade" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 9: AI PREDICTIONS CENTER */}
      {activeModule === 'predictions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Predicted Pass Rate</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{dataset.predictions.predictedExamPassRate}%</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Promotion Probability</span>
              <div className="text-2xl font-black text-[#002147] mt-1">{dataset.predictions.promotionProbability}%</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Graduation Rate</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{dataset.predictions.graduationProbability}%</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Subject Mastery Index</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{dataset.predictions.subjectMasteryIndex}/100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-[#002147] mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Students Predicted at Risk of Term Failure
              </h3>
              <div className="space-y-2">
                {dataset.predictions.studentsLikelyToFail.map(st => (
                  <div key={st.studentId} className="p-3 bg-red-50 rounded-xl border border-red-200 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-red-950 block">{st.studentName}</strong>
                      <span className="text-[10px] text-red-700">{st.className}</span>
                    </div>
                    <span className="font-black text-red-600">Predicted Score: {st.predictedScore}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-[#002147] mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                Scholarship Potential & Gifted Students
              </h3>
              <div className="space-y-2">
                {dataset.predictions.scholarshipPotentialStudents.map(sc => (
                  <div key={sc.studentId} className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-emerald-950 block">{sc.studentName}</strong>
                      <span className="text-[10px] text-emerald-700">GPA: {sc.gpa}</span>
                    </div>
                    <span className="font-black text-emerald-600">{sc.score}% Score</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 10: RISK ALERTS & EARLY WARNING SYSTEM */}
      {activeModule === 'risk_alerts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-[#002147]">AI Early Warning System Feed</h3>
                <p className="text-xs text-slate-500">Autonomous risk detection across academics, attendance, fees & teacher burnout.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                {dataset.riskAlerts.length} Active Warnings
              </span>
            </div>

            <div className="space-y-3">
              {dataset.riskAlerts.map(alert => (
                <div key={alert.id} className="p-4 bg-red-50/60 rounded-2xl border border-red-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-red-950 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      {alert.entityName} - {alert.type.toUpperCase().replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{alert.details}</p>
                  <div className="p-2.5 bg-white rounded-xl border border-red-200 text-xs text-slate-800 flex justify-between items-center">
                    <span><strong>Recommended Action:</strong> {alert.recommendedIntervention}</span>
                    <button 
                      onClick={() => showToast?.(`1-Click Warning sent to parent/teacher for ${alert.entityName}`, 'success')}
                      className="bg-[#002147] text-[#D4AF37] hover:bg-[#001833] font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Trigger Intervention
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 11: BEHAVIORAL INSIGHTS */}
      {activeModule === 'behavioral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Positive Merits Awarded</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{dataset.behavioral.totalMeritsAwarded}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Disciplinary Incidents</span>
              <div className="text-2xl font-black text-red-600 mt-1">{dataset.behavioral.totalIncidentsLogged}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Behavior Index Score</span>
              <div className="text-2xl font-black text-[#002147] mt-1">{dataset.behavioral.positiveBehaviorPercentage}%</div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 12: LEARNING PROGRESS */}
      {activeModule === 'learning_progress' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#002147]">Curriculum Topic Mastery Breakdown</h3>
            <div className="space-y-3">
              {dataset.learningProgress.topicMasteryBreakdown.map((tm, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-800">{tm.subject}: {tm.topic}</span>
                    <span className="font-black text-[#002147]">{tm.masteryPercentage}% Mastery</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#002147] h-full rounded-full transition-all duration-500"
                      style={{ width: `${tm.masteryPercentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 13: EMBEDDED AI CHAT ANALYST */}
      {activeModule === 'chat_analyst' && (
        <AiChatAnalyst dataset={dataset} userRole={userRole} showToast={showToast} />
      )}

      {/* FLOATING CHAT ANALYST MODAL */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <AiChatAnalyst 
            dataset={dataset} 
            userRole={userRole} 
            showToast={showToast} 
            isExpandedModal 
            onClose={() => setShowChatModal(false)} 
          />
        </div>
      )}

      {/* PRESENTATION DECK MODAL */}
      {showPptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-700 max-w-4xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#D4AF37]">Executive PowerPoint Deck</span>
                <h2 className="text-xl font-black text-white">{schoolName} - AI Strategic Report</h2>
              </div>
              <button 
                onClick={() => setShowPptModal(false)}
                className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-300"
              >
                Close Slide Deck
              </button>
            </div>

            {/* Slide 1 */}
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
              <span className="text-xs font-bold text-[#D4AF37]">Slide 1: Executive Key Metrics & School Health</span>
              <h3 className="text-lg font-bold">Overall School Health Score: {dataset.schoolHealth.overallScore}/100 ({dataset.schoolHealth.rating})</h3>
              <ul className="text-xs space-y-1.5 text-slate-300">
                <li>• Academic Pass Rate: <strong>{dataset.academic.passRate}%</strong> (Average Score: {dataset.academic.overallAverage}%)</li>
                <li>• Student Attendance Rate: <strong>{dataset.attendance.overallAttendanceRate}%</strong></li>
                <li>• Fee Collection Efficiency: <strong>{dataset.financial.feeCollectionEfficiency}%</strong></li>
              </ul>
            </div>

            {/* Slide 2 */}
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
              <span className="text-xs font-bold text-[#D4AF37]">Slide 2: Predictive Intelligence & Exam Pass Rate</span>
              <h3 className="text-lg font-bold">Predicted Final Pass Rate: {dataset.predictions.predictedExamPassRate}%</h3>
              <ul className="text-xs space-y-1.5 text-slate-300">
                <li>• Promotion Probability: <strong>{dataset.predictions.promotionProbability}%</strong></li>
                <li>• Graduation Probability: <strong>{dataset.predictions.graduationProbability}%</strong></li>
                <li>• Students needing intervention: <strong>{dataset.predictions.studentsNeedingIntervention.length}</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
