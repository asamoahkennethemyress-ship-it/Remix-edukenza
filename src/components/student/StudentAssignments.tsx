import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Search, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

import { AssignmentDashboardStats } from './assignment/AssignmentDashboardStats';
import { AssignmentFilterBar } from './assignment/AssignmentFilterBar';
import { AssignmentCardView } from './assignment/AssignmentCardView';
import { AssignmentTableView } from './assignment/AssignmentTableView';
import { AssignmentDetailsModal } from './assignment/AssignmentDetailsModal';
import { AssignmentSubmitModal } from './assignment/AssignmentSubmitModal';
import { AssignmentGradesView } from './assignment/AssignmentGradesView';
import { AssignmentProgressTracker } from './assignment/AssignmentProgressTracker';
import { AssignmentCalendarView } from './assignment/AssignmentCalendarView';

interface StudentAssignmentsProps {
  schoolId?: string;
  studentClass?: string;
  currentUser: any;
  studentRecord?: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  schoolId: propSchoolId,
  studentClass: propStudentClass,
  currentUser,
  studentRecord,
  showToast
}) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assignments' | 'calendar' | 'tracker'>('dashboard');

  // View mode & filters for 'assignments' tab
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDueDateFilter, setSelectedDueDateFilter] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; assignment: any | null }>({
    open: false,
    assignment: null
  });
  const [submitModal, setSubmitModal] = useState<{ open: boolean; assignment: any | null }>({
    open: false,
    assignment: null
  });
  const [gradesModal, setGradesModal] = useState<{ open: boolean; assignment: any | null; submission: any | null }>({
    open: false,
    assignment: null,
    submission: null
  });

  // Derived student attributes
  const studentSchoolId = propSchoolId || currentUser?.schoolId || studentRecord?.schoolId || '';
  const studentClassId = studentRecord?.classId || studentRecord?.className || currentUser?.classId || currentUser?.className || currentUser?.studentClass || propStudentClass || '';
  const studentClassName = studentRecord?.className || studentRecord?.classId || currentUser?.className || currentUser?.studentClass || currentUser?.classId || propStudentClass || '';
  const studentSubjects = studentRecord?.subjects || currentUser?.subjects || studentRecord?.enrolledSubjects || currentUser?.enrolledSubjects || [];

  // Real-time Firestore Subscription for Assignments & Submissions
  useEffect(() => {
    if (!studentSchoolId) return;
    setLoading(true);

    const studentUid = currentUser?.uid || '';
    const studentIdNum = studentRecord?.studentId || currentUser?.studentId || '';

    // 1. Fetch published assignments matching school & class
    const qAss = query(
      collection(db, 'assignments'),
      where('schoolId', '==', studentSchoolId)
    );

    const unsubAss = onSnapshot(qAss, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        // Verify status is published
        const statusClean = String(data.status || '').toLowerCase().trim();
        const isPublished = statusClean === 'published' || data.publishMode === 'Immediately';

        if (!isPublished) return;

        // Verify Class match
        const assClassId = String(data.classId || '').toLowerCase().trim();
        const assClassName = String(data.className || data.targetClass || '').toLowerCase().trim();
        const stClassId = String(studentClassId || '').toLowerCase().trim();
        const stClassName = String(studentClassName || '').toLowerCase().trim();

        const isClassMatch = 
          (!assClassId && !assClassName) ||
          (assClassId && stClassId && (assClassId === stClassId || stClassId.includes(assClassId) || assClassId.includes(stClassId))) ||
          (assClassName && stClassName && (assClassName === stClassName || stClassName.includes(assClassName) || assClassName.includes(stClassName))) ||
          (assClassId && stClassName && (assClassId === stClassName || stClassName.includes(assClassId))) ||
          (assClassName && stClassId && (assClassName === stClassId || stClassId.includes(assClassName)));

        if (!isClassMatch) return;

        // Verify Individual Student targeted recipient list if set
        const recipientsMode = data.recipientsMode;
        const recipientStudentIds: string[] = data.recipientStudentIds || [];
        if (recipientsMode === 'Individual' || recipientsMode === 'Specific Students') {
          const isTargeted = recipientStudentIds.includes(studentUid) || recipientStudentIds.includes(studentIdNum);
          if (!isTargeted) return;
        }

        list.push({ id, assignmentId: id, ...data });
      });

      // Sort by published / due date DESC
      list.sort((a, b) => {
        const dateA = a.publishedAt?.toMillis?.() || new Date(a.dueDate || 0).getTime();
        const dateB = b.publishedAt?.toMillis?.() || new Date(b.dueDate || 0).getTime();
        return dateB - dateA;
      });

      setAssignments(list);
      setLoading(false);
    }, (err) => {
      console.warn('Assignments listener error:', err);
      setLoading(false);
    });

    // 2. Fetch Student Submissions in real-time
    let fallbackUnsub: (() => void) | null = null;
    const qSub = query(
      collection(db, 'assignmentSubmissions'),
      where('schoolId', '==', studentSchoolId),
      where('studentUid', '==', studentUid)
    );

    const unsubSub = onSnapshot(qSub, (snap) => {
      const listSub: any[] = [];
      snap.forEach((d) => listSub.push({ id: d.id, ...d.data() }));
      setSubmissions(listSub);
    }, (err) => {
      // Fallback query matching studentId field
      const qSubFallback = query(
        collection(db, 'assignmentSubmissions'),
        where('schoolId', '==', studentSchoolId),
        where('studentId', '==', studentUid)
      );
      fallbackUnsub = onSnapshot(qSubFallback, (sSnap) => {
        const lSub: any[] = [];
        sSnap.forEach((d) => lSub.push({ id: d.id, ...d.data() }));
        setSubmissions(lSub);
      });
    });

    return () => {
      unsubAss();
      unsubSub();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [studentSchoolId, studentClassId, studentClassName, currentUser, studentRecord]);

  // DERIVE UNIQUE SUBJECTS & TYPES LIST FOR FILTER BAR
  const subjectsSet = new Set<string>();
  const typesSet = new Set<string>();

  assignments.forEach(a => {
    if (a.subjectName || a.subjectId) subjectsSet.add(a.subjectName || a.subjectId);
    if (a.type) typesSet.add(a.type);
  });

  const subjectsList = Array.from(subjectsSet);
  const typesList = Array.from(typesSet);

  // MAP & FILTER ASSIGNMENTS
  const subMap = new Map<string, any>();
  submissions.forEach(s => subMap.set(s.assignmentId, s));
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAssignments = assignments.filter(ass => {
    // 1. Search term match
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const titleMatch = ass.title?.toLowerCase().includes(term);
      const subjectMatch = (ass.subjectName || ass.subjectId || '').toLowerCase().includes(term);
      const teacherMatch = ass.teacherName?.toLowerCase().includes(term);
      if (!titleMatch && !subjectMatch && !teacherMatch) return false;
    }

    // 2. Subject filter match
    if (selectedSubject !== 'All') {
      const subj = ass.subjectName || ass.subjectId || '';
      if (subj !== selectedSubject) return false;
    }

    // 3. Type filter match
    if (selectedType !== 'All' && ass.type !== selectedType) {
      return false;
    }

    // 4. Status filter match
    const sub = subMap.get(ass.id);
    let calculatedStatus = 'New';
    if (sub) {
      if (sub.grade !== undefined && sub.grade !== null && sub.grade !== '' || sub.status === 'Graded') {
        calculatedStatus = 'Graded';
      } else if (sub.status === 'Returned') {
        calculatedStatus = 'Returned';
      } else {
        calculatedStatus = 'Submitted';
      }
    } else {
      const hasDraft = localStorage.getItem(`assignment_draft_${currentUser?.uid}_${ass.id}`) !== null;
      if (hasDraft) {
        calculatedStatus = 'In Progress';
      } else if (ass.dueDate && ass.dueDate < todayStr) {
        calculatedStatus = 'Overdue';
      } else {
        calculatedStatus = 'New';
      }
    }

    if (selectedStatus !== 'All' && calculatedStatus !== selectedStatus) {
      return false;
    }

    // 5. Due Date range filter
    if (selectedDueDateFilter === 'Due Today' && ass.dueDate !== todayStr) return false;
    if (selectedDueDateFilter === 'Overdue' && (!ass.dueDate || ass.dueDate >= todayStr || !!sub)) return false;

    return true;
  });

  // SORT ASSIGNMENTS
  filteredAssignments.sort((a, b) => {
    let valA: any = a[sortBy] || '';
    let valB: any = b[sortBy] || '';

    if (sortBy === 'dueDate') {
      valA = a.dueDate || '9999-99-99';
      valB = b.dueDate || '9999-99-99';
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Action Handlers
  const handleOpenDetails = (assignment: any) => {
    const sub = subMap.get(assignment.id);
    setDetailsModal({ open: true, assignment });
  };

  const handleSubmitWork = (assignment: any) => {
    const sub = subMap.get(assignment.id);
    setSubmitModal({ open: true, assignment });
  };

  const handleViewGrades = (assignment: any, submission: any) => {
    setGradesModal({ open: true, assignment, submission });
  };

  return (
    <div className="space-y-6">
      
      {/* LMS TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Assignment LMS Module</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Publishing sync, live countdown tickers, mathematical KaTeX rendering, drag-and-drop auto-saving submission editor.
          </p>
        </div>

        {/* PRIMARY TOP NAV MODULE TABS */}
        <div className="flex bg-white/10 p-1 rounded-2xl border border-white/20 gap-1 text-xs font-bold w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'assignments' ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>My Assignments ({assignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'calendar' ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'tracker' ? 'bg-[#D4AF37] text-[#002147] font-black shadow-md' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Progress Tracker</span>
          </button>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-3 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-[#002147] mx-auto" />
          <h3 className="text-sm font-black text-[#002147]">Syncing Assignments & Submissions</h3>
          <p className="text-xs text-slate-500">Connecting to Firestore real-time listener...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD (STATS & RECHARTS CHARTS) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <AssignmentDashboardStats 
                assignments={assignments}
                submissions={submissions}
              />

              {/* RECENT ASSIGNMENTS SECTION */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D4AF37]" />
                    Recent Assignments & Course Deadlines
                  </h3>
                  <button
                    onClick={() => setActiveTab('assignments')}
                    className="text-xs font-bold text-[#002147] hover:underline"
                  >
                    View All Assignments ({assignments.length}) →
                  </button>
                </div>

                <AssignmentCardView 
                  assignments={assignments.slice(0, 6)}
                  submissions={submissions}
                  onOpenDetails={handleOpenDetails}
                  onSubmitWork={handleSubmitWork}
                  onViewGrades={handleViewGrades}
                />
              </div>
            </div>
          )}

          {/* TAB 2: MY ASSIGNMENTS (FILTER BAR, CARD VS TABLE VIEW) */}
          {activeTab === 'assignments' && (
            <div className="space-y-4">
              <AssignmentFilterBar 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                selectedDueDateFilter={selectedDueDateFilter}
                setSelectedDueDateFilter={setSelectedDueDateFilter}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                viewMode={viewMode}
                setViewMode={setViewMode}
                subjectsList={subjectsList}
                typesList={typesList}
                totalResults={filteredAssignments.length}
              />

              {viewMode === 'card' ? (
                <AssignmentCardView 
                  assignments={filteredAssignments}
                  submissions={submissions}
                  onOpenDetails={handleOpenDetails}
                  onSubmitWork={handleSubmitWork}
                  onViewGrades={handleViewGrades}
                />
              ) : (
                <AssignmentTableView 
                  assignments={filteredAssignments}
                  submissions={submissions}
                  onOpenDetails={handleOpenDetails}
                  onSubmitWork={handleSubmitWork}
                  onViewGrades={handleViewGrades}
                />
              )}
            </div>
          )}

          {/* TAB 3: CALENDAR VIEW */}
          {activeTab === 'calendar' && (
            <AssignmentCalendarView 
              assignments={assignments}
              submissions={submissions}
              onOpenDetails={handleOpenDetails}
            />
          )}

          {/* TAB 4: PROGRESS TRACKER */}
          {activeTab === 'tracker' && (
            <AssignmentProgressTracker 
              assignments={assignments}
              submissions={submissions}
            />
          )}
        </>
      )}

      {/* ASSIGNMENT DETAILS MODAL */}
      <AssignmentDetailsModal 
        isOpen={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, assignment: null })}
        assignment={detailsModal.assignment}
        submission={detailsModal.assignment ? subMap.get(detailsModal.assignment.id) : null}
        onSubmitWork={handleSubmitWork}
      />

      {/* ASSIGNMENT SUBMIT MODAL */}
      <AssignmentSubmitModal 
        isOpen={submitModal.open}
        onClose={() => setSubmitModal({ open: false, assignment: null })}
        assignment={submitModal.assignment}
        submission={submitModal.assignment ? subMap.get(submitModal.assignment.id) : null}
        currentUser={currentUser}
        studentRecord={studentRecord}
        showToast={showToast}
      />

      {/* ASSIGNMENT GRADES & FEEDBACK MODAL */}
      <AssignmentGradesView 
        isOpen={gradesModal.open}
        onClose={() => setGradesModal({ open: false, assignment: null, submission: null })}
        assignment={gradesModal.assignment}
        submission={gradesModal.submission}
        onResubmit={handleSubmitWork}
      />

    </div>
  );
};
