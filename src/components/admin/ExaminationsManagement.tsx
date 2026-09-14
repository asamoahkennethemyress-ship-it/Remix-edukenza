import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  Award, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  FileText, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Lock, 
  Unlock,
  BrainCircuit,
  Send, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  PieChart as PieChartIcon, 
  RefreshCw, 
  Check, 
  ShieldCheck, 
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';
import { CbtMainDashboard } from '../cbt/CbtMainDashboard';

export interface ExaminationsManagementProps {
  schoolId: string;
  schoolProfile?: any;
  students: any[];
  teachers: any[];
  classes: any[];
  subjects: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type ExamStatus = 'Draft' | 'Active' | 'Closed' | 'Published' | 'Archived';
export type ExamType = 'Mid-Term' | 'Final' | 'Mock' | 'Continuous Assessment' | 'Standardized';

export interface Examination {
  id?: string;
  schoolId: string;
  examinationName: string;
  academicYear: string;
  term: string;
  classId: string; // 'ALL' or specific classId
  className: string;
  startDate: string;
  endDate: string;
  examinationType: ExamType;
  status: ExamStatus;
  createdAt?: any;
  updatedAt?: any;
}

export interface SubjectResult {
  id?: string;
  schoolId: string;
  examinationId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId?: string;
  teacherName?: string;
  caScore: number;       // Max ~20
  assignmentScore: number; // Max ~10
  midtermScore: number;  // Max ~20
  examScore: number;     // Max ~40
  practicalScore: number;// Max ~10 (optional)
  totalScore: number;    // Calculated sum out of 100
  grade: string;         // A, B, C, D, F
  remark: string;        // Excellent, Good, etc.
  status: 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Published';
  returnedReason?: string;
  updatedAt?: any;
}

export interface ExamResultSummary {
  id?: string;
  schoolId: string;
  examinationId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  totalMarks: number;
  subjectCount: number;
  averageScore: number;
  overallGrade: string;
  positionInClass?: number;
  gpa?: number;
  status: 'Draft' | 'Approved' | 'Published';
  updatedAt?: any;
}

export function ExaminationsManagement({
  schoolId,
  schoolProfile,
  students,
  teachers,
  classes,
  subjects,
  showToast
}: ExaminationsManagementProps) {
  // Main Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'cbt' | 'exams' | 'score-entry' | 'review' | 'analytics' | 'reports'
  >('cbt');

  // Loading States
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingScores, setLoadingScores] = useState(false);
  const [saving, setSaving] = useState(false);

  // Firestore Data
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [subjectResults, setSubjectResults] = useState<SubjectResult[]>([]);
  const [resultApprovals, setResultApprovals] = useState<any[]>([]);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2025/2026');
  const [selectedTerm, setSelectedTerm] = useState('All');
  const [selectedClassFilter, setSelectedClassFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Exam Modal State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [examForm, setExamForm] = useState<Partial<Examination>>({
    examinationName: '',
    academicYear: '2025/2026',
    term: 'Term 1',
    classId: 'ALL',
    className: 'All Classes',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    examinationType: 'Final',
    status: 'Draft'
  });

  // Score Entry Working State
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassForScore, setSelectedClassForScore] = useState<string>('');
  const [selectedSubjectForScore, setSelectedSubjectForScore] = useState<string>('');
  const [scoreEntryList, setScoreEntryList] = useState<Record<string, {
    caScore: number;
    assignmentScore: number;
    midtermScore: number;
    examScore: number;
    practicalScore: number;
  }>>({});

  // Review & Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTargetResult, setReturnTargetResult] = useState<SubjectResult | null>(null);
  const [returnReason, setReturnReason] = useState('');

  // Report Generation Working State
  const [reportType, setReportType] = useState<
    'student' | 'class' | 'subject' | 'summary' | 'promotion' | 'merit'
  >('student');
  const [reportSelectedExam, setReportSelectedExam] = useState<string>('');
  const [reportSelectedClass, setReportSelectedClass] = useState<string>('');
  const [reportSelectedStudent, setReportSelectedStudent] = useState<string>('');
  const [reportSelectedSubject, setReportSelectedSubject] = useState<string>('');

  // Delete Confirm Modal
  const [deleteConfirmExam, setDeleteConfirmExam] = useState<Examination | null>(null);

  // 1. Fetch Examinations
  const fetchExaminations = async () => {
    if (!schoolId) return;
    setLoadingExams(true);
    try {
      const q = query(
        collection(db, 'examinations'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const list: Examination[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Examination);
      });
      setExaminations(list);
    } catch (err: any) {
      console.error("Error fetching examinations:", err);
      showToast("Failed to load examinations", "error");
    } finally {
      setLoadingExams(false);
    }
  };

  // 2. Fetch Subject Results
  const fetchSubjectResults = async () => {
    if (!schoolId) return;
    setLoadingScores(true);
    try {
      const q = query(
        collection(db, 'subjectResults'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const list: SubjectResult[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SubjectResult);
      });
      setSubjectResults(list);
    } catch (err: any) {
      console.error("Error fetching subject results:", err);
    } finally {
      setLoadingScores(false);
    }
  };

  useEffect(() => {
    fetchExaminations();
    fetchSubjectResults();
  }, [schoolId]);

  // Set default selections when data is available
  useEffect(() => {
    if (examinations.length > 0 && !selectedExamId) {
      setSelectedExamId(examinations[0].id || '');
      setReportSelectedExam(examinations[0].id || '');
    }
    if (classes.length > 0 && !selectedClassForScore) {
      setSelectedClassForScore(classes[0].id || '');
      setReportSelectedClass(classes[0].id || '');
    }
    if (subjects.length > 0 && !selectedSubjectForScore) {
      setSelectedSubjectForScore(subjects[0].id || '');
      setReportSelectedSubject(subjects[0].id || '');
    }
  }, [examinations, classes, subjects]);

  // Automatic Grading Helper
  const calculateGradeAndRemark = (score: number) => {
    if (score >= 80) return { grade: 'A', remark: 'Excellent', gpa: 4.0 };
    if (score >= 70) return { grade: 'B', remark: 'Very Good', gpa: 3.0 };
    if (score >= 60) return { grade: 'C', remark: 'Good', gpa: 2.0 };
    if (score >= 50) return { grade: 'D', remark: 'Satisfactory', gpa: 1.0 };
    return { grade: 'F', remark: 'Needs Improvement', gpa: 0.0 };
  };

  // Save / Update Examination
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.examinationName || !examForm.academicYear || !examForm.term) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setSaving(true);
    try {
      const className = examForm.classId === 'ALL' 
        ? 'All Classes' 
        : classes.find(c => c.id === examForm.classId)?.name || 'Class';

      const payload = {
        schoolId,
        examinationName: examForm.examinationName,
        academicYear: examForm.academicYear,
        term: examForm.term,
        classId: examForm.classId || 'ALL',
        className,
        startDate: examForm.startDate || '',
        endDate: examForm.endDate || '',
        examinationType: examForm.examinationType || 'Final',
        status: examForm.status || 'Draft',
        updatedAt: serverTimestamp()
      };

      if (editingExam?.id) {
        await updateDoc(doc(db, 'examinations', editingExam.id), payload);
        showToast("Examination updated successfully", "success");
      } else {
        await addDoc(collection(db, 'examinations'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        showToast("New Examination created successfully", "success");
      }

      setIsExamModalOpen(false);
      setEditingExam(null);
      fetchExaminations();
    } catch (err: any) {
      console.error(err);
      showToast("Failed to save examination", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Examination
  const handleDeleteExam = async () => {
    if (!deleteConfirmExam?.id) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'examinations', deleteConfirmExam.id));
      showToast("Examination deleted successfully", "success");
      setDeleteConfirmExam(null);
      fetchExaminations();
    } catch (err: any) {
      showToast("Failed to delete examination", "error");
    } finally {
      setSaving(false);
    }
  };

  // Change Examination Status
  const handleUpdateExamStatus = async (exam: Examination, newStatus: ExamStatus) => {
    if (!exam.id) return;
    try {
      await updateDoc(doc(db, 'examinations', exam.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      showToast(`Examination status changed to ${newStatus}`, "success");
      fetchExaminations();
    } catch (err: any) {
      showToast("Failed to update status", "error");
    }
  };

  // Filtered Examinations List
  const filteredExams = useMemo(() => {
    return examinations.filter(ex => {
      const matchSearch = ex.examinationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ex.academicYear.toLowerCase().includes(searchTerm.toLowerCase());
      const matchYear = selectedYear === 'All' || ex.academicYear === selectedYear;
      const matchTerm = selectedTerm === 'All' || ex.term === selectedTerm;
      const matchClass = selectedClassFilter === 'All' || ex.classId === 'ALL' || ex.classId === selectedClassFilter;
      const matchStatus = selectedStatusFilter === 'All' || ex.status === selectedStatusFilter;

      return matchSearch && matchYear && matchTerm && matchClass && matchStatus;
    });
  }, [examinations, searchTerm, selectedYear, selectedTerm, selectedClassFilter, selectedStatusFilter]);

  // Score Entry Students for Selected Class
  const classStudentsForScore = useMemo(() => {
    if (!selectedClassForScore) return [];
    return students.filter(s => s.classId === selectedClassForScore || s.gradeId === selectedClassForScore);
  }, [students, selectedClassForScore]);

  // Load existing subject scores into working form state
  useEffect(() => {
    if (!selectedExamId || !selectedClassForScore || !selectedSubjectForScore) return;
    
    const existing = subjectResults.filter(r => 
      r.examinationId === selectedExamId && 
      r.classId === selectedClassForScore && 
      r.subjectId === selectedSubjectForScore
    );

    const initialScores: Record<string, any> = {};
    classStudentsForScore.forEach(st => {
      const found = existing.find(r => r.studentId === st.id);
      initialScores[st.id] = {
        caScore: found?.caScore ?? 0,
        assignmentScore: found?.assignmentScore ?? 0,
        midtermScore: found?.midtermScore ?? 0,
        examScore: found?.examScore ?? 0,
        practicalScore: found?.practicalScore ?? 0,
      };
    });
    setScoreEntryList(initialScores);
  }, [selectedExamId, selectedClassForScore, selectedSubjectForScore, subjectResults, classStudentsForScore]);

  // Save Batch Subject Scores
  const handleSaveSubjectScores = async () => {
    if (!selectedExamId || !selectedClassForScore || !selectedSubjectForScore) {
      showToast("Please select Examination, Class, and Subject", "error");
      return;
    }

    const currentExam = examinations.find(e => e.id === selectedExamId);
    const currentClass = classes.find(c => c.id === selectedClassForScore);
    const currentSubject = subjects.find(s => s.id === selectedSubjectForScore);

    if (currentExam?.status === 'Published') {
      showToast("Cannot edit scores for a published examination", "error");
      return;
    }

    setSaving(true);
    try {
      for (const st of classStudentsForScore) {
        const scores = scoreEntryList[st.id] || { caScore: 0, assignmentScore: 0, midtermScore: 0, examScore: 0, practicalScore: 0 };
        const totalScore = Math.min(100, Math.max(0, 
          Number(scores.caScore || 0) + 
          Number(scores.assignmentScore || 0) + 
          Number(scores.midtermScore || 0) + 
          Number(scores.examScore || 0) + 
          Number(scores.practicalScore || 0)
        ));
        
        const { grade, remark } = calculateGradeAndRemark(totalScore);

        const existingRecord = subjectResults.find(r => 
          r.examinationId === selectedExamId && 
          r.classId === selectedClassForScore && 
          r.subjectId === selectedSubjectForScore && 
          r.studentId === st.id
        );

        const recordPayload = {
          schoolId,
          examinationId: selectedExamId,
          studentId: st.id,
          studentName: st.name || `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Student',
          classId: selectedClassForScore,
          className: currentClass?.name || 'Class',
          subjectId: selectedSubjectForScore,
          subjectName: currentSubject?.name || 'Subject',
          caScore: Number(scores.caScore || 0),
          assignmentScore: Number(scores.assignmentScore || 0),
          midtermScore: Number(scores.midtermScore || 0),
          examScore: Number(scores.examScore || 0),
          practicalScore: Number(scores.practicalScore || 0),
          totalScore,
          grade,
          remark,
          status: 'Submitted',
          updatedAt: serverTimestamp()
        };

        if (existingRecord?.id) {
          await updateDoc(doc(db, 'subjectResults', existingRecord.id), recordPayload);
        } else {
          await addDoc(collection(db, 'subjectResults'), recordPayload);
        }
      }

      showToast("Subject scores saved successfully!", "success");
      fetchSubjectResults();
    } catch (err: any) {
      console.error(err);
      showToast("Error saving subject scores", "error");
    } finally {
      setSaving(false);
    }
  };

  // Admin Approve / Reject / Return / Publish Result
  const handleApproveResult = async (result: SubjectResult) => {
    if (!result.id) return;
    try {
      await updateDoc(doc(db, 'subjectResults', result.id), {
        status: 'Approved',
        updatedAt: serverTimestamp()
      });
      // Add log
      await addDoc(collection(db, 'resultApprovals'), {
        schoolId,
        subjectResultId: result.id,
        action: 'APPROVED',
        timestamp: serverTimestamp()
      });
      showToast("Result approved successfully", "success");
      fetchSubjectResults();
    } catch (err) {
      showToast("Failed to approve result", "error");
    }
  };

  const handleReturnResult = async () => {
    if (!returnTargetResult?.id || !returnReason.trim()) {
      showToast("Please enter a reason for returning", "error");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'subjectResults', returnTargetResult.id), {
        status: 'Returned',
        returnedReason: returnReason,
        updatedAt: serverTimestamp()
      });
      await addDoc(collection(db, 'resultApprovals'), {
        schoolId,
        subjectResultId: returnTargetResult.id,
        action: 'RETURNED',
        reason: returnReason,
        timestamp: serverTimestamp()
      });
      showToast("Result returned to teacher with reason", "info");
      setReturnModalOpen(false);
      setReturnTargetResult(null);
      setReturnReason('');
      fetchSubjectResults();
    } catch (err) {
      showToast("Error returning result", "error");
    } finally {
      setSaving(false);
    }
  };

  // Bulk Publish Exam Results
  const handleBulkPublishExam = async (examId: string, publish: boolean) => {
    setSaving(true);
    try {
      const q = query(
        collection(db, 'subjectResults'),
        where('schoolId', '==', schoolId),
        where('examinationId', '==', examId)
      );
      const snap = await getDocs(q);
      const newStatus = publish ? 'Published' : 'Approved';
      
      const promises = snap.docs.map(docSnap => 
        updateDoc(doc(db, 'subjectResults', docSnap.id), {
          status: newStatus,
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(promises);

      // Also update exam status
      await updateDoc(doc(db, 'examinations', examId), {
        status: publish ? 'Published' : 'Closed',
        updatedAt: serverTimestamp()
      });

      showToast(`All results for this examination are now ${publish ? 'Published' : 'Unpublished'}`, "success");
      fetchExaminations();
      fetchSubjectResults();
    } catch (err) {
      showToast("Failed to publish exam results", "error");
    } finally {
      setSaving(false);
    }
  };

  // Analytics Computation
  const computedAnalytics = useMemo(() => {
    if (!selectedExamId) return null;

    const examResults = subjectResults.filter(r => r.examinationId === selectedExamId);
    if (examResults.length === 0) return null;

    // Student Summaries
    const studentMap: Record<string, { studentId: string; studentName: string; className: string; scores: number[]; total: number; count: number }> = {};
    
    examResults.forEach(r => {
      if (!studentMap[r.studentId]) {
        studentMap[r.studentId] = {
          studentId: r.studentId,
          studentName: r.studentName,
          className: r.className,
          scores: [],
          total: 0,
          count: 0
        };
      }
      studentMap[r.studentId].scores.push(r.totalScore);
      studentMap[r.studentId].total += r.totalScore;
      studentMap[r.studentId].count += 1;
    });

    const studentSummaries = Object.values(studentMap).map(s => {
      const avg = s.count > 0 ? Number((s.total / s.count).toFixed(1)) : 0;
      const { grade, remark, gpa } = calculateGradeAndRemark(avg);
      return {
        ...s,
        average: avg,
        grade,
        remark,
        gpa
      };
    }).sort((a, b) => b.average - a.average);

    // Assign positions
    studentSummaries.forEach((s, idx) => {
      (s as any).position = idx + 1;
    });

    const topStudents = studentSummaries.slice(0, 5);
    const lowestStudents = [...studentSummaries].sort((a, b) => a.average - b.average).slice(0, 5);

    // Grade Distribution
    const gradeDist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    examResults.forEach(r => {
      if (gradeDist[r.grade as keyof typeof gradeDist] !== undefined) {
        gradeDist[r.grade as keyof typeof gradeDist]++;
      }
    });

    const passCount = examResults.filter(r => r.totalScore >= 50).length;
    const failCount = examResults.length - passCount;
    const passRate = examResults.length > 0 ? ((passCount / examResults.length) * 100).toFixed(1) : '0';
    const failRate = examResults.length > 0 ? ((failCount / examResults.length) * 100).toFixed(1) : '0';

    const highestScore = Math.max(...examResults.map(r => r.totalScore), 0);
    const lowestScore = Math.min(...examResults.map(r => r.totalScore), 0);
    const overallAvg = (examResults.reduce((acc, r) => acc + r.totalScore, 0) / (examResults.length || 1)).toFixed(1);

    // Subject Breakdown
    const subjectMap: Record<string, { name: string; total: number; count: number; passes: number }> = {};
    examResults.forEach(r => {
      if (!subjectMap[r.subjectName]) {
        subjectMap[r.subjectName] = { name: r.subjectName, total: 0, count: 0, passes: 0 };
      }
      subjectMap[r.subjectName].total += r.totalScore;
      subjectMap[r.subjectName].count++;
      if (r.totalScore >= 50) subjectMap[r.subjectName].passes++;
    });

    const subjectAnalytics = Object.values(subjectMap).map(sub => ({
      name: sub.name,
      avg: (sub.total / sub.count).toFixed(1),
      passRate: ((sub.passes / sub.count) * 100).toFixed(1)
    }));

    return {
      totalEntries: examResults.length,
      studentSummaries,
      topStudents,
      lowestStudents,
      gradeDist,
      passCount,
      failCount,
      passRate,
      failRate,
      highestScore,
      lowestScore,
      overallAvg,
      subjectAnalytics
    };
  }, [selectedExamId, subjectResults]);

  // Handle Printable Report / Download Action
  const handlePrintReport = () => {
    window.print();
  };

  // Export to CSV helper
  const handleExportCSV = () => {
    if (!computedAnalytics || computedAnalytics.studentSummaries.length === 0) {
      showToast("No data to export", "error");
      return;
    }
    const headers = ["Position", "Student Name", "Class", "Subjects Taken", "Average Score", "Grade", "GPA", "Remark"];
    const rows = computedAnalytics.studentSummaries.map((s: any) => [
      s.position,
      `"${s.studentName}"`,
      `"${s.className}"`,
      s.count,
      s.average,
      s.grade,
      s.gpa,
      `"${s.remark}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Exam_Results_${selectedExamId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exam Results exported to CSV", "success");
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-[#002147] to-[#0d3b66] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-amber-400" />
            <h1 className="text-2xl font-black tracking-tight">Examination & Results Management</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Create examinations, enter subject scores, approve results, analyze performance, and issue report cards.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExam(null);
            setExamForm({
              examinationName: '',
              academicYear: '2025/2026',
              term: 'Term 1',
              classId: 'ALL',
              className: 'All Classes',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              examinationType: 'Final',
              status: 'Draft'
            });
            setIsExamModalOpen(true);
          }}
          className="bg-amber-400 hover:bg-amber-500 text-[#002147] font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create Examination
        </button>
      </div>

      {/* SUB TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('cbt')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeSubTab === 'cbt'
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-[#D4AF37]" />
          Enterprise CBT Engine
        </button>
        <button
          onClick={() => setActiveSubTab('exams')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'exams'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Examinations
        </button>
        <button
          onClick={() => setActiveSubTab('score-entry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'score-entry'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Edit className="w-4 h-4" />
          Score Entry
        </button>
        <button
          onClick={() => setActiveSubTab('review')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'review'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Result Review & Approval
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'analytics'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Exam Analytics
        </button>
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'reports'
              ? 'bg-[#002147] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Report Cards & Lists
        </button>
      </div>

      {/* SUB TAB 0: ENTERPRISE CBT ENGINE */}
      {activeSubTab === 'cbt' && (
        <CbtMainDashboard
          schoolId={schoolId}
          userRole="school_admin"
          userId="admin_user"
          userName="School Admin"
          subjects={subjects}
          classes={classes}
          students={students}
          teachers={teachers}
          showToast={showToast}
        />
      )}

      {/* SUB TAB 1: EXAMINATIONS SETUP */}
      {activeSubTab === 'exams' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search examinations..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#002147] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="All">All Academic Years</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2024/2025">2024/2025</option>
              </select>

              <select
                value={selectedTerm}
                onChange={e => setSelectedTerm(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="All">All Terms</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Examinations List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingExams ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#002147]" />
                <span className="text-xs">Loading examinations...</span>
              </div>
            ) : filteredExams.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Award className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No Examinations Found</p>
                <p className="text-xs text-slate-400">
                  Click "Create Examination" to schedule a new examination.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Exam Name</th>
                      <th className="p-4">Academic Year & Term</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Dates</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExams.map(ex => {
                      const getStatusBadge = (st: ExamStatus) => {
                        switch (st) {
                          case 'Draft': return 'bg-slate-100 text-slate-700';
                          case 'Active': return 'bg-emerald-100 text-emerald-800 font-bold';
                          case 'Closed': return 'bg-amber-100 text-amber-800';
                          case 'Published': return 'bg-blue-100 text-blue-800 font-bold';
                          case 'Archived': return 'bg-gray-200 text-gray-600';
                        }
                      };

                      return (
                        <tr key={ex.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4 font-bold text-[#002147]">
                            {ex.examinationName}
                          </td>
                          <td className="p-4">
                            <div>{ex.academicYear}</div>
                            <div className="text-[10px] text-slate-400">{ex.term}</div>
                          </td>
                          <td className="p-4">{ex.className}</td>
                          <td className="p-4">
                            <span className="text-slate-500">{ex.startDate} to {ex.endDate}</span>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-slate-100 rounded-md font-medium text-[11px]">
                              {ex.examinationType}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${getStatusBadge(ex.status)}`}>
                              {ex.status}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {ex.status !== 'Published' ? (
                              <button
                                title="Publish Exam Results"
                                onClick={() => handleBulkPublishExam(ex.id!, true)}
                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg transition"
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                title="Unpublish Exam"
                                onClick={() => handleBulkPublishExam(ex.id!, false)}
                                className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-lg transition"
                              >
                                Unpublish
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingExam(ex);
                                setExamForm({ ...ex });
                                setIsExamModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#002147] hover:bg-slate-100 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeleteConfirmExam(ex)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 2: SCORE ENTRY */}
      {activeSubTab === 'score-entry' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-[#002147] flex items-center gap-2">
              <Edit className="w-4 h-4 text-amber-500" />
              Teacher & Admin Subject Score Entry
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Examination</label>
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#002147] outline-none"
                >
                  <option value="">-- Select Examination --</option>
                  {examinations.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.examinationName} ({ex.term} - {ex.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Class</label>
                <select
                  value={selectedClassForScore}
                  onChange={e => setSelectedClassForScore(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#002147] outline-none"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Subject</label>
                <select
                  value={selectedSubjectForScore}
                  onChange={e => setSelectedSubjectForScore(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#002147] outline-none"
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Student Score Sheet Table */}
          {selectedExamId && selectedClassForScore && selectedSubjectForScore && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black text-[#002147]">
                    Score Sheet for Class Students ({classStudentsForScore.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Continuous Assessment (20) + Assignment (10) + Midterm (20) + Exam (40) + Practical (10)
                  </p>
                </div>
                <button
                  onClick={handleSaveSubjectScores}
                  disabled={saving}
                  className="bg-[#002147] hover:bg-[#0d3b66] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {saving ? "Saving Scores..." : "Save & Calculate All Scores"}
                </button>
              </div>

              {classStudentsForScore.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No enrolled students found in this class.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3 w-24">CA (20)</th>
                        <th className="p-3 w-24">Assignment (10)</th>
                        <th className="p-3 w-24">Midterm (20)</th>
                        <th className="p-3 w-24">Exam (40)</th>
                        <th className="p-3 w-24">Practical (10)</th>
                        <th className="p-3 w-24">Total (100)</th>
                        <th className="p-3 w-20">Grade</th>
                        <th className="p-3">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudentsForScore.map((st, idx) => {
                        const scoreData = scoreEntryList[st.id] || {
                          caScore: 0,
                          assignmentScore: 0,
                          midtermScore: 0,
                          examScore: 0,
                          practicalScore: 0
                        };

                        const total = Math.min(100, Math.max(0, 
                          Number(scoreData.caScore || 0) + 
                          Number(scoreData.assignmentScore || 0) + 
                          Number(scoreData.midtermScore || 0) + 
                          Number(scoreData.examScore || 0) + 
                          Number(scoreData.practicalScore || 0)
                        ));

                        const { grade, remark } = calculateGradeAndRemark(total);

                        const updateSingleScore = (field: string, val: number) => {
                          setScoreEntryList(prev => ({
                            ...prev,
                            [st.id]: {
                              ...(prev[st.id] || { caScore: 0, assignmentScore: 0, midtermScore: 0, examScore: 0, practicalScore: 0 }),
                              [field]: val
                            }
                          }));
                        };

                        return (
                          <tr key={st.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-[#002147]">
                              {st.name || `${st.firstName || ''} ${st.lastName || ''}`}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={scoreData.caScore}
                                onChange={e => updateSingleScore('caScore', parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-[#002147]"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={scoreData.assignmentScore}
                                onChange={e => updateSingleScore('assignmentScore', parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-[#002147]"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={scoreData.midtermScore}
                                onChange={e => updateSingleScore('midtermScore', parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-[#002147]"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="40"
                                value={scoreData.examScore}
                                onChange={e => updateSingleScore('examScore', parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-[#002147]"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={scoreData.practicalScore}
                                onChange={e => updateSingleScore('practicalScore', parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:ring-1 focus:ring-[#002147]"
                              />
                            </td>
                            <td className="p-3 font-black text-slate-800 text-sm">
                              {total}
                            </td>
                            <td className="p-3 font-black">
                              <span className={`px-2 py-0.5 rounded-md text-xs ${
                                grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                grade === 'C' ? 'bg-amber-100 text-amber-800' :
                                grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {grade}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-medium">
                              {remark}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB TAB 3: RESULT REVIEW & APPROVAL */}
      {activeSubTab === 'review' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
            <h2 className="text-sm font-black text-[#002147] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              School Admin Result Review & Approvals
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="">-- All Examinations --</option>
                {examinations.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.examinationName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {subjectResults.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No Submitted Subject Results Yet</p>
                <p className="text-xs">
                  Once teachers enter and submit scores, they will appear here for admin review.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Class & Subject</th>
                      <th className="p-4">Score Breakdown</th>
                      <th className="p-4">Total & Grade</th>
                      <th className="p-4">Approval Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectResults
                      .filter(r => !selectedExamId || r.examinationId === selectedExamId)
                      .map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-4 font-bold text-[#002147]">
                            {r.studentName}
                          </td>
                          <td className="p-4">
                            <div className="font-semibold">{r.subjectName}</div>
                            <div className="text-[10px] text-slate-400">{r.className}</div>
                          </td>
                          <td className="p-4 text-slate-500">
                            CA: {r.caScore} | Assgn: {r.assignmentScore} | Mid: {r.midtermScore} | Exam: {r.examScore}
                          </td>
                          <td className="p-4 font-black">
                            {r.totalScore} ({r.grade})
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              r.status === 'Published' ? 'bg-blue-100 text-blue-800' :
                              r.status === 'Returned' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                            {r.returnedReason && (
                              <p className="text-[10px] text-red-600 mt-0.5">Reason: {r.returnedReason}</p>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {r.status !== 'Approved' && r.status !== 'Published' && (
                              <button
                                onClick={() => handleApproveResult(r)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setReturnTargetResult(r);
                                setReturnModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 font-bold rounded-lg transition"
                            >
                              Return to Teacher
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 4: EXAM ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
            <div>
              <h2 className="text-sm font-black text-[#002147]">Examination Analytics & Insights</h2>
              <p className="text-xs text-slate-400">Calculated pass rates, rankings, grade distributions and class statistics.</p>
            </div>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="">-- Select Exam to Analyze --</option>
              {examinations.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.examinationName}</option>
              ))}
            </select>
          </div>

          {!computedAnalytics ? (
            <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200">
              <BarChart2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No Exam Data Selected or Results Found</p>
              <p className="text-xs">Please select an examination with entered subject scores above.</p>
            </div>
          ) : (
            <>
              {/* KPI STATS CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Overall Class Average</p>
                  <p className="text-2xl font-black text-[#002147]">{computedAnalytics.overallAvg}%</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Highest: {computedAnalytics.highestScore}%</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Pass Rate</p>
                  <p className="text-2xl font-black text-emerald-600">{computedAnalytics.passRate}%</p>
                  <p className="text-[10px] text-slate-400">{computedAnalytics.passCount} Passed Students</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Fail Rate</p>
                  <p className="text-2xl font-black text-red-600">{computedAnalytics.failRate}%</p>
                  <p className="text-[10px] text-slate-400">{computedAnalytics.failCount} Needing Support</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <p className="text-xs text-slate-400 font-medium">Total Evaluated</p>
                  <p className="text-2xl font-black text-[#002147]">{computedAnalytics.studentSummaries.length}</p>
                  <p className="text-[10px] text-slate-400">Students Evaluated</p>
                </div>
              </div>

              {/* LEADERBOARDS: TOP vs LOWEST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Performing */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Top Performing Students
                  </h3>
                  <div className="space-y-2">
                    {computedAnalytics.topStudents.map((st: any) => (
                      <div key={st.studentId} className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-400 text-[#002147] font-black text-xs flex items-center justify-center shadow-xs">
                            {st.position}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-[#002147]">{st.studentName}</div>
                            <div className="text-[10px] text-slate-400">{st.className}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-emerald-800">{st.average}%</div>
                          <div className="text-[10px] font-bold text-emerald-600">Grade {st.grade}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lowest Performing */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Lowest Performing Students (Academic Intervention)
                  </h3>
                  <div className="space-y-2">
                    {computedAnalytics.lowestStudents.map((st: any) => (
                      <div key={st.studentId} className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-100">
                        <div>
                          <div className="text-xs font-bold text-red-900">{st.studentName}</div>
                          <div className="text-[10px] text-slate-400">{st.className}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-red-700">{st.average}%</div>
                          <div className="text-[10px] font-bold text-red-500">Grade {st.grade}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* GRADE DISTRIBUTION & SUBJECT BREAKDOWN */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-[#002147]">Subject Performance Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {computedAnalytics.subjectAnalytics.map((sub, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-[#002147]">{sub.name}</div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Subject Avg:</span>
                        <span className="font-bold text-slate-800">{sub.avg}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Pass Rate:</span>
                        <span className="font-bold text-emerald-600">{sub.passRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUB TAB 5: REPORTS & REPORT CARDS */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 className="text-sm font-black text-[#002147]">Report Card & Merit List Generator</h2>
                <p className="text-xs text-slate-400">Generate printable student report cards, merit lists, and class position summaries.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Excel/CSV
                </button>
                <button
                  onClick={handlePrintReport}
                  className="bg-[#002147] hover:bg-[#0d3b66] text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print / Download PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="student">Individual Student Report Card</option>
                  <option value="class">Class Performance Summary</option>
                  <option value="merit">Merit / Honours List</option>
                  <option value="promotion">Promotion List</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Examination</label>
                <select
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                >
                  <option value="">-- Select Examination --</option>
                  {examinations.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.examinationName}</option>
                  ))}
                </select>
              </div>

              {reportType === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
                  <select
                    value={reportSelectedStudent}
                    onChange={e => setReportSelectedStudent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  >
                    <option value="">-- Select Student --</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name || `${st.firstName || ''} ${st.lastName || ''}`} ({st.className || 'Class'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* REPORT CARD PRINTABLE CONTAINER */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none space-y-6">
            {/* SCHOOL BRANDING HEADER */}
            <div className="flex justify-between items-center border-b-2 border-[#002147] pb-6">
              <div className="flex items-center gap-4">
                {schoolProfile?.logoUrl ? (
                  <img src={schoolProfile.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                ) : (
                  <div className="w-16 h-16 bg-[#002147] text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                    {schoolProfile?.name?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-black text-[#002147] tracking-tight">
                    {schoolProfile?.name || 'EDUkenZA Academy'}
                  </h1>
                  <p className="text-xs text-slate-500">Official Student Academic Progress Report</p>
                  <p className="text-[11px] text-slate-400">{schoolProfile?.address || 'South Africa'}</p>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="px-3 py-1 bg-[#002147] text-amber-400 font-black text-xs rounded-lg uppercase tracking-wider">
                  Academic Report Card
                </span>
                <p className="text-xs font-bold text-slate-700 mt-2">
                  Year: {examinations.find(e => e.id === selectedExamId)?.academicYear || '2025/2026'}
                </p>
                <p className="text-xs text-slate-500">
                  Term: {examinations.find(e => e.id === selectedExamId)?.term || 'Term 1'}
                </p>
              </div>
            </div>

            {/* REPORT TYPE CONTENT */}
            {reportType === 'student' && (
              <div className="space-y-6">
                {/* Student Info Card */}
                {(() => {
                  const targetStudent = students.find(s => s.id === reportSelectedStudent);
                  const studentScores = subjectResults.filter(
                    r => r.examinationId === selectedExamId && r.studentId === reportSelectedStudent
                  );

                  const totalMarks = studentScores.reduce((acc, curr) => acc + curr.totalScore, 0);
                  const avg = studentScores.length > 0 ? (totalMarks / studentScores.length).toFixed(1) : '0';
                  const { grade, remark, gpa } = calculateGradeAndRemark(Number(avg));

                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Student Name</span>
                          <span className="font-bold text-[#002147] text-sm">
                            {targetStudent?.name || `${targetStudent?.firstName || ''} ${targetStudent?.lastName || ''}` || 'Select Student Above'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Admission Number</span>
                          <span className="font-bold text-slate-800">{targetStudent?.admissionNumber || targetStudent?.studentId || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Class Level</span>
                          <span className="font-bold text-slate-800">{targetStudent?.className || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Overall Average & GPA</span>
                          <span className="font-black text-emerald-600 text-sm">{avg}% ({grade}) - GPA {gpa}</span>
                        </div>
                      </div>

                      {/* Subject Marks Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                          <thead className="bg-[#002147] text-white font-bold">
                            <tr>
                              <th className="p-3">Subject</th>
                              <th className="p-3 text-center">CA (20)</th>
                              <th className="p-3 text-center">Assign (10)</th>
                              <th className="p-3 text-center">Mid (20)</th>
                              <th className="p-3 text-center">Exam (40)</th>
                              <th className="p-3 text-center">Total (100)</th>
                              <th className="p-3 text-center">Grade</th>
                              <th className="p-3">Remark</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {studentScores.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="p-6 text-center text-slate-400">
                                  No subject scores found for this student in the selected examination.
                                </td>
                              </tr>
                            ) : (
                              studentScores.map(score => (
                                <tr key={score.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-bold text-[#002147]">{score.subjectName}</td>
                                  <td className="p-3 text-center">{score.caScore}</td>
                                  <td className="p-3 text-center">{score.assignmentScore}</td>
                                  <td className="p-3 text-center">{score.midtermScore}</td>
                                  <td className="p-3 text-center">{score.examScore}</td>
                                  <td className="p-3 text-center font-black text-slate-900">{score.totalScore}</td>
                                  <td className="p-3 text-center font-bold">{score.grade}</td>
                                  <td className="p-3 font-medium text-slate-600">{score.remark}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Remarks & Signatures */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <p className="text-xs font-bold text-[#002147]">Class Teacher's Remark</p>
                          <p className="text-xs text-slate-600 italic">
                            "{targetStudent?.name || 'Student'} has demonstrated commendable academic effort and discipline throughout this term. Keep aiming higher!"
                          </p>
                          <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-400">
                            <span>Signature: ____________________</span>
                            <span>Date: {new Date().toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <p className="text-xs font-bold text-[#002147]">School Principal's Endorsement</p>
                          <p className="text-xs text-slate-600 italic">
                            "Results approved and authenticated by the School Administration."
                          </p>
                          <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-400">
                            <span>Official Stamp & Seal</span>
                            <span>Status: PUBLISHED</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* CLASS OR MERIT LIST SUMMARY */}
            {(reportType === 'class' || reportType === 'merit' || reportType === 'promotion') && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-[#002147] uppercase tracking-wider">
                  {reportType === 'merit' ? 'Honours & Merit Rank List' : 
                   reportType === 'promotion' ? 'Class Promotion Eligibility List' : 
                   'Class Academic Performance Summary'}
                </h3>

                {computedAnalytics ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                      <thead className="bg-[#002147] text-white font-bold">
                        <tr>
                          <th className="p-3">Rank</th>
                          <th className="p-3">Student Name</th>
                          <th className="p-3">Class</th>
                          <th className="p-3 text-center">Average Score</th>
                          <th className="p-3 text-center">Grade</th>
                          <th className="p-3 text-center">GPA</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {computedAnalytics.studentSummaries.map((st: any) => (
                          <tr key={st.studentId} className="hover:bg-slate-50">
                            <td className="p-3 font-black text-[#002147]">#{st.position}</td>
                            <td className="p-3 font-bold">{st.studentName}</td>
                            <td className="p-3 text-slate-500">{st.className}</td>
                            <td className="p-3 text-center font-black text-slate-800">{st.average}%</td>
                            <td className="p-3 text-center font-bold">{st.grade}</td>
                            <td className="p-3 text-center font-bold text-emerald-700">{st.gpa}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                st.average >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {st.average >= 50 ? 'PROMOTED / PASS' : 'ACADEMIC SUPPORT'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Please select an examination to load class report data.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT EXAM MODAL */}
      {isExamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147]">
                {editingExam ? 'Edit Examination' : 'Create New Examination'}
              </h3>
              <button
                onClick={() => setIsExamModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Examination Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Term 1 Final Examination 2026"
                  value={examForm.examinationName}
                  onChange={e => setExamForm({ ...examForm, examinationName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={examForm.academicYear}
                    onChange={e => setExamForm({ ...examForm, academicYear: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="2025/2026">2025/2026</option>
                    <option value="2024/2025">2024/2025</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Term</label>
                  <select
                    value={examForm.term}
                    onChange={e => setExamForm({ ...examForm, term: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class Scope</label>
                  <select
                    value={examForm.classId}
                    onChange={e => setExamForm({ ...examForm, classId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="ALL">All Classes</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Examination Type</label>
                  <select
                    value={examForm.examinationType}
                    onChange={e => setExamForm({ ...examForm, examinationType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  >
                    <option value="Final">Final Examination</option>
                    <option value="Mid-Term">Mid-Term Assessment</option>
                    <option value="Mock">Mock Test</option>
                    <option value="Continuous Assessment">Continuous Assessment</option>
                    <option value="Standardized">National Standardized</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={examForm.startDate}
                    onChange={e => setExamForm({ ...examForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={examForm.endDate}
                    onChange={e => setExamForm({ ...examForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={examForm.status}
                  onChange={e => setExamForm({ ...examForm, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#002147] hover:bg-[#0d3b66] text-white text-xs font-bold rounded-xl transition"
                >
                  {saving ? 'Saving...' : 'Save Examination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETURN TO TEACHER MODAL */}
      {returnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-red-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-600" />
              Return Result to Teacher
            </h3>
            <p className="text-xs text-slate-500">
              Provide a clear reason or feedback for the subject teacher to revise this score.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Exam score is missing or exceeds maximum threshold."
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReturnModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReturnResult}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition"
              >
                Return Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmExam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <Trash2 className="w-10 h-10 text-red-600 mx-auto" />
            <h3 className="text-sm font-black text-slate-800">Delete Examination?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete <span className="font-bold text-slate-800">{deleteConfirmExam.examinationName}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmExam(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteExam}
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition"
              >
                {saving ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
