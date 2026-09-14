import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  Calculator, 
  Search, 
  CheckCircle2, 
  Award, 
  RefreshCw, 
  Send, 
  ShieldCheck,
  AlertCircle,
  History,
  MessageSquare,
  Clock,
  XCircle,
  X
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherScoreEntryProps {
  schoolId: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  students: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setActiveTab?: (tab: string) => void;
}

export interface StudentScoreRecord {
  studentId: string;
  studentName: string;
  caScore: number;         // Max 20
  assignmentScore: number; // Max 10
  midtermScore: number;    // Max 20
  practicalScore: number;  // Max 10
  examScore: number;       // Max 40
  totalScore: number;      // Auto-calculated max 100
  grade: string;           // Auto-calculated
}

export interface SubjectResultDoc {
  id?: string;
  schoolId: string;
  className: string;
  subjectName: string;
  term: string;
  academicYear: string;
  teacherId: string;
  teacherName: string;
  scores: StudentScoreRecord[];
  submissionStatus: 'Draft' | 'Submitted for Approval' | 'Approved' | 'Rejected' | 'Published';
  rejectionReason?: string;
  reviewComments?: string;
  submittedAt?: any;
  approvedAt?: any;
  rejectedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export const TeacherScoreEntry: React.FC<TeacherScoreEntryProps> = ({
  schoolId,
  assignedClasses,
  assignedSubjects,
  students,
  currentUser,
  showToast,
  setActiveTab
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(
    assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || ''
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(
    assignedSubjects[0]?.name || assignedSubjects[0]?.subjectName || assignedSubjects[0] || ''
  );
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState('2026');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'Draft' | 'Submitted for Approval' | 'Approved' | 'Rejected' | 'Published'>('Draft');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [resultDocData, setResultDocData] = useState<SubjectResultDoc | null>(null);

  // Map student scores
  const [scoresMap, setScoresMap] = useState<Record<string, StudentScoreRecord>>({});

  // Get class roster
  const classStudents = students.filter(s => 
    s.className === selectedClass || s.classId === selectedClass || s.gradeLevel === selectedClass
  );

  // Auto-calculate grade from total score
  const calculateGrade = (total: number): string => {
    if (total >= 80) return 'A (Distinction)';
    if (total >= 70) return 'B (Merit)';
    if (total >= 60) return 'C (Credit)';
    if (total >= 50) return 'D (Pass)';
    return 'F (Fail)';
  };

  // Real-time listener for current class & subject scores
  useEffect(() => {
    if (!schoolId || !selectedClass || !selectedSubject) return;
    setLoading(true);

    const docId = `${schoolId}_${selectedClass.replace(/\s+/g, '_')}_${selectedSubject.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}_${academicYear}`;
    const docRef = doc(db, 'subjectResults', docId);

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const foundData = docSnap.data() as SubjectResultDoc;
        setResultDocData(foundData);
        setSubmissionStatus(foundData.submissionStatus || 'Draft');
        setRejectionReason(foundData.rejectionReason || foundData.reviewComments || '');

        const map: Record<string, StudentScoreRecord> = {};
        if (Array.isArray(foundData.scores)) {
          foundData.scores.forEach(s => {
            map[s.studentId] = s;
          });
        }
        setScoresMap(map);
      } else {
        setResultDocData(null);
        setSubmissionStatus('Draft');
        setRejectionReason('');

        const initialMap: Record<string, StudentScoreRecord> = {};
        classStudents.forEach(st => {
          const id = st.id || st.studentId;
          initialMap[id] = {
            studentId: id,
            studentName: st.name || st.fullName || 'Student',
            caScore: 0,
            assignmentScore: 0,
            midtermScore: 0,
            practicalScore: 0,
            examScore: 0,
            totalScore: 0,
            grade: 'F (Fail)'
          };
        });
        setScoresMap(initialMap);
      }
      setLoading(false);
    }, (err) => {
      console.error("Real-time score listener error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, selectedClass, selectedSubject, term, academicYear]);

  // Handle Score Input Change
  const handleScoreChange = (
    studentId: string, 
    field: 'caScore' | 'assignmentScore' | 'midtermScore' | 'practicalScore' | 'examScore', 
    val: number
  ) => {
    if (submissionStatus === 'Approved' || submissionStatus === 'Published') {
      showToast("Approved/Published results are locked. Contact admin to reopen.", "error");
      return;
    }

    setScoresMap(prev => {
      const existing = prev[studentId] || {
        studentId,
        studentName: classStudents.find(s => (s.id || s.studentId) === studentId)?.name || 'Student',
        caScore: 0,
        assignmentScore: 0,
        midtermScore: 0,
        practicalScore: 0,
        examScore: 0,
        totalScore: 0,
        grade: 'F (Fail)'
      };

      const updated = {
        ...existing,
        [field]: val
      };

      // Auto calculate total
      const ca = Number(updated.caScore) || 0;
      const ass = Number(updated.assignmentScore) || 0;
      const mid = Number(updated.midtermScore) || 0;
      const prac = Number(updated.practicalScore) || 0;
      const ex = Number(updated.examScore) || 0;

      const total = ca + ass + mid + prac + ex;
      updated.totalScore = Math.min(100, Math.max(0, total));
      updated.grade = calculateGrade(updated.totalScore);

      return {
        ...prev,
        [studentId]: updated
      };
    });
  };

  // Save Draft Scores
  const handleSaveDraft = async () => {
    if (!selectedClass || !selectedSubject) return;
    if (submissionStatus === 'Approved' || submissionStatus === 'Published') {
      showToast("These results have been approved/published by Admin and cannot be modified.", "error");
      return;
    }

    setSaving(true);
    try {
      const docId = `${schoolId}_${selectedClass.replace(/\s+/g, '_')}_${selectedSubject.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}_${academicYear}`;
      const scoresArray = classStudents.map(st => {
        const id = st.id || st.studentId;
        return scoresMap[id] || {
          studentId: id,
          studentName: st.name || st.fullName || 'Student',
          caScore: 0,
          assignmentScore: 0,
          midtermScore: 0,
          practicalScore: 0,
          examScore: 0,
          totalScore: 0,
          grade: 'F (Fail)'
        };
      });

      const payload: SubjectResultDoc = {
        schoolId,
        className: selectedClass,
        subjectName: selectedSubject,
        term,
        academicYear,
        teacherId: currentUser?.uid || '',
        teacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        scores: scoresArray,
        submissionStatus: submissionStatus === 'Submitted for Approval' ? 'Submitted for Approval' : 'Draft',
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'subjectResults', docId), payload, { merge: true });
      showToast("Draft scores saved successfully!", "success");
    } catch (err) {
      console.error("Save draft scores error:", err);
      showToast("Failed to save draft scores", "error");
    } finally {
      setSaving(false);
    }
  };

  // Submit for Admin Approval directly
  const handleSubmitForApproval = async () => {
    if (!selectedClass || !selectedSubject) return;
    if (classStudents.length === 0) {
      showToast("No students in selected class to submit scores for.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const docId = `${schoolId}_${selectedClass.replace(/\s+/g, '_')}_${selectedSubject.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}_${academicYear}`;
      const scoresArray = classStudents.map(st => {
        const id = st.id || st.studentId;
        return scoresMap[id] || {
          studentId: id,
          studentName: st.name || st.fullName || 'Student',
          caScore: 0,
          assignmentScore: 0,
          midtermScore: 0,
          practicalScore: 0,
          examScore: 0,
          totalScore: 0,
          grade: 'F (Fail)'
        };
      });

      const payload: SubjectResultDoc = {
        schoolId,
        className: selectedClass,
        subjectName: selectedSubject,
        term,
        academicYear,
        teacherId: currentUser?.uid || '',
        teacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        scores: scoresArray,
        submissionStatus: 'Submitted for Approval',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'subjectResults', docId), payload, { merge: true });

      // Also create sync record in resultApprovals
      await setDoc(doc(db, 'resultApprovals', docId), {
        id: docId,
        schoolId,
        classId: selectedClass,
        className: selectedClass,
        subjectId: selectedSubject,
        subjectName: selectedSubject,
        teacherId: currentUser?.uid || 'teacher-1',
        teacherName: currentUser?.fullName || currentUser?.name || 'Subject Educator',
        academicYear,
        term,
        status: 'Submitted',
        scores: scoresArray.map(s => ({
          studentId: s.studentId,
          studentName: s.studentName,
          score: s.totalScore,
          grade: s.grade,
          remarks: s.grade.includes('A') ? 'Excellent' : s.grade.includes('B') ? 'Very Good' : 'Pass'
        })),
        submittedAt: new Date().toISOString()
      }, { merge: true });

      showToast(`Results for ${selectedSubject} (${selectedClass}) submitted to School Admin for approval!`, "success");
    } catch (err) {
      console.error("Submit for approval error:", err);
      showToast("Failed to submit result sheet for approval", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Academic Score Entry & Grade Calculator</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Enter continuous assessments, assignments, midterm, practicals, and examination scores for assigned classes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {resultDocData && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-white/20 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Audit Trail</span>
            </button>
          )}

          <button
            onClick={handleSaveDraft}
            disabled={saving || classStudents.length === 0 || submissionStatus === 'Approved' || submissionStatus === 'Published'}
            className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 disabled:opacity-50 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handleSubmitForApproval}
            disabled={submitting || classStudents.length === 0 || submissionStatus === 'Approved' || submissionStatus === 'Published'}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4 text-emerald-200" />
            <span>{submitting ? 'Submitting...' : submissionStatus === 'Rejected' ? 'Resubmit for Approval' : 'Submit for Approval'}</span>
          </button>
        </div>
      </div>

      {/* REJECTION ALERT BANNER */}
      {submissionStatus === 'Rejected' && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 shadow-sm space-y-2 border">
          <div className="flex items-center gap-2 text-red-900 font-black text-sm">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>Result Submission Rejected by School Admin</span>
          </div>
          <p className="text-xs font-semibold text-red-800 pl-7">
            <strong>Admin Review Feedback:</strong> "{rejectionReason || 'Please verify scores and re-check student exam records before resubmitting.'}"
          </p>
          <div className="pl-7 pt-1 flex items-center gap-2 text-[11px] font-bold text-red-700">
            <span>Action Required: Update the scores below and click <strong>"Resubmit for Approval"</strong> when complete.</span>
          </div>
        </div>
      )}

      {/* CLASS & SUBJECT SELECTORS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
            >
              {assignedClasses.map((c, i) => (
                <option key={i} value={c.name || c.className || c}>
                  Class: {c.name || c.className || c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Subject</label>
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
            >
              {assignedSubjects.map((s, i) => (
                <option key={i} value={s.name || s.subjectName || s}>
                  Subject: {s.name || s.subjectName || s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Term</label>
            <select
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Year</label>
            <select
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
            >
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Sheet Status:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
            submissionStatus === 'Approved' || submissionStatus === 'Published'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : (submissionStatus as string) === 'Submitted for Approval' || (submissionStatus as string) === 'Submitted'
              ? 'bg-blue-100 text-blue-800 border border-blue-300'
              : submissionStatus === 'Rejected'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {submissionStatus}
          </span>
        </div>
      </div>

      {/* SCORE TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading real-time score sheet...</p>
          </div>
        ) : classStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No enrolled students found for {selectedClass}. Contact Admin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[#002147] font-black border-b border-slate-200">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5 text-center">CA (20)</th>
                  <th className="p-3.5 text-center">Assignment (10)</th>
                  <th className="p-3.5 text-center">Midterm (20)</th>
                  <th className="p-3.5 text-center">Practical (10)</th>
                  <th className="p-3.5 text-center">Exam (40)</th>
                  <th className="p-3.5 text-center font-black text-[#002147]">Total (100)</th>
                  <th className="p-3.5 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st, i) => {
                  const id = st.id || st.studentId;
                  const scoreRec = scoresMap[id] || {
                    studentId: id,
                    studentName: st.name || st.fullName || 'Student',
                    caScore: 0,
                    assignmentScore: 0,
                    midtermScore: 0,
                    practicalScore: 0,
                    examScore: 0,
                    totalScore: 0,
                    grade: 'F (Fail)'
                  };

                  const isLocked = submissionStatus === 'Approved' || submissionStatus === 'Published';

                  return (
                    <tr key={id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-400">{i + 1}</td>
                      <td className="p-3.5 font-extrabold text-slate-800">
                        {st.name || st.fullName}
                        <span className="block text-[10px] text-slate-400 font-mono font-normal">
                          {id}
                        </span>
                      </td>

                      {/* CA */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          disabled={isLocked}
                          value={scoreRec.caScore}
                          onChange={e => handleScoreChange(id, 'caScore', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-[#002147] disabled:bg-slate-100"
                        />
                      </td>

                      {/* Assignment */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          disabled={isLocked}
                          value={scoreRec.assignmentScore}
                          onChange={e => handleScoreChange(id, 'assignmentScore', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-[#002147] disabled:bg-slate-100"
                        />
                      </td>

                      {/* Midterm */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          disabled={isLocked}
                          value={scoreRec.midtermScore}
                          onChange={e => handleScoreChange(id, 'midtermScore', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-[#002147] disabled:bg-slate-100"
                        />
                      </td>

                      {/* Practical */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          disabled={isLocked}
                          value={scoreRec.practicalScore}
                          onChange={e => handleScoreChange(id, 'practicalScore', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-[#002147] disabled:bg-slate-100"
                        />
                      </td>

                      {/* Exam */}
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          disabled={isLocked}
                          value={scoreRec.examScore}
                          onChange={e => handleScoreChange(id, 'examScore', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-[#002147] disabled:bg-slate-100"
                        />
                      </td>

                      {/* Total */}
                      <td className="p-3.5 text-center font-black text-sm text-[#002147]">
                        {scoreRec.totalScore}
                      </td>

                      {/* Grade */}
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          scoreRec.totalScore >= 80 ? 'bg-emerald-100 text-emerald-800' :
                          scoreRec.totalScore >= 70 ? 'bg-blue-100 text-blue-800' :
                          scoreRec.totalScore >= 50 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {scoreRec.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AUDIT TRAIL MODAL */}
      {showHistoryModal && resultDocData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 text-slate-900">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#002147]" />
                <h3 className="font-black text-base text-[#002147]">Result Sheet History & Audit Log</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Class & Subject</span>
                <p className="font-black text-sm text-[#002147]">{resultDocData.className} — {resultDocData.subjectName}</p>
                <p className="text-slate-500 text-[11px]">{resultDocData.term} • {resultDocData.academicYear}</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-700 text-xs block">Workflow Audit Trail:</span>
                
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1">
                  <div className="flex justify-between font-bold text-blue-900">
                    <span>Status: {resultDocData.submissionStatus}</span>
                    <span className="font-mono text-[10px] text-blue-700">Live Status</span>
                  </div>
                  {resultDocData.teacherName && (
                    <p className="text-[11px] text-blue-800">Assigned Educator: {resultDocData.teacherName}</p>
                  )}
                  {resultDocData.rejectionReason && (
                    <div className="pt-2 border-t border-blue-200 text-red-700">
                      <strong>Rejection Feedback:</strong> "{resultDocData.rejectionReason}"
                    </div>
                  )}
                  {resultDocData.reviewComments && (
                    <div className="pt-2 border-t border-blue-200 text-emerald-800">
                      <strong>Admin Approval Comments:</strong> "{resultDocData.reviewComments}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-[#002147] text-white font-bold text-xs cursor-pointer shadow"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
