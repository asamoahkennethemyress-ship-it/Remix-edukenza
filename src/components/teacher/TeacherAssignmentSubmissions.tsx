import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Upload, 
  Award, 
  User, 
  Send, 
  X, 
  Save, 
  RefreshCw, 
  BarChart2, 
  Trash2,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db, storage } from '../../firebase/config';
import { triggerSubmissionGradedNotification } from '../../services/notificationService';

interface TeacherAssignmentSubmissionsProps {
  schoolId: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeacherAssignmentSubmissions: React.FC<TeacherAssignmentSubmissionsProps> = ({
  schoolId,
  assignedClasses,
  assignedSubjects,
  currentUser,
  showToast
}) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Grading Modal State
  const [gradingModal, setGradingModal] = useState<{ open: boolean; submission: any | null }>({
    open: false,
    submission: null
  });

  const [scoreInput, setScoreInput] = useState<number>(0);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [rubricScores, setRubricScores] = useState<{ [critId: string]: number }>({});
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  // Real-time Submissions & Assignments Listener
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    // Fetch assignments for filtering
    const qAss = query(collection(db, 'assignments'), where('schoolId', '==', schoolId));
    const unsubAss = onSnapshot(qAss, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAssignments(list);
    });

    // Real-time submissions listener
    const qSub = query(collection(db, 'assignmentSubmissions'), where('schoolId', '==', schoolId));
    const unsubSub = onSnapshot(qSub, (snap) => {
      const listSub: any[] = [];
      snap.forEach(d => listSub.push({ id: d.id, ...d.data() }));
      listSub.sort((a, b) => (b.submittedAt?.toMillis?.() || 0) - (a.submittedAt?.toMillis?.() || 0));
      setSubmissions(listSub);
      setLoading(false);
    }, (err) => {
      console.warn("Submissions listener error:", err);
      setLoading(false);
    });

    return () => {
      unsubAss();
      unsubSub();
    };
  }, [schoolId]);

  // Open Grading Modal
  const openGradeDrawer = (sub: any) => {
    const matchedAssignment = assignments.find(a => a.id === sub.assignmentId);
    setGradingModal({ open: true, submission: { ...sub, assignmentObj: matchedAssignment } });
    setScoreInput(sub.score || 0);
    setFeedbackInput(sub.feedback || '');
    setRubricScores(sub.rubricScores || {});
    setFeedbackFile(null);
  };

  // Rubric Score change handler (auto-calculates total score)
  const handleRubricScoreChange = (critId: string, val: number, maxPoints: number) => {
    const clamped = Math.min(Math.max(0, val), maxPoints);
    const updated = { ...rubricScores, [critId]: clamped };
    setRubricScores(updated);

    // Auto-calculate total score sum
    const totalCalc = Object.values(updated).reduce((acc: number, current: number) => acc + Number(current || 0), 0);
    setScoreInput(totalCalc);
  };

  // Submit Grade Handler
  const handleSaveGrade = async (publishNow: boolean) => {
    if (!gradingModal.submission?.id) return;

    setSavingGrade(true);
    try {
      let feedbackFileUrl = gradingModal.submission.feedbackFileUrl || '';
      let feedbackFileName = gradingModal.submission.feedbackFileName || '';

      // Upload Feedback file if attached
      if (feedbackFile) {
        try {
          const sRef = ref(storage, `assignmentFeedback/${schoolId}/${Date.now()}_${feedbackFile.name}`);
          const snap = await uploadBytes(sRef, feedbackFile);
          feedbackFileUrl = await getDownloadURL(snap.ref);
          feedbackFileName = feedbackFile.name;
        } catch (err) {
          console.warn("Feedback upload fallback:", err);
        }
      }

      const totalMarks = gradingModal.submission.totalMarks || gradingModal.submission.assignmentObj?.totalMarks || 100;
      const percentageScore = Math.round((scoreInput / totalMarks) * 100);

      let letterGrade = 'F';
      if (percentageScore >= 80) letterGrade = 'A';
      else if (percentageScore >= 70) letterGrade = 'B';
      else if (percentageScore >= 60) letterGrade = 'C';
      else if (percentageScore >= 50) letterGrade = 'D';

      const updatePayload = {
        score: scoreInput,
        percentageScore,
        letterGrade,
        rubricScores,
        feedback: feedbackInput,
        feedbackFileUrl,
        feedbackFileName,
        status: publishNow ? 'Graded' : 'Draft Grade',
        gradedByTeacherId: currentUser?.uid || '',
        gradedByTeacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        gradedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'assignmentSubmissions', gradingModal.submission.id), updatePayload);

      // Send Notification to Student & Linked Parents if Published Grade
      if (publishNow) {
        await triggerSubmissionGradedNotification({
          submissionId: gradingModal.submission.id,
          assignmentId: gradingModal.submission.assignmentId,
          assignmentTitle: gradingModal.submission.assignmentTitle || 'Assignment',
          subjectName: gradingModal.submission.subjectName || 'Subject',
          studentId: gradingModal.submission.studentId || gradingModal.submission.studentUid,
          studentName: gradingModal.submission.studentName || 'Student',
          score: scoreInput,
          totalMarks,
          letterGrade,
          feedback: feedbackInput,
          schoolId,
          teacherName: currentUser?.fullName || currentUser?.name || 'Teacher'
        });
      }

      showToast(publishNow ? "Grade published to student!" : "Grade saved as draft", "success");
      setGradingModal({ open: false, submission: null });
    } catch (err) {
      console.error("Error saving grade:", err);
      showToast("Failed to save grade", "error");
    } finally {
      setSavingGrade(false);
    }
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter(s => {
    const matchAss = selectedAssignmentId === 'All' || s.assignmentId === selectedAssignmentId;
    const matchStatus = selectedStatus === 'All' || s.status === selectedStatus;
    const matchSearch = (s.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.assignmentTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchAss && matchStatus && matchSearch;
  });

  // Calculate Submissions Analytics
  const gradedList = filteredSubmissions.filter(s => s.status === 'Graded');
  const scores = gradedList.map(s => Number(s.score) || 0);

  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
  const maxScore = scores.length > 0 ? Math.max(...scores) : 'N/A';
  const minScore = scores.length > 0 ? Math.min(...scores) : 'N/A';
  const passRate = gradedList.length > 0 
    ? Math.round((gradedList.filter(s => (s.percentageScore || 0) >= 50).length / gradedList.length) * 100) 
    : 0;
  const lateCount = filteredSubmissions.filter(s => s.isLate).length;

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex justify-between items-center border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Assignment Submissions & Rubric Grading</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Real-time student work evaluation with rubric scoring, feedback attachment uploads, and score analytics.
          </p>
        </div>
      </div>

      {/* ANALYTICS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Submissions</span>
          <p className="text-xl font-black text-[#002147]">{filteredSubmissions.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Average Score</span>
          <p className="text-xl font-black text-emerald-600">{avgScore}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Highest Score</span>
          <p className="text-xl font-black text-blue-600">{maxScore}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Lowest Score</span>
          <p className="text-xl font-black text-rose-600">{minScore}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Pass Rate</span>
          <p className="text-xl font-black text-teal-600">{passRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Late Submissions</span>
          <p className="text-xl font-black text-amber-600">{lateCount}</p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student name or assignment..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <select
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700 max-w-xs"
          >
            <option value="All">All Assignments</option>
            {assignments.map(a => (
              <option key={a.id} value={a.id}>{a.title} ({a.className})</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Pending Grading</option>
            <option value="Graded">Graded</option>
            <option value="Draft Grade">Draft Grade</option>
          </select>
        </div>
      </div>

      {/* SUBMISSIONS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs font-bold">Synchronizing real-time submissions...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No student submissions found matching selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#002147] text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Assignment & Class</th>
                  <th className="p-4">Submitted Time</th>
                  <th className="p-4">Late Tag</th>
                  <th className="p-4">Attachment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Score</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-[#002147]">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#D4AF37]" />
                        <span>{sub.studentName || 'Student'}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold">{sub.assignmentTitle}</div>
                      <div className="text-[10px] text-slate-400">{sub.className || 'Class'} • {sub.subjectName || ''}</div>
                    </td>

                    <td className="p-4 font-mono text-slate-600">
                      {sub.submissionDate || (sub.submittedAt?.toDate ? sub.submittedAt.toDate().toLocaleDateString() : 'Today')}
                    </td>

                    <td className="p-4">
                      {sub.isLate ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] flex items-center gap-1 w-max">
                          <Clock className="w-3 h-3" /> Late
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3" /> On Time
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {sub.fileUrl ? (
                        <a
                          href={sub.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{sub.fileName || 'View File'}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Text Response</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        sub.status === 'Graded' ? 'bg-emerald-100 text-emerald-800' :
                        sub.status === 'Draft Grade' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {sub.status || 'Pending Grading'}
                      </span>
                    </td>

                    <td className="p-4 font-black font-mono text-sm">
                      {sub.score !== undefined ? `${sub.score} pts (${sub.letterGrade || ''})` : '—'}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => openGradeDrawer(sub)}
                        className="px-3 py-1.5 bg-[#002147] hover:bg-[#0b3c5d] text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1 ml-auto border border-[#D4AF37]/30"
                      >
                        <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Grade & Feedback</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GRADING & FEEDBACK MODAL */}
      {gradingModal.open && gradingModal.submission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* HEADER */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase bg-[#002147] px-2.5 py-0.5 rounded-lg">
                  Grading & Assessment Drawer
                </span>
                <h2 className="text-xl font-black text-[#002147] mt-1">
                  {gradingModal.submission.studentName} — {gradingModal.submission.assignmentTitle}
                </h2>
                <p className="text-xs text-slate-500">Submitted: {gradingModal.submission.submissionDate || 'Today'}</p>
              </div>
              <button
                onClick={() => setGradingModal({ open: false, submission: null })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* BODY CONTENT */}
            <div className="p-4 overflow-y-auto flex-1 space-y-5">
              
              {/* STUDENT SUBMISSION WORK PREVIEW */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Student Submission Content</span>
                {gradingModal.submission.notes && (
                  <p className="text-xs font-medium text-slate-800 bg-white p-3 rounded-xl border border-slate-200 whitespace-pre-wrap">
                    {gradingModal.submission.notes}
                  </p>
                )}
                {gradingModal.submission.fileUrl && (
                  <a
                    href={gradingModal.submission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#002147] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl border border-blue-200"
                  >
                    <FileText className="w-4 h-4 text-[#D4AF37]" />
                    <span>View Submitted Attachment ({gradingModal.submission.fileName})</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                  </a>
                )}
              </div>

              {/* RUBRIC SCORING BUILDER */}
              {gradingModal.submission.assignmentObj?.rubricCriteria?.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-black uppercase text-[#002147]">Rubric Criteria Assessment</span>
                  <div className="space-y-2">
                    {gradingModal.submission.assignmentObj.rubricCriteria.map((crit: any) => (
                      <div key={crit.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="font-bold text-slate-800">{crit.title}</span>
                          <p className="text-[10px] text-slate-500">{crit.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={rubricScores[crit.id] || 0}
                            onChange={(e) => handleRubricScoreChange(crit.id, Number(e.target.value) || 0, crit.maxPoints)}
                            className="w-16 p-1 text-center font-bold text-xs border border-slate-300 rounded-lg"
                          />
                          <span className="text-[10px] font-bold text-slate-400">/ {crit.maxPoints} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MANUAL OVERRIDE TOTAL SCORE */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Final Score (out of {gradingModal.submission.assignmentObj?.totalMarks || 100})
                </label>
                <input
                  type="number"
                  value={scoreInput}
                  onChange={(e) => setScoreInput(Number(e.target.value) || 0)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-black text-[#002147]"
                />
              </div>

              {/* TEACHER FEEDBACK TEXT */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Teacher Feedback & Comments
                </label>
                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  rows={3}
                  placeholder="Provide constructive feedback, suggestions, or notes on student calculations..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-800"
                />
              </div>

              {/* FEEDBACK FILE ATTACHMENT */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Attach Feedback File (Annotated PDF / Corrections)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFeedbackFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#002147] file:text-white"
                />
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleSaveGrade(false)}
                disabled={savingGrade}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
              >
                Save Draft Grade
              </button>
              <button
                type="button"
                onClick={() => handleSaveGrade(true)}
                disabled={savingGrade}
                className="px-6 py-2 bg-[#002147] hover:bg-[#0b3c5d] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 border border-[#D4AF37]/30"
              >
                <Send className="w-4 h-4 text-[#D4AF37]" />
                <span>{savingGrade ? 'Publishing...' : 'Publish Grade to Student'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
