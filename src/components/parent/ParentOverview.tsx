import React, { useState, useEffect } from 'react';
import { LivePortalClock } from '../common/LivePortalClock';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Send, 
  Award, 
  Megaphone, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  GraduationCap, 
  RefreshCw, 
  ChevronRight,
  MessageSquare,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

export interface ParentOverviewProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
  setActiveTab: (tab: any) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParentOverview: React.FC<ParentOverviewProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setSelectedStudent,
  setActiveTab
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';
  const studentId = activeStudent?.studentId || activeStudent?.id || '';
  const className = activeStudent?.className || '';

  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [approvedResults, setApprovedResults] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [messagesCount, setMessagesCount] = useState<number>(0);

  // 1. Real-time Listener for Assignments
  useEffect(() => {
    if (!schoolId) return;
    const qAss = query(collection(db, 'assignments'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(qAss, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!className || data.className === className || data.targetClass === className || !data.className) {
          list.push({ id: d.id, ...data });
        }
      });
      setAssignments(list);
    }, (err) => console.warn('Assignments overview error:', err));
    return () => unsub();
  }, [schoolId, className]);

  // 2. Real-time Listener for Announcements
  useEffect(() => {
    if (!schoolId) return;
    const qAnn = query(collection(db, 'announcements'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(qAnn, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const aud = data.audience || data.targetAudience;
        if (!aud || aud === 'All' || aud === 'Parents' || (className && aud === className)) {
          list.push({ id: d.id, ...data });
        }
      });
      setAnnouncements(list);
    }, (err) => console.warn('Announcements overview error:', err));
    return () => unsub();
  }, [schoolId, className]);

  // 3. Real-time Listener for Attendance
  useEffect(() => {
    if (!schoolId || !studentId) return;
    const qAtt = query(collection(db, 'studentAttendance'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(qAtt, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentId || data.studentUid === activeStudent?.uid) {
          list.push({ id: d.id, ...data });
        }
      });
      setAttendanceRecords(list);
    }, (err) => console.warn('Attendance overview error:', err));
    return () => unsub();
  }, [schoolId, studentId, activeStudent?.uid]);

  // 4. Real-time Listener for Approved Results
  useEffect(() => {
    if (!schoolId || !studentId) return;
    const qRes = query(collection(db, 'results'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(qRes, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if ((data.studentId === studentId || data.studentUid === activeStudent?.uid) && (data.isApproved === true || data.status === 'approved')) {
          list.push({ id: d.id, ...data });
        }
      });
      setApprovedResults(list);
    }, (err) => console.warn('Results overview error:', err));
    return () => unsub();
  }, [schoolId, studentId, activeStudent?.uid]);

  // 5. Real-time Listener for Payments
  useEffect(() => {
    if (!schoolId || !studentId) return;
    const qPay = query(collection(db, 'payments'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(qPay, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.studentId === studentId || data.studentUid === activeStudent?.uid) {
          list.push({ id: d.id, ...data });
        }
      });
      setPayments(list);
    }, (err) => console.warn('Payments overview error:', err));
    return () => unsub();
  }, [schoolId, studentId, activeStudent?.uid]);

  // 6. Real-time Listener for Messages
  useEffect(() => {
    if (!schoolId || !currentUser?.uid) return;
    const qMsg = query(collection(db, 'messages'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(qMsg, (snap) => {
      let count = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.senderUid === currentUser.uid || data.parentUid === currentUser.uid || data.recipientUid === currentUser.uid) {
          count++;
        }
      });
      setMessagesCount(count);
    }, (err) => console.warn('Messages overview error:', err));
    return () => unsub();
  }, [schoolId, currentUser?.uid]);

  // Metrics Calculations
  const presentCount = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Present (On Time)').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
  const totalAtt = attendanceRecords.length;
  const attRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

  const latestAtt = attendanceRecords.length > 0 ? attendanceRecords[0].status : 'No Record';

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || p.amountPaid || 0), 0);
  const totalBilled = 10500; // standard fee structure per student
  const outstandingBal = Math.max(0, totalBilled - totalPaid);

  // Chart Data: Attendance Trend
  const attendanceChartData = [
    { name: 'Present', count: presentCount || (totalAtt === 0 ? 1 : 0), fill: '#10B981' },
    { name: 'Late', count: lateCount, fill: '#F59E0B' },
    { name: 'Absent', count: absentCount, fill: '#EF4444' }
  ];

  // Chart Data: Subject Results
  const subjectChartData = approvedResults.length > 0 
    ? approvedResults.map(r => ({
        subject: (r.subject || 'Subject').substring(0, 10),
        score: Number(r.examScore || r.totalScore || r.total || 0)
      }))
    : [
        { subject: 'Math', score: 0 },
        { subject: 'Science', score: 0 },
        { subject: 'English', score: 0 }
      ];

  return (
    <div className="space-y-6">
      
      {/* Live Portal Clock */}
      <LivePortalClock 
        role="parent" 
        variant="card" 
        schoolId={schoolId} 
        studentName={activeStudent?.fullName || activeStudent?.name} 
        onNavigateTab={(t) => setActiveTab(t)} 
      />

      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest block">
            EDUkenZA Parent Portal
          </span>
          <h1 className="text-2xl font-black tracking-tight">
            Welcome, {currentUser.fullName || currentUser.name || 'Parent'}!
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Guardian Account • Monitoring {linkedStudents.length} linked student{linkedStudents.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      {/* MULTIPLE CHILDREN SELECTOR STRIP */}
      {linkedStudents.length > 0 ? (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black text-[#002147] uppercase tracking-wider">
              Linked Children ({linkedStudents.length})
            </h2>
            <button
              onClick={() => setActiveTab('my-children')}
              className="text-xs font-bold text-[#002147] hover:underline flex items-center gap-1 cursor-pointer"
            >
              Manage Children <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {linkedStudents.map((child, idx) => {
              const isSelected = selectedStudent?.id === child.id || selectedStudent?.studentId === child.studentId;
              return (
                <div
                  key={child.id || idx}
                  onClick={() => setSelectedStudent(child)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                    isSelected 
                      ? 'bg-[#002147] text-white border-[#D4AF37] shadow-md' 
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-[#002147] font-black flex items-center justify-center text-sm shrink-0 border border-amber-300">
                    {child.fullName?.charAt(0) || child.name?.charAt(0) || 'S'}
                  </div>

                  <div className="truncate text-xs">
                    <p className={`font-black truncate ${isSelected ? 'text-white' : 'text-[#002147]'}`}>
                      {child.fullName || child.name || 'Student'}
                    </p>
                    <p className={`text-[10px] font-mono ${isSelected ? 'text-amber-300' : 'text-slate-500'}`}>
                      ID: {child.studentId || child.id} • {child.className || 'No Class'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl text-amber-900 text-xs flex items-center justify-between">
          <div>
            <p className="font-extrabold text-sm">No Linked Students Found</p>
            <p className="text-amber-700 mt-0.5">Please ask your School Administrator to link your parent account to your child.</p>
          </div>
        </div>
      )}

      {/* 6 OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <div 
          onClick={() => setActiveTab('my-children')}
          className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-1"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#002147] flex items-center justify-center mb-2">
            <Users className="w-4 h-4 text-[#002147]" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Children</span>
          <p className="text-2xl font-black text-[#002147]">{linkedStudents.length}</p>
          <p className="text-[9px] text-slate-500 font-medium">Linked Accounts</p>
        </div>

        <div 
          onClick={() => setActiveTab('attendance')}
          className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-1"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance</span>
          <p className="text-sm font-black text-emerald-700 truncate">{latestAtt}</p>
          <p className="text-[9px] text-emerald-600 font-bold">{attRate}% Rate</p>
        </div>

        <div 
          onClick={() => setActiveTab('fees')}
          className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-1"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4 text-[#002147]" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Fees</span>
          <p className="text-lg font-black text-[#002147]">R {outstandingBal.toLocaleString()}</p>
          <p className="text-[9px] text-emerald-600 font-bold">{outstandingBal === 0 ? 'Account Settled' : 'Payment Due'}</p>
        </div>

        <div 
          onClick={() => setActiveTab('assignments')}
          className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-1"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2">
            <Send className="w-4 h-4 text-purple-700" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assignments</span>
          <p className="text-2xl font-black text-[#002147]">{assignments.length}</p>
          <p className="text-[9px] text-slate-500 font-medium">Class Tasks</p>
        </div>

        <div 
          onClick={() => setActiveTab('results')}
          className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-1"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-2">
            <Award className="w-4 h-4 text-indigo-700" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved Results</span>
          <p className="text-2xl font-black text-[#002147]">{approvedResults.length}</p>
          <p className="text-[9px] text-slate-500 font-medium">Released Scores</p>
        </div>

        <div 
          onClick={() => setActiveTab('announcements')}
          className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-[#002147] transition cursor-pointer space-y-1"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-2">
            <Megaphone className="w-4 h-4 text-rose-700" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Announcements</span>
          <p className="text-2xl font-black text-[#002147]">{announcements.length}</p>
          <p className="text-[9px] text-slate-500 font-medium">Notices</p>
        </div>

      </div>

      {/* ANALYTICS & CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Breakdown Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#D4AF37]" />
              Attendance Breakdown
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {attRate}% Overall Rate
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {attendanceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Academic Performance Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
              Approved Academic Results
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
              {approvedResults.length} Released
            </span>
          </div>

          <div className="h-48 w-full">
            {approvedResults.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No approved results published yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData}>
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#002147" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* RECENT ANNOUNCEMENTS & UPCOMING TASKS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECENT BROADCASTS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-[#002147] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#D4AF37]" />
              Recent School Notices
            </h3>
            <button 
              onClick={() => setActiveTab('announcements')}
              className="text-xs font-bold text-[#002147] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-xs text-slate-400">No school notices published yet.</p>
            ) : (
              announcements.slice(0, 3).map((ann, i) => (
                <div key={ann.id || i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                      {ann.priority || ann.category || 'Notice'}
                    </span>
                    <span className="text-slate-400 font-mono">{ann.publishedDate || ann.date || 'Recent'}</span>
                  </div>
                  <h4 className="text-xs font-black text-[#002147]">{ann.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{ann.message || ann.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* UPCOMING ASSIGNMENTS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-[#002147] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#D4AF37]" />
              Class Assignments
            </h3>
            <button 
              onClick={() => setActiveTab('assignments')}
              className="text-xs font-bold text-[#002147] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-xs text-slate-400">No assignments published for this class.</p>
            ) : (
              assignments.slice(0, 3).map((ass, i) => (
                <div key={ass.id || i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-[#002147] bg-blue-100 px-2 py-0.5 rounded-full">
                      {ass.subject || 'General'}
                    </span>
                    <span className="text-slate-500 font-mono font-bold">Due: {ass.dueDate || 'Pending'}</span>
                  </div>
                  <h4 className="text-xs font-black text-[#002147]">{ass.title}</h4>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{ass.instructions || ass.description}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
