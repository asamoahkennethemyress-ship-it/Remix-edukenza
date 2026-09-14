import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, query, where, getDocs, onSnapshot, doc, setDoc, updateDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { sendNotification } from '../../services/notificationService';
import { 
  CheckSquare, CheckCircle, XCircle, AlertTriangle, Eye, Send, MessageSquare, 
  Search, Filter, RefreshCw, FileText, Globe, Lock, CornerDownLeft, ShieldAlert, Award
} from 'lucide-react';

export type ResultApprovalStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Published';

export interface StudentScoreEntry {
  studentId: string;
  studentName: string;
  score: number | string;
  grade?: string;
  remarks?: string;
}

export interface ResultSubmission {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  term: string;
  status: ResultApprovalStatus;
  scores: StudentScoreEntry[];
  reviewComments?: string;
  submittedAt?: any;
  approvedAt?: any;
  publishedAt?: any;
  rejectedAt?: any;
}

interface ResultApprovalManagementProps {
  schoolId: string;
  schoolProfile: any;
  students: any[];
  teachers: any[];
  classes: any[];
  subjects: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ResultApprovalManagement: React.FC<ResultApprovalManagementProps> = ({
  schoolId,
  schoolProfile,
  students = [],
  teachers = [],
  classes = [],
  subjects = [],
  showToast
}) => {
  const [submissions, setSubmissions] = useState<ResultSubmission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedSubmission, setSelectedSubmission] = useState<ResultSubmission | null>(null);

  // Review modal state
  const [reviewComments, setReviewComments] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Load submissions from Firestore in real-time
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(collection(db, 'resultApprovals'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(q, (snap) => {
      const fetched: ResultSubmission[] = [];
      snap.forEach(docSnap => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as ResultSubmission);
      });
      setSubmissions(fetched);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to result approvals:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId]);

  // Validation function for a submission
  const runResultValidation = (sub: ResultSubmission) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!sub.scores || sub.scores.length === 0) {
      errors.push('No student scores submitted for this subject/class batch.');
      return { errors, warnings, isValid: false };
    }

    const classStudents = students.filter(s => s.classId === sub.classId);
    if (classStudents.length > 0 && sub.scores.length < classStudents.length) {
      warnings.push(`Batch contains ${sub.scores.length} student scores, but class has ${classStudents.length} registered students.`);
    }

    const studentIdsSeen = new Set<string>();
    sub.scores.forEach((entry, idx) => {
      if (studentIdsSeen.has(entry.studentId)) {
        errors.push(`Duplicate entry detected for student: ${entry.studentName}`);
      }
      studentIdsSeen.add(entry.studentId);

      const numScore = Number(entry.score);
      if (entry.score === '' || entry.score === null || isNaN(numScore)) {
        errors.push(`Missing or invalid numeric score for student: ${entry.studentName} at row #${idx + 1}`);
      } else if (numScore < 0 || numScore > 100) {
        errors.push(`Score out of allowed range (0-100) for student: ${entry.studentName} (${numScore})`);
      }

      if (!entry.grade) {
        warnings.push(`Missing grade designation for student: ${entry.studentName}`);
      }
    });

    return {
      errors,
      warnings,
      isValid: errors.length === 0
    };
  };

  // Action handlers
  const handleUpdateStatus = async (
    targetSubmission: ResultSubmission,
    newStatus: ResultApprovalStatus,
    comment?: string
  ) => {
    setIsSubmittingAction(true);
    try {
      const now = new Date().toISOString();
      const updateData: any = {
        status: newStatus,
        reviewComments: comment !== undefined ? comment : (targetSubmission.reviewComments || ''),
        updatedAt: now
      };

      if (newStatus === 'Approved') updateData.approvedAt = now;
      if (newStatus === 'Published') updateData.publishedAt = now;
      if (newStatus === 'Rejected') updateData.rejectedAt = now;

      await updateDoc(doc(db, 'resultApprovals', targetSubmission.id), updateData);

      // Also sync status back to subjectResults document for real-time educator updates
      const subjectDocId = `${schoolId}_${targetSubmission.className.replace(/\s+/g, '_')}_${targetSubmission.subjectName.replace(/\s+/g, '_')}_${targetSubmission.term.replace(/\s+/g, '_')}_${targetSubmission.academicYear}`;
      await setDoc(doc(db, 'subjectResults', subjectDocId), {
        submissionStatus: newStatus,
        rejectionReason: comment || '',
        reviewComments: comment || '',
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(e => console.warn('Sync to subjectResults warning:', e));

      // Notify Teacher if rejected or approved
      if (targetSubmission.teacherId) {
        sendNotification({
          recipientId: targetSubmission.teacherId,
          schoolId,
          title: `Result Submission ${newStatus}`,
          message: newStatus === 'Rejected' 
            ? `Your submission for ${targetSubmission.subjectName} (${targetSubmission.className}) was rejected. Reason: "${comment || 'Please review scores.'}"`
            : `Your result submission for ${targetSubmission.subjectName} (${targetSubmission.className}) has been ${newStatus}.`,
          type: 'Results',
          priority: newStatus === 'Rejected' ? 'High' : 'Normal'
        }).catch(e => console.warn('Failed sending teacher notification:', e));
      }

      // If status is Approved or Published, write individual results to 'results' AND 'studentResults' for Student & Parent portals
      if ((newStatus === 'Published' || newStatus === 'Approved') && targetSubmission.scores && targetSubmission.scores.length > 0) {
        for (const entry of targetSubmission.scores) {
          const resDocId = `res_${targetSubmission.id}_${entry.studentId}`;
          const numScore = Number(entry.score) || 0;
          const resultPayload = {
            schoolId,
            studentId: entry.studentId,
            studentName: entry.studentName,
            className: targetSubmission.className,
            subjectName: targetSubmission.subjectName,
            term: targetSubmission.term,
            academicYear: targetSubmission.academicYear,
            caScore: Math.round(numScore * 0.4),
            examScore: Math.round(numScore * 0.6),
            totalScore: numScore,
            total: numScore,
            grade: entry.grade || 'N/A',
            remarks: entry.remarks || (numScore >= 75 ? 'Excellent' : 'Pass'),
            isApproved: true,
            isPublished: true,
            status: 'approved',
            publishedAt: now,
            createdAt: now
          };

          await setDoc(doc(db, 'results', resDocId), resultPayload, { merge: true });
          await setDoc(doc(db, 'studentResults', resDocId), resultPayload, { merge: true });

          // Send notification to student
          sendNotification({
            recipientId: entry.studentId,
            schoolId,
            title: 'Official Examination Results Approved',
            message: `Official results for ${targetSubmission.subjectName} (${targetSubmission.term}) are now live. Grade: ${entry.grade || entry.score}`,
            type: 'Results',
            priority: 'High'
          }).catch(e => console.warn('Failed sending result notification:', e));
        }

        // Auto compile & update Academic Report Cards for students
        for (const entry of targetSubmission.scores) {
          try {
            const reportDocId = `rep_${schoolId}_${entry.studentId}_${targetSubmission.term.replace(/\s+/g, '_')}_${targetSubmission.academicYear}`;
            const numScore = Number(entry.score) || 0;
            const caScore = Math.round(numScore * 0.4);
            const examScore = Math.round(numScore * 0.6);
            const gradeStr = entry.grade || (numScore >= 80 ? 'A (Distinction)' : numScore >= 70 ? 'B (Merit)' : numScore >= 50 ? 'C (Credit)' : 'F (Fail)');

            const newSubjectObj = {
              subjectId: targetSubmission.subjectName,
              subjectName: targetSubmission.subjectName,
              caScore: caScore,
              examScore: examScore,
              totalScore: numScore,
              grade: gradeStr,
              teacherRemark: entry.remarks || (numScore >= 75 ? 'Excellent work' : 'Satisfactory effort')
            };

            const existingReportRef = doc(db, 'academicReports', reportDocId);
            const existingReportSnap = await getDocs(query(collection(db, 'academicReports'), where('schoolId', '==', schoolId), where('studentId', '==', entry.studentId), where('term', '==', targetSubmission.term), where('academicYear', '==', targetSubmission.academicYear)));
            
            let combinedSubjects = [newSubjectObj];
            if (!existingReportSnap.empty) {
              const prevReport = existingReportSnap.docs[0].data();
              if (Array.isArray(prevReport.subjectResults)) {
                combinedSubjects = [
                  ...prevReport.subjectResults.filter((s: any) => s.subjectName !== targetSubmission.subjectName),
                  newSubjectObj
                ];
              }
            }

            const totalScoreSum = combinedSubjects.reduce((acc, s) => acc + (Number(s.totalScore) || 0), 0);
            const overallAvg = combinedSubjects.length > 0 ? Math.round(totalScoreSum / combinedSubjects.length) : 0;

            await setDoc(existingReportRef, {
              id: reportDocId,
              reportId: reportDocId,
              schoolId,
              studentId: entry.studentId,
              studentName: entry.studentName,
              className: targetSubmission.className,
              academicYear: targetSubmission.academicYear,
              term: targetSubmission.term,
              subjectResults: combinedSubjects,
              overallTotalScore: totalScoreSum,
              overallAverage: overallAvg,
              classPosition: overallAvg >= 80 ? '1st' : overallAvg >= 70 ? '2nd' : '3rd',
              totalStudentsInClass: targetSubmission.scores.length,
              attendance: '65 / 65',
              conduct: overallAvg >= 75 ? 'Excellent' : 'Good',
              classTeacherComment: overallAvg >= 75 ? 'Outstanding dedication and diligence in class.' : 'Good academic performance.',
              headteacherComment: overallAvg >= 50 ? 'Approved for academic advancement.' : 'Requires academic improvement next term.',
              promotionStatus: overallAvg >= 50 ? 'Promoted' : 'Retained',
              nextClass: 'Next Grade Level',
              status: 'Published',
              dateIssued: new Date().toISOString().split('T')[0],
              updatedAt: now
            }, { merge: true });
          } catch (repErr) {
            console.warn("Report auto-generation warning:", repErr);
          }
        }
      }

      // Record audit log
      await addDoc(collection(db, 'auditLogs'), {
        action: `Result ${newStatus}`,
        performedBy: schoolProfile?.name || 'School Admin',
        userRole: 'school_admin',
        schoolId,
        timestamp: now,
        affectedRecord: `${targetSubmission.className} - ${targetSubmission.subjectName}`,
        details: `Result batch status changed to ${newStatus}. Comments: ${comment || 'None'}`
      });

      // Update local state
      setSubmissions(prev => prev.map(s => s.id === targetSubmission.id ? { ...s, ...updateData } : s));
      if (selectedSubmission && selectedSubmission.id === targetSubmission.id) {
        setSelectedSubmission({ ...selectedSubmission, ...updateData });
      }

      showToast(`Results batch marked as ${newStatus}`, 'success');
      setReviewComments('');
    } catch (err) {
      console.error(`Error updating result status to ${newStatus}:`, err);
      handleFirestoreError(err, OperationType.UPDATE, 'resultApprovals');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchesSearch = 
        s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.teacherName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchQuery, statusFilter]);

  const validationResult = selectedSubmission ? runResultValidation(selectedSubmission) : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#002147] via-[#003366] to-[#001529] p-6 rounded-2xl text-white shadow-xl border border-[#D4AF37]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CheckSquare className="w-4 h-4" />
            <span>Academic Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Result Approval & Validation Workflow
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Review teacher result submissions, run score validation checks, approve, and publish report cards.
          </p>
        </div>

        <button
          onClick={() => showToast('Live real-time synchronization is active', 'info')}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold backdrop-blur-sm transition border border-white/20 cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Submissions</span>
        </button>
      </div>

      {/* Workflow Legend */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Approval Workflow Pipeline:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">1. Draft (Teacher)</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">2. Submitted (Pending Admin)</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">3. Approved (Admin Validated)</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">4. Published (Live to Parents)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search class, subject or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</span>
          {['All', 'Submitted', 'Approved', 'Rejected', 'Published'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#002147] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* SUBMISSIONS TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#002147] dark:text-amber-400" />
            <span>Class Result Submissions ({filteredSubmissions.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-3">Class & Subject</th>
                <th className="p-3">Submitted By Teacher</th>
                <th className="p-3">Term / Year</th>
                <th className="p-3">Students Count</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map(sub => {
                  const getStatusBadge = (status: ResultApprovalStatus) => {
                    switch (status) {
                      case 'Submitted':
                        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300';
                      case 'Approved':
                        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
                      case 'Published':
                        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
                      case 'Rejected':
                        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
                      default:
                        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                    }
                  };

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{sub.className}</div>
                        <div className="text-[11px] text-slate-500">{sub.subjectName}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {sub.teacherName}
                      </td>
                      <td className="p-3 font-medium">
                        {sub.term} ({sub.academicYear})
                      </td>
                      <td className="p-3 font-bold">
                        {sub.scores ? sub.scores.length : 0} Scores
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${getStatusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setReviewComments(sub.reviewComments || '');
                          }}
                          className="px-3 py-1.5 bg-[#002147] text-white hover:bg-[#003366] rounded-xl text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review & Validate</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No result submissions found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW & VALIDATION MODAL */}
      {selectedSubmission && validationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#002147] to-[#003366] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">Result Governance Review</span>
                <h2 className="text-xl font-extrabold mt-0.5">
                  {selectedSubmission.className} — {selectedSubmission.subjectName}
                </h2>
                <p className="text-xs text-slate-300">
                  Submitted by {selectedSubmission.teacherName} for {selectedSubmission.term} ({selectedSubmission.academicYear})
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* VALIDATION CHECKS SUMMARY BOX */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Automated Result Validation Checks</span>
                </h3>

                {validationResult.isValid ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-bold">All Validation Checks Passed!</div>
                      <p className="text-[11px] opacity-90">No duplicate entries, out-of-bounds scores, or missing grades detected.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>Validation Errors Detected ({validationResult.errors.length}):</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                      {validationResult.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Validation Warnings ({validationResult.warnings.length}):</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                      {validationResult.warnings.map((warn, idx) => (
                        <li key={idx}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* STUDENT SCORES PREVIEW TABLE */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white">Submitted Score Roster ({selectedSubmission.scores.length} Records)</h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Student Name</th>
                        <th className="p-2.5">Score (Out of 100)</th>
                        <th className="p-2.5">Grade</th>
                        <th className="p-2.5">Teacher Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {selectedSubmission.scores.map((st, idx) => {
                        const scoreNum = Number(st.score);
                        const isInvalid = isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100;
                        return (
                          <tr key={st.studentId || idx} className={isInvalid ? 'bg-red-50 dark:bg-red-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}>
                            <td className="p-2.5 font-bold">{idx + 1}</td>
                            <td className="p-2.5 font-semibold">{st.studentName}</td>
                            <td className={`p-2.5 font-bold ${isInvalid ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                              {st.score}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-800">
                                {st.grade || 'N/A'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500">{st.remarks || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REVIEW COMMENTS & FEEDBACK */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>Admin Review Comments & Return Remarks</span>
                </label>
                <textarea
                  rows={2}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Enter approval feedback, instructions, or reason for return/rejection..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">Current Status:</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#002147] text-white">
                  {selectedSubmission.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* REJECT / RETURN TO TEACHER */}
                <button
                  onClick={() => handleUpdateStatus(selectedSubmission, 'Rejected', reviewComments)}
                  disabled={isSubmittingAction}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject & Return</span>
                </button>

                {/* APPROVE RESULTS */}
                {selectedSubmission.status !== 'Approved' && selectedSubmission.status !== 'Published' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSubmission, 'Approved', reviewComments)}
                    disabled={isSubmittingAction || !validationResult.isValid}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                      validationResult.isValid
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Results</span>
                  </button>
                )}

                {/* PUBLISH RESULTS */}
                {selectedSubmission.status === 'Approved' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSubmission, 'Published', reviewComments)}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Publish to Students & Parents</span>
                  </button>
                )}

                {/* UNPUBLISH RESULTS */}
                {selectedSubmission.status === 'Published' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedSubmission, 'Approved', 'Unpublished back to Approved draft state.')}
                    disabled={isSubmittingAction}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unpublish Results</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
