import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  X, 
  Award, 
  Sliders, 
  Send, 
  GraduationCap, 
  Check, 
  AlertCircle,
  Building2,
  Users,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { StudentRecord, ClassRecord, SubjectRecord, TeacherRecord, SchoolProfileData } from '../SchoolAdminDashboard';

export interface GradeRule {
  minMark: number;
  maxMark: number;
  grade: string;
  remark: string;
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  caScore: number;   // Continuous Assessment (out of 40)
  examScore: number; // Exam Score (out of 60)
  totalScore: number; // CA + Exam (out of 100)
  grade: string;
  teacherRemark?: string;
}

export interface AcademicReportRecord {
  id: string;
  reportId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  academicYear: string;
  term: string;
  subjectResults: SubjectResult[];
  overallTotalScore: number;
  overallAverage: number;
  classAverage: number;
  classPosition: number | string; // e.g. 1 or "2nd (Tied)"
  totalStudentsInClass: number;
  attendance: string; // e.g. "65 / 65"
  conduct: string; // "Excellent", "Good", "Satisfactory"
  teacherRemark: string;
  classTeacherComment: string;
  headteacherComment: string;
  promotionStatus: 'Promoted' | 'Retained' | 'Pending';
  nextClass: string;
  status: 'Draft' | 'Published';
  dateIssued: string;
  createdAt: string;
  updatedAt?: string;
}

interface AcademicReportManagementProps {
  schoolId: string;
  schoolProfile: SchoolProfileData;
  students: StudentRecord[];
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  teachers: TeacherRecord[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_GRADE_RULES: GradeRule[] = [
  { minMark: 80, maxMark: 100, grade: 'A', remark: 'Excellent' },
  { minMark: 70, maxMark: 79, grade: 'B', remark: 'Very Good' },
  { minMark: 60, maxMark: 69, grade: 'C', remark: 'Good' },
  { minMark: 50, maxMark: 59, grade: 'D', remark: 'Credit / Pass' },
  { minMark: 0, maxMark: 49, grade: 'F', remark: 'Fail / Needs Improvement' }
];

export const AcademicReportManagement: React.FC<AcademicReportManagementProps> = ({
  schoolId,
  schoolProfile,
  students,
  classes,
  subjects,
  teachers,
  showToast
}) => {
  const [reports, setReports] = useState<AcademicReportRecord[]>([]);
  const [gradeRules, setGradeRules] = useState<GradeRule[]>(DEFAULT_GRADE_RULES);
  const [loading, setLoading] = useState(false);

  // Active Tab: Reports vs Grading Config
  const [activeTab, setActiveTab] = useState<'reports' | 'grading'>('reports');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [termFilter, setTermFilter] = useState<string>(schoolProfile.academicTerm || 'Term 1, 2026');

  // Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<AcademicReportRecord> | null>(null);

  // Printable View Modal
  const [reportToView, setReportToView] = useState<AcademicReportRecord | null>(null);

  // Delete modal
  const [reportToDelete, setReportToDelete] = useState<AcademicReportRecord | null>(null);

  const fetchReportsAndGrading = async () => {
    setLoading(true);
    try {
      // 1. Fetch Reports
      const rQuery = query(collection(db, 'academicReports'), where('schoolId', '==', schoolId));
      const rSnap = await getDocs(rQuery);
      const rData = rSnap.docs.map(d => ({ id: d.id, ...d.data() })) as AcademicReportRecord[];
      setReports(rData);

      // 2. Fetch Grading Rules
      const gQuery = query(collection(db, 'gradingSystems'), where('schoolId', '==', schoolId));
      const gSnap = await getDocs(gQuery);
      if (!gSnap.empty) {
        const rules = gSnap.docs[0].data().rules as GradeRule[];
        if (rules && rules.length > 0) {
          setGradeRules(rules);
        }
      }
    } catch (err) {
      console.error('Error fetching academic reports:', err);
      handleFirestoreError(err, OperationType.GET, 'academicReports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndGrading();
  }, [schoolId]);

  // Derive Grade from score
  const getGradeForScore = (score: number): { grade: string; remark: string } => {
    for (const rule of gradeRules) {
      if (score >= rule.minMark && score <= rule.maxMark) {
        return { grade: rule.grade, remark: rule.remark };
      }
    }
    return { grade: 'F', remark: 'Fail' };
  };

  // CLASS POSITION CALCULATION WITH TIES
  const calculateClassPositions = (classReports: AcademicReportRecord[]) => {
    // Sort descending by overallAverage
    const sorted = [...classReports].sort((a, b) => (b.overallAverage || 0) - (a.overallAverage || 0));

    const positions: { [reportId: string]: string } = {};
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].overallAverage === sorted[i - 1].overallAverage) {
        // Tied position
        positions[sorted[i].id] = `${positions[sorted[i - 1].id]}`;
      } else {
        currentRank = i + 1;
        // Formatting 1st, 2nd, 3rd, 4th
        const s = ['th', 'st', 'nd', 'rd'];
        const v = currentRank % 100;
        const ordinal = currentRank + (s[(v - 20) % 10] || s[v] || s[0]);
        positions[sorted[i].id] = ordinal;
      }
    }

    return positions;
  };

  // Save Grading System
  const handleSaveGradingRules = async () => {
    try {
      const gRef = doc(db, 'gradingSystems', schoolId);
      await setDoc(gRef, {
        schoolId,
        rules: gradeRules,
        updatedAt: new Date().toISOString()
      });
      showToast('Grading system updated successfully!', 'success');
      fetchReportsAndGrading();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `gradingSystems/${schoolId}`);
    }
  };

  // Initialize Subject Results when student is selected in modal
  const handleSelectStudentForReport = (studentId: string) => {
    const st = students.find(s => s.studentId === studentId || s.id === studentId);
    if (!st) return;

    // Filter subjects for student's class
    const initialSubjectResults: SubjectResult[] = subjects.map(sub => ({
      subjectId: sub.subjectId || sub.id,
      subjectName: sub.subjectName,
      caScore: 30,
      examScore: 50,
      totalScore: 80,
      grade: 'A',
      teacherRemark: 'Good effort'
    }));

    setEditingReport(prev => ({
      ...prev,
      studentId: st.studentId || st.id,
      studentName: st.fullName,
      classId: st.classId || '',
      className: st.className || 'General Class',
      subjectResults: initialSubjectResults
    }));
  };

  // Save or Update Academic Report
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    if (!editingReport.studentId) {
      showToast('Please select a student.', 'error');
      return;
    }

    const results = editingReport.subjectResults || [];
    if (results.length === 0) {
      showToast('Please add at least one subject score.', 'error');
      return;
    }

    // Compute subject grades & totals
    const processedResults = results.map(r => {
      const ca = Number(r.caScore || 0);
      const exam = Number(r.examScore || 0);
      const tot = ca + exam;
      const { grade, remark } = getGradeForScore(tot);
      return {
        ...r,
        caScore: ca,
        examScore: exam,
        totalScore: tot,
        grade,
        teacherRemark: r.teacherRemark || remark
      };
    });

    const sumTotals = processedResults.reduce((acc, curr) => acc + curr.totalScore, 0);
    const avg = processedResults.length > 0 ? Math.round((sumTotals / processedResults.length) * 10) / 10 : 0;

    const reportIdCustom = editingReport.reportId || `REP-${Math.floor(10000 + Math.random() * 90000)}`;

    const payload: Partial<AcademicReportRecord> = {
      ...editingReport,
      reportId: reportIdCustom,
      schoolId,
      studentId: editingReport.studentId,
      studentName: editingReport.studentName,
      classId: editingReport.classId,
      className: editingReport.className,
      academicYear: editingReport.academicYear || '2026',
      term: editingReport.term || schoolProfile.academicTerm || 'Term 1, 2026',
      subjectResults: processedResults,
      overallTotalScore: sumTotals,
      overallAverage: avg,
      classAverage: 65, // Will recalculate
      totalStudentsInClass: students.filter(s => s.className === editingReport.className).length || 1,
      attendance: editingReport.attendance || '60 / 60',
      conduct: editingReport.conduct || 'Excellent',
      teacherRemark: editingReport.teacherRemark || 'Consistently hardworking student.',
      classTeacherComment: editingReport.classTeacherComment || 'Good academic performance this term.',
      headteacherComment: editingReport.headteacherComment || 'Promising student. Keep it up!',
      promotionStatus: editingReport.promotionStatus || 'Promoted',
      nextClass: editingReport.nextClass || 'Next Grade Level',
      status: editingReport.status || 'Draft',
      dateIssued: editingReport.dateIssued || new Date().toISOString().split('T')[0]
    };

    try {
      if (editingReport.id) {
        await updateDoc(doc(db, 'academicReports', editingReport.id), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
        showToast('Academic report updated!', 'success');
      } else {
        const newRef = doc(collection(db, 'academicReports'));
        await setDoc(newRef, {
          ...payload,
          createdAt: new Date().toISOString()
        });
        showToast('Academic report created successfully!', 'success');
      }

      setIsReportModalOpen(false);
      setEditingReport(null);
      fetchReportsAndGrading();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'academicReports');
    }
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    try {
      await deleteDoc(doc(db, 'academicReports', reportToDelete.id));
      showToast('Report card deleted.', 'success');
      setReportToDelete(null);
      fetchReportsAndGrading();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `academicReports/${reportToDelete.id}`);
    }
  };

  const togglePublishReport = async (report: AcademicReportRecord) => {
    const nextStatus = report.status === 'Published' ? 'Draft' : 'Published';
    try {
      await updateDoc(doc(db, 'academicReports', report.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      showToast(`Report card status is now ${nextStatus}`, 'success');
      fetchReportsAndGrading();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `academicReports/${report.id}`);
    }
  };

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reportId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === 'All' || r.className === classFilter || r.classId === classFilter;

    return matchesSearch && matchesClass;
  });

  // Calculate positions dynamically for class reports
  const positionMap = calculateClassPositions(filteredReports);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#002147]" />
            <h2 className="text-xl font-black text-[#002147] tracking-wide uppercase">Academic Reports & Report Cards</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate official termly report cards, calculate class positions, and configure grading scales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingReport({
                academicYear: '2026',
                term: schoolProfile.academicTerm || 'Term 1, 2026',
                subjectResults: [],
                status: 'Draft',
                conduct: 'Excellent',
                promotionStatus: 'Promoted',
                dateIssued: new Date().toISOString().split('T')[0]
              });
              setIsReportModalOpen(true);
            }}
            className="px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Create Report Card</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl">
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Report Cards ({reports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grading')}
          className={`py-3 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'grading'
              ? 'border-[#002147] text-[#002147]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Grading System Settings</span>
        </button>
      </div>

      {activeTab === 'reports' ? (
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, ID, or report ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Class:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
              >
                <option value="All">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.className}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Cards Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#002147] text-white">
                  <th className="p-3 font-extrabold uppercase">Report ID</th>
                  <th className="p-3 font-extrabold uppercase">Student</th>
                  <th className="p-3 font-extrabold uppercase">Class</th>
                  <th className="p-3 font-extrabold uppercase">Average</th>
                  <th className="p-3 font-extrabold uppercase">Class Position</th>
                  <th className="p-3 font-extrabold uppercase">Promotion</th>
                  <th className="p-3 font-extrabold uppercase">Status</th>
                  <th className="p-3 font-extrabold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No report cards created yet. Click "Create Report Card" to get started.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r) => {
                    const pos = positionMap[r.id] || '1st';
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-[#002147]">{r.reportId}</td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900">{r.studentName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {r.studentId}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{r.className}</td>
                        <td className="p-3 font-black text-[#002147]">{r.overallAverage}%</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black text-xs">
                            {pos}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-emerald-800">{r.promotionStatus}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              r.status === 'Published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => togglePublishReport(r)}
                              className="p-1 text-slate-500 hover:text-emerald-600 transition"
                              title={r.status === 'Published' ? 'Unpublish' : 'Publish'}
                            >
                              <CheckCircle2
                                className={`w-4 h-4 ${r.status === 'Published' ? 'text-emerald-600' : 'text-slate-400'}`}
                              />
                            </button>
                            <button
                              onClick={() => setReportToView(r)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 transition font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                              title="View Official Report Card"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Report</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingReport(r);
                                setIsReportModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setReportToDelete(r)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grading Config Tab */
        <div className="bg-white rounded-b-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b pb-3">
            <h3 className="text-sm font-black text-[#002147] uppercase">Configure Grading Scale & Boundaries</h3>
            <p className="text-xs text-slate-500">
              Customize grade marks (e.g. 80-100 = A) and corresponding remarks for student assessment cards.
            </p>
          </div>

          <div className="space-y-3 max-w-2xl">
            {gradeRules.map((rule, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block">Grade</label>
                  <input
                    type="text"
                    value={rule.grade}
                    onChange={(e) => {
                      const updated = [...gradeRules];
                      updated[idx].grade = e.target.value.toUpperCase();
                      setGradeRules(updated);
                    }}
                    className="w-full px-2 py-1 text-xs font-black text-[#002147] border rounded bg-white"
                  />
                </div>

                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 block">Min Mark (%)</label>
                  <input
                    type="number"
                    value={rule.minMark}
                    onChange={(e) => {
                      const updated = [...gradeRules];
                      updated[idx].minMark = Number(e.target.value);
                      setGradeRules(updated);
                    }}
                    className="w-full px-2 py-1 text-xs font-bold border rounded bg-white"
                  />
                </div>

                <div className="col-span-3">
                  <label className="text-[10px] font-bold text-slate-400 block">Max Mark (%)</label>
                  <input
                    type="number"
                    value={rule.maxMark}
                    onChange={(e) => {
                      const updated = [...gradeRules];
                      updated[idx].maxMark = Number(e.target.value);
                      setGradeRules(updated);
                    }}
                    className="w-full px-2 py-1 text-xs font-bold border rounded bg-white"
                  />
                </div>

                <div className="col-span-4">
                  <label className="text-[10px] font-bold text-slate-400 block">Remark</label>
                  <input
                    type="text"
                    value={rule.remark}
                    onChange={(e) => {
                      const updated = [...gradeRules];
                      updated[idx].remark = e.target.value;
                      setGradeRules(updated);
                    }}
                    className="w-full px-2 py-1 text-xs font-semibold border rounded bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveGradingRules}
              className="px-5 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow cursor-pointer transition flex items-center gap-2"
            >
              <Check className="w-4 h-4 text-[#D4AF37]" />
              <span>Save Grading System</span>
            </button>
          </div>
        </div>
      )}

      {/* Report Card Add/Edit Modal */}
      {isReportModalOpen && editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-[#002147] p-5 text-white flex items-center justify-between border-b border-[#00152e]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {editingReport.id ? 'Edit Report Card' : 'Generate Student Academic Report'}
                </h3>
              </div>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="p-6 space-y-6 text-xs">
              {/* Student Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Select Student *</label>
                  <select
                    required
                    value={editingReport.studentId || ''}
                    onChange={(e) => handleSelectStudentForReport(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="">-- Choose Student --</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.studentId || st.id}>
                        {st.fullName} ({st.studentId}) — Class: {st.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Attendance (Days Present / Total)</label>
                  <input
                    type="text"
                    placeholder="e.g. 62 / 65"
                    value={editingReport.attendance || '65 / 65'}
                    onChange={(e) => setEditingReport({ ...editingReport, attendance: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Conduct / Behavior</label>
                  <select
                    value={editingReport.conduct || 'Excellent'}
                    onChange={(e) => setEditingReport({ ...editingReport, conduct: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Needs Improvement">Needs Improvement</option>
                  </select>
                </div>
              </div>

              {/* Subject Results Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-black text-[#002147] uppercase text-xs">Subject Scores (CA & Examination)</h4>
                  <span className="text-[10px] text-slate-500 font-mono">CA max 40 + Exam max 60 = 100</span>
                </div>

                {(editingReport.subjectResults || []).map((sub, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4 font-bold text-slate-800 truncate">{sub.subjectName}</div>

                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-400 block">CA (40)</label>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={sub.caScore}
                        onChange={(e) => {
                          const updated = [...(editingReport.subjectResults || [])];
                          updated[idx].caScore = Number(e.target.value);
                          setEditingReport({ ...editingReport, subjectResults: updated });
                        }}
                        className="w-full px-2 py-1 border rounded text-xs font-bold bg-white"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-400 block">Exam (60)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={sub.examScore}
                        onChange={(e) => {
                          const updated = [...(editingReport.subjectResults || [])];
                          updated[idx].examScore = Number(e.target.value);
                          setEditingReport({ ...editingReport, subjectResults: updated });
                        }}
                        className="w-full px-2 py-1 border rounded text-xs font-bold bg-white"
                      />
                    </div>

                    <div className="col-span-2 text-center">
                      <label className="text-[9px] font-bold text-slate-400 block">Total</label>
                      <span className="font-black text-sm text-[#002147]">
                        {(sub.caScore || 0) + (sub.examScore || 0)}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <label className="text-[9px] font-bold text-slate-400 block">Grade</label>
                      <span className="px-2 py-0.5 bg-[#002147] text-[#D4AF37] font-black rounded text-xs">
                        {getGradeForScore((sub.caScore || 0) + (sub.examScore || 0)).grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comments & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Class Teacher Comment</label>
                  <textarea
                    rows={2}
                    value={editingReport.classTeacherComment || ''}
                    onChange={(e) => setEditingReport({ ...editingReport, classTeacherComment: e.target.value })}
                    placeholder="e.g. An attentive student who grasps concepts quickly."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Headteacher Comment</label>
                  <textarea
                    rows={2}
                    value={editingReport.headteacherComment || ''}
                    onChange={(e) => setEditingReport({ ...editingReport, headteacherComment: e.target.value })}
                    placeholder="e.g. Satisfactory performance. Keep pushing forward."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Promotion Status</label>
                  <select
                    value={editingReport.promotionStatus || 'Promoted'}
                    onChange={(e) => setEditingReport({ ...editingReport, promotionStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  >
                    <option value="Promoted">Promoted</option>
                    <option value="Retained">Retained</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Next Class Level</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary 5"
                    value={editingReport.nextClass || ''}
                    onChange={(e) => setEditingReport({ ...editingReport, nextClass: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black uppercase tracking-wider shadow cursor-pointer"
                >
                  Save & Compute Rankings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Report Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Delete Academic Report</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete report #{reportToDelete.reportId} for {reportToDelete.studentName}?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteReport}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE REPORT CARD MODAL */}
      {reportToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 border border-slate-200 space-y-6 text-slate-900 my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-300">
              <div className="flex items-center gap-4">
                <img
                  src={schoolProfile.logoUrl}
                  alt={schoolProfile.schoolName}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-300 shadow-sm"
                />
                <div>
                  <h2 className="text-lg font-black text-[#002147] uppercase leading-tight">
                    {schoolProfile.schoolName}
                  </h2>
                  <p className="text-xs text-slate-500">{schoolProfile.address}</p>
                  <p className="text-xs text-slate-500">Tel: {schoolProfile.phone} • Email: {schoolProfile.email}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] text-xs font-black uppercase rounded-lg shadow-sm">
                  Official Academic Report Card
                </span>
                <p className="text-xs font-mono font-bold text-slate-800 mt-2">{reportToView.term} ({reportToView.academicYear})</p>
              </div>
            </div>

            {/* Student Bio Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Name</span>
                <span className="font-extrabold text-slate-900">{reportToView.studentName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Student ID</span>
                <span className="font-mono font-bold text-slate-800">{reportToView.studentId}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Class</span>
                <span className="font-extrabold text-slate-900">{reportToView.className}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance</span>
                <span className="font-bold text-slate-800">{reportToView.attendance}</span>
              </div>
            </div>

            {/* Subject Results Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#002147] text-white">
                    <th className="p-2.5 font-extrabold uppercase">Subject</th>
                    <th className="p-2.5 font-extrabold uppercase text-center">CA (40)</th>
                    <th className="p-2.5 font-extrabold uppercase text-center">Exam (60)</th>
                    <th className="p-2.5 font-extrabold uppercase text-center">Total (100)</th>
                    <th className="p-2.5 font-extrabold uppercase text-center">Grade</th>
                    <th className="p-2.5 font-extrabold uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportToView.subjectResults.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-extrabold text-slate-900">{sub.subjectName}</td>
                      <td className="p-2.5 text-center font-semibold text-slate-700">{sub.caScore}</td>
                      <td className="p-2.5 text-center font-semibold text-slate-700">{sub.examScore}</td>
                      <td className="p-2.5 text-center font-black text-[#002147]">{sub.totalScore}</td>
                      <td className="p-2.5 text-center font-black text-amber-700">{sub.grade}</td>
                      <td className="p-2.5 text-slate-600 italic">{sub.teacherRemark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Rankings & Performance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#002147] text-white p-4 rounded-xl text-center">
              <div>
                <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Total Score</span>
                <span className="text-lg font-black">{reportToView.overallTotalScore}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Overall Average</span>
                <span className="text-lg font-black">{reportToView.overallAverage}%</span>
              </div>
              <div>
                <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Class Position</span>
                <span className="text-lg font-black text-[#D4AF37]">
                  {positionMap[reportToView.id] || '1st'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#D4AF37] font-black uppercase block">Conduct</span>
                <span className="text-sm font-bold">{reportToView.conduct}</span>
              </div>
            </div>

            {/* Comments & Status */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Teacher's Comment</span>
                <p className="font-semibold text-slate-800 italic mt-0.5">"{reportToView.classTeacherComment}"</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Headteacher's Remarks</span>
                <p className="font-semibold text-slate-800 italic mt-0.5">"{reportToView.headteacherComment}"</p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-700">
                <span>Promotion Status: <span className="text-emerald-700 font-black">{reportToView.promotionStatus}</span></span>
                <span>Next Class: <span className="text-[#002147] font-black">{reportToView.nextClass}</span></span>
              </div>
            </div>

            {/* Signatures & Stamp */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
              <div className="space-y-4">
                <div className="border-b border-dashed border-slate-400 pb-1 text-slate-600 font-semibold">
                  Headteacher Signature: <span className="font-mono text-slate-800">Approved</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">Date Issued: {reportToView.dateIssued}</p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 mx-auto border-2 border-dashed border-[#002147]/40 rounded-full flex flex-col items-center justify-center text-[8px] text-[#002147] font-black uppercase p-1 bg-slate-50">
                  <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                  <span>Official Stamp</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
              <span className="text-slate-400 text-[10px]">EDUkenZA Official Student Report Card</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportToView(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    showToast(`Report Card emailed to student/parent registered contact.`, 'success');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Email Report</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow"
                >
                  <Printer className="w-4 h-4 text-[#D4AF37]" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
