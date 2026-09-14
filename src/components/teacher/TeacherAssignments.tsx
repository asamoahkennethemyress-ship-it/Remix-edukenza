import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Edit, 
  Trash2, 
  X, 
  Paperclip, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  FileText,
  Copy,
  Archive,
  MessageSquare,
  BarChart2,
  TrendingUp,
  Award,
  Users,
  Printer,
  Download,
  Filter,
  Eye,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { db } from '../../firebase/config';
import { triggerAssignmentPublishedNotification } from '../../services/notificationService';
import { AssignmentCreatorWizard, AssignmentFormData } from '../assignment/AssignmentCreatorWizard';
import { AssignmentQnAModal } from '../assignment/AssignmentQnAModal';
import { MathFormulaRenderer } from '../assignment/MathFormulaRenderer';

export interface TeacherAssignmentsProps {
  schoolId: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setActiveTab?: (tab: string) => void;
}

export const TeacherAssignments: React.FC<TeacherAssignmentsProps> = ({
  schoolId,
  assignedClasses,
  assignedSubjects,
  currentUser,
  showToast,
  setActiveTab
}) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  
  // Q&A Discussion Modal
  const [qnaModal, setQnaModal] = useState<{ open: boolean; assignment: any | null }>({
    open: false,
    assignment: null
  });

  // Preview Drawer Modal
  const [previewModal, setPreviewModal] = useState<{ open: boolean; assignment: any | null }>({
    open: false,
    assignment: null
  });

  // 1. Real-time Listener for Assignments & Submissions
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const teacherUid = currentUser?.uid;

    // Fetch Enrolled Students for class selection
    const fetchStudents = async () => {
      try {
        const qSt = query(collection(db, 'students'), where('schoolId', '==', schoolId));
        const snapSt = await getDocs(qSt);
        const listSt: any[] = [];
        snapSt.forEach(d => listSt.push({ id: d.id, ...d.data() }));
        setEnrolledStudents(listSt);
      } catch (err) {
        console.warn("Error fetching students:", err);
      }
    };
    fetchStudents();

    // Real-time Assignments Listener
    const qAss = query(
      collection(db, 'assignments'),
      where('schoolId', '==', schoolId)
    );

    const unsubAss = onSnapshot(qAss, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (!teacherUid || data.teacherId === teacherUid || currentUser?.role === 'school_admin' || currentUser?.role === 'platform_owner') {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setAssignments(list);
      setLoading(false);
    }, (err) => {
      console.warn("Real-time assignments error:", err);
      setLoading(false);
    });

    // Real-time Submissions Listener
    const qSub = query(
      collection(db, 'assignmentSubmissions'),
      where('schoolId', '==', schoolId)
    );

    const unsubSub = onSnapshot(qSub, (snap) => {
      const listSub: any[] = [];
      snap.forEach(d => listSub.push({ id: d.id, ...d.data() }));
      setSubmissions(listSub);
    }, (err) => {
      console.warn("Real-time submissions error:", err);
    });

    return () => {
      unsubAss();
      unsubSub();
    };
  }, [schoolId, currentUser]);

  // Create / Edit Assignment Handler
  const handleSaveWizardAssignment = async (data: AssignmentFormData, publishNow: boolean) => {
    if (!schoolId) return;

    try {
      const isPublished = publishNow || data.publishMode === 'Immediately' || String(data.status || '').toLowerCase() === 'published';
      const finalStatus = isPublished ? 'published' : (data.status || 'Draft');

      const classIdVal = data.classId || data.className || '';
      const classNameVal = data.className || data.classId || '';
      const subjectIdVal = data.subjectId || data.subjectName || '';
      const subjectNameVal = data.subjectName || data.subjectId || '';

      const payload: any = {
        schoolId,
        teacherId: currentUser?.uid || currentUser?.id || '',
        teacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        title: data.title || 'Untitled Assignment',
        subjectId: subjectIdVal,
        subjectName: subjectNameVal,
        classId: classIdVal,
        className: classNameVal,
        targetClass: classNameVal,
        academicYear: data.academicYear || '2026',
        academicTerm: data.academicTerm || 'Term 1',
        term: data.academicTerm || 'Term 1',
        type: data.type || 'Homework',
        topic: data.topic || '',
        learningObjectives: data.learningObjectives || '',
        instructions: data.instructions || data.description || '',
        description: data.instructions || data.description || '',
        estimatedTime: data.estimatedTime || '45 mins',
        totalMarks: Number(data.totalMarks) || 100,
        passingMarks: Number(data.passingMarks) || 50,
        gradingMethod: data.gradingMethod || 'Points',
        rubricCriteria: data.rubricCriteria || [],
        availableFromDate: data.availableFromDate || new Date().toISOString().split('T')[0],
        availableFromTime: data.availableFromTime || '08:00',
        dueDate: data.dueDate || '',
        dueTime: data.dueTime || '23:59',
        publishMode: data.publishMode || (isPublished ? 'Immediately' : 'Draft'),
        scheduledPublishDate: data.scheduledPublishDate || '',
        lateSubmissionRule: data.lateSubmissionRule || 'Allowed',
        lateCutoffDate: data.lateCutoffDate || '',
        latePenaltyPercent: Number(data.latePenaltyPercent) || 0,
        attachments: data.attachments || [],
        recipientsMode: data.recipientsMode || 'Class',
        recipientStudentIds: data.recipientStudentIds || [],
        status: finalStatus,
        publishedAt: isPublished ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      };

      let assignmentId = editingAssignment?.id;

      if (editingAssignment?.id) {
        payload.assignmentId = editingAssignment.id;
        await updateDoc(doc(db, 'assignments', editingAssignment.id), payload);
        showToast(isPublished ? "Assignment published successfully!" : "Assignment updated successfully!", "success");
      } else {
        const docRef = await addDoc(collection(db, 'assignments'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        assignmentId = docRef.id;
        await updateDoc(docRef, { assignmentId: docRef.id });
        showToast(isPublished ? "Assignment published to class!" : "Assignment saved as draft!", "success");
      }

      // If published, send real-time notifications to students and linked parents
      if (isPublished) {
        dispatchNotifications(data, assignmentId || '');
      }

    } catch (err) {
      console.error("Error saving assignment:", err);
      showToast("Failed to save assignment", "error");
      throw err;
    }
  };

  // Dispatch real-time notifications to Students & Parents
  const dispatchNotifications = async (data: AssignmentFormData, assignmentId: string) => {
    try {
      await triggerAssignmentPublishedNotification({
        assignmentId,
        title: data.title,
        subjectName: data.subjectName || 'Subject',
        className: data.className || '',
        dueDate: data.dueDate || '',
        schoolId,
        createdByTeacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        recipientsMode: data.recipientsMode,
        recipientStudentIds: data.recipientStudentIds
      });
    } catch (err) {
      console.warn("Notification dispatch error:", err);
    }
  };

  // Duplicate Assignment
  const handleDuplicate = async (ass: any) => {
    try {
      const copyData = {
        ...ass,
        title: `${ass.title} (Copy)`,
        status: 'Draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      delete copyData.id;
      await addDoc(collection(db, 'assignments'), copyData);
      showToast("Assignment duplicated as draft", "info");
    } catch (err) {
      console.error("Duplicate error:", err);
    }
  };

  // Delete Assignment
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this assignment and its data?")) return;
    try {
      await deleteDoc(doc(db, 'assignments', id));
      showToast("Assignment deleted", "success");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete assignment", "error");
    }
  };

  // Filtered Assignments List
  const filteredAssignments = assignments.filter(a => {
    const matchSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        a.subjectName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === 'All' || a.className === selectedClass;
    const matchSubject = selectedSubject === 'All' || a.subjectName === selectedSubject;
    const matchType = selectedType === 'All' || a.type === selectedType;
    const matchStatus = selectedStatus === 'All' || a.status === selectedStatus;
    return matchSearch && matchClass && matchSubject && matchType && matchStatus;
  });

  // Calculate Dashboard Summary Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  
  const totalCount = assignments.length;
  const draftCount = assignments.filter(a => a.status === 'Draft').length;
  const publishedCount = assignments.filter(a => a.status === 'Published').length;
  const scheduledCount = assignments.filter(a => a.status === 'Scheduled').length;
  const dueTodayCount = assignments.filter(a => a.dueDate === todayStr).length;
  const overdueCount = assignments.filter(a => a.dueDate < todayStr && a.status === 'Published').length;

  const totalSubmissions = submissions.length;
  const pendingGradingCount = submissions.filter(s => s.status === 'Submitted' || s.status === 'Pending Grading').length;
  const gradedCount = submissions.filter(s => s.status === 'Graded').length;

  // Chart Data: Subject Performance
  const subjectChartData = assignedSubjects.map(sb => {
    const sName = sb.name || sb.subjectName || sb;
    const assForSub = assignments.filter(a => a.subjectName === sName);
    const subIds = assForSub.map(a => a.id);
    const subSubs = submissions.filter(s => subIds.includes(s.assignmentId));
    return {
      name: sName,
      assignments: assForSub.length,
      submissions: subSubs.length
    };
  });

  // Export PDF Report
  const exportPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text('EDUkenZA Academic Assignments Report', 14, 15);
    const tableData = filteredAssignments.map((a, i) => [
      i + 1,
      a.title,
      a.subjectName,
      a.className,
      a.dueDate,
      a.totalMarks,
      a.status
    ]);
    autoTable(docPdf, {
      startY: 25,
      head: [['#', 'Title', 'Subject', 'Class', 'Due Date', 'Max Marks', 'Status']],
      body: tableData,
    });
    docPdf.save(`Assignments_Report_${Date.now()}.pdf`);
    showToast("PDF report exported", "success");
  };

  // Export Excel Report
  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredAssignments.map(a => ({
      Title: a.title,
      Subject: a.subjectName,
      Class: a.className,
      Type: a.type,
      DueDate: a.dueDate,
      TotalMarks: a.totalMarks,
      Status: a.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assignments');
    XLSX.writeFile(workbook, `Assignments_${Date.now()}.xlsx`);
    showToast("Excel spreadsheet exported", "success");
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">EDUkenZA Assignment Management System</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Google Classroom & Canvas-grade homework command center with STEM LaTeX equations, rubrics, real-time submission tracking, and parent alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportPDF}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>PDF</span>
          </button>
          <button
            onClick={exportExcel}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => {
              setEditingAssignment(null);
              setIsWizardOpen(true);
            }}
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#b89428] text-[#002147] font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer border border-white/40"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment Wizard</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD SUMMARY CARDS (10 METRICS) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
          <p className="text-xl font-black text-[#002147]">{totalCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Drafts</span>
          <p className="text-xl font-black text-amber-600">{draftCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Published</span>
          <p className="text-xl font-black text-emerald-600">{publishedCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Scheduled</span>
          <p className="text-xl font-black text-blue-600">{scheduledCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Due Today</span>
          <p className="text-xl font-black text-purple-600">{dueTodayCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Overdue</span>
          <p className="text-xl font-black text-red-600">{overdueCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Submitted</span>
          <p className="text-xl font-black text-teal-600">{totalSubmissions}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">To Grade</span>
          <p className="text-xl font-black text-rose-600">{pendingGradingCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Graded</span>
          <p className="text-xl font-black text-emerald-700">{gradedCount}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Classes</span>
          <p className="text-xl font-black text-[#002147]">{assignedClasses.length}</p>
        </div>
      </div>

      {/* ANALYTICS CHARTS BAR */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-[#002147] tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#D4AF37]" />
            Subject Activity & Submission Rates
          </h3>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('assignment-submissions')}
              className="text-xs font-bold text-[#002147] hover:underline flex items-center gap-1"
            >
              <span>Go to Submissions & Grading</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          )}
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip />
              <Bar dataKey="assignments" fill="#002147" radius={[6, 6, 0, 0]} name="Assignments" />
              <Bar dataKey="submissions" fill="#D4AF37" radius={[6, 6, 0, 0]} name="Submissions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assignments by title, subject or topic..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700"
          >
            <option value="All">All Classes</option>
            {assignedClasses.map((cl, i) => (
              <option key={i} value={cl.name || cl.className || cl}>{cl.name || cl.className || cl}</option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700"
          >
            <option value="All">All Subjects</option>
            {assignedSubjects.map((sb, i) => (
              <option key={i} value={sb.name || sb.subjectName || sb}>{sb.name || sb.subjectName || sb}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* ASSIGNMENTS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs font-bold">Synchronizing real-time assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200">
            No assignments match your search filter criteria.
          </div>
        ) : (
          filteredAssignments.map((ass) => {
            const subCount = submissions.filter(s => s.assignmentId === ass.id).length;
            const isDueToday = ass.dueDate === todayStr;

            return (
              <div
                key={ass.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-[#002147]">
                        {ass.subjectName}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        Class: {ass.className}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        {ass.type || 'Homework'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        ass.status === 'Published' ? 'bg-emerald-100 text-emerald-800' :
                        ass.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ass.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-[#002147] mt-1.5">{ass.title}</h3>
                    {ass.topic && (
                      <p className="text-xs font-medium text-slate-500">Topic: {ass.topic}</p>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-1.5 self-end md:self-center">
                    <button
                      onClick={() => setPreviewModal({ open: true, assignment: ass })}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                      title="Preview Student View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setQnaModal({ open: true, assignment: ass })}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-[#002147] rounded-xl transition flex items-center gap-1 font-bold text-xs"
                      title="Q&A Discussion Thread"
                    >
                      <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(ass)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                      title="Duplicate Assignment"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingAssignment(ass);
                        setIsWizardOpen(true);
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-[#002147] rounded-xl transition"
                      title="Edit Assignment"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ass.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* META INFO ROW */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Due Date</span>
                    <span className={`font-bold ${isDueToday ? 'text-purple-700 font-mono' : 'text-slate-800'}`}>
                      {ass.dueDate} {ass.dueTime || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Max Marks</span>
                    <span className="font-bold text-emerald-700 font-mono">{ass.totalMarks} Marks</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Submissions Received</span>
                    <span className="font-bold text-[#002147] font-mono">{subCount} Submissions</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Grading Method</span>
                    <span className="font-bold text-slate-700">{ass.gradingMethod || 'Points'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 8-STEP CREATOR WIZARD MODAL */}
      <AssignmentCreatorWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setEditingAssignment(null);
        }}
        onSave={handleSaveWizardAssignment}
        schoolId={schoolId}
        currentUser={currentUser}
        assignedClasses={assignedClasses}
        assignedSubjects={assignedSubjects}
        availableStudents={enrolledStudents}
        initialData={editingAssignment}
        showToast={showToast}
      />

      {/* Q&A DISCUSSION MODAL */}
      <AssignmentQnAModal
        isOpen={qnaModal.open}
        onClose={() => setQnaModal({ open: false, assignment: null })}
        assignment={qnaModal.assignment}
        schoolId={schoolId}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* PREVIEW MODAL */}
      {previewModal.open && previewModal.assignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 border border-[#D4AF37]/40 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase bg-amber-400/20 text-[#D4AF37] px-2.5 py-0.5 rounded-lg">
                  {previewModal.assignment.subjectName} • {previewModal.assignment.type}
                </span>
                <h2 className="text-xl font-black mt-2">{previewModal.assignment.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Class: {previewModal.assignment.className}</p>
              </div>
              <button
                onClick={() => setPreviewModal({ open: false, assignment: null })}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Instructions</span>
              <div className="prose prose-invert text-xs leading-relaxed">
                {previewModal.assignment.instructions ? (
                  previewModal.assignment.instructions.split(/(\$[^\$]+\$)/g).map((part: string, i: number) => {
                    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                      return <MathFormulaRenderer key={i} latex={part.slice(1, -1)} inline={true} />;
                    }
                    return <span key={i} className="whitespace-pre-wrap">{part}</span>;
                  })
                ) : (
                  <span className="text-slate-500 italic">No instructions typed.</span>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewModal({ open: false, assignment: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
