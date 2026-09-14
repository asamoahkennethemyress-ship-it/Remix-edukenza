import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Upload, 
  Download, 
  Eye, 
  Award, 
  MessageSquare, 
  Trash2, 
  X, 
  Calendar,
  Send,
  Loader2
} from 'lucide-react';
import { LmsCourse, LmsAssignment, LmsAssignmentSubmission } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface LmsCourseAssignmentsProps {
  course: LmsCourse;
  schoolId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'school_admin' | 'teacher' | 'student' | 'parent';
  studentName?: string;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LmsCourseAssignments: React.FC<LmsCourseAssignmentsProps> = ({
  course,
  schoolId,
  currentUserId,
  currentUserName,
  currentUserRole,
  studentName = 'Student',
  showToast
}) => {
  const [assignments, setAssignments] = useState<LmsAssignment[]>([]);
  const [submissions, setSubmissions] = useState<LmsAssignmentSubmission[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<LmsAssignment | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeSubmissionToReview, setActiveSubmissionToReview] = useState<LmsAssignmentSubmission | null>(null);

  // Create Assignment Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalPoints, setTotalPoints] = useState(100);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Student Submission Form State
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Grading Form State
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [isGrading, setIsGrading] = useState(false);

  // Real-time listener for assignments
  useEffect(() => {
    const unsub = LmsService.subscribeToAssignments(course.id, (loadedAssignments) => {
      setAssignments(loadedAssignments);
    });
    return () => unsub();
  }, [course.id]);

  // Real-time listener for submissions
  useEffect(() => {
    const targetStudentId = (currentUserRole === 'student' || currentUserRole === 'parent') ? currentUserId : undefined;
    const unsub = LmsService.subscribeToSubmissions(course.id, undefined, targetStudentId, (loadedSubs) => {
      setSubmissions(loadedSubs);
    });
    return () => unsub();
  }, [course.id, currentUserId, currentUserRole]);

  // Handle Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      showToast?.('Please provide an assignment title and due date.', 'error');
      return;
    }

    setIsSubmittingForm(true);
    try {
      await LmsService.createAssignment({
        courseId: course.id,
        schoolId,
        title: title.trim(),
        description: description.trim(),
        dueDate,
        totalPoints: Number(totalPoints) || 100,
        allowMultipleAttempts: false,
        maxAttempts: 1,
        lateSubmissionAllowed: true,
        latePenaltyPercent: 10,
        status: 'published',
        authorId: currentUserId,
        authorName: currentUserName
      });

      showToast?.('Assignment created and published successfully!', 'success');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      console.error('Error creating assignment:', err);
      showToast?.('Failed to create assignment.', 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Handle Delete Assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await LmsService.deleteAssignment(assignmentId, course.id);
      showToast?.('Assignment deleted.', 'info');
      if (selectedAssignment?.id === assignmentId) setSelectedAssignment(null);
    } catch (err) {
      console.error('Error deleting assignment:', err);
      showToast?.('Failed to delete assignment.', 'error');
    }
  };

  // Handle Student Submit Assignment
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;
    if (!submissionText.trim() && !selectedFile) {
      showToast?.('Please provide a written response or upload a file.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      let fileUrl = '';
      let fileName = '';
      let fileSize = '';

      if (selectedFile) {
        const uploadRes = await LmsService.uploadLmsFile(
          schoolId,
          'submissions',
          selectedFile,
          (pct) => setUploadProgress(pct)
        );
        fileUrl = uploadRes.downloadUrl;
        fileName = uploadRes.fileName;
        fileSize = uploadRes.fileSize;
      }

      await LmsService.submitAssignment({
        assignmentId: selectedAssignment.id,
        assignmentTitle: selectedAssignment.title,
        courseId: course.id,
        schoolId,
        studentId: currentUserId,
        studentName: currentUserName,
        attemptNumber: 1,
        content: submissionText.trim(),
        fileUrl,
        fileName,
        fileSize,
        status: 'submitted'
      });

      showToast?.('Assignment submitted successfully!', 'success');
      setShowSubmitModal(false);
      setSubmissionText('');
      setSelectedFile(null);
      setUploadProgress(null);
    } catch (err) {
      console.error('Error submitting assignment:', err);
      showToast?.('Failed to upload and submit assignment.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Teacher/Admin Grading
  const handleSaveGrade = async () => {
    if (!activeSubmissionToReview) return;
    setIsGrading(true);
    try {
      await LmsService.gradeSubmission(
        activeSubmissionToReview.id,
        Number(gradeScore),
        gradeFeedback.trim(),
        currentUserName
      );
      showToast?.('Submission graded and returned with feedback!', 'success');
      setActiveSubmissionToReview(null);
    } catch (err) {
      console.error('Error grading submission:', err);
      showToast?.('Failed to save grade.', 'error');
    } finally {
      setIsGrading(false);
    }
  };

  const getMySubmission = (assignmentId: string) => {
    return submissions.find(s => s.assignmentId === assignmentId && s.studentId === currentUserId);
  };

  const getAssignmentSubmissions = (assignmentId: string) => {
    return submissions.filter(s => s.assignmentId === assignmentId);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Course Assignments & Continuous Assessments
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUserRole === 'student'
              ? 'Complete tasks, attach homework files, and receive real-time grading & feedback.'
              : currentUserRole === 'parent'
              ? `Tracking ${studentName}'s assignment submissions, grades, and teacher feedback.`
              : 'Create coursework tasks, monitor student submission rates, and grade responses.'}
          </p>
        </div>

        {(currentUserRole === 'school_admin' || currentUserRole === 'teacher') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Assignment
          </button>
        )}
      </div>

      {/* Empty State */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">No Assignments Added Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {currentUserRole === 'school_admin' || currentUserRole === 'teacher'
              ? 'Click "Create Assignment" to post the first assessment for this course.'
              : 'Your instructor has not posted any coursework tasks for this class yet.'}
          </p>
          {(currentUserRole === 'school_admin' || currentUserRole === 'teacher') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add First Assignment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignment Cards List */}
          <div className="lg:col-span-2 space-y-4">
            {assignments.map(assign => {
              const mySub = getMySubmission(assign.id);
              const assignSubs = getAssignmentSubmissions(assign.id);
              const isSelected = selectedAssignment?.id === assign.id;

              return (
                <div
                  key={assign.id}
                  className={`bg-white rounded-3xl p-5 border transition-all duration-200 ${
                    isSelected ? 'border-indigo-500 shadow-md ring-2 ring-indigo-100' : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {assign.totalPoints} Points
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Due: {new Date(assign.dueDate).toLocaleDateString()}
                        </span>
                        {assign.authorName && (
                          <span className="text-[11px] text-slate-500">
                            • Instructor: {assign.authorName}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{assign.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {assign.description}
                      </p>
                    </div>

                    {/* Role Specific Status / Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {currentUserRole === 'student' && (
                        <div>
                          {mySub ? (
                            mySub.status === 'graded' ? (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                                <Award className="w-3.5 h-3.5 text-emerald-600" />
                                {mySub.grade} / {assign.totalPoints}
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Submitted
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedAssignment(assign);
                                setShowSubmitModal(true);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
                            >
                              <Upload className="w-3.5 h-3.5" /> Submit Work
                            </button>
                          )}
                        </div>
                      )}

                      {currentUserRole === 'parent' && (
                        <div>
                          {mySub ? (
                            mySub.status === 'graded' ? (
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" /> Graded: {mySub.grade}/{assign.totalPoints}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Submitted - Pending Review
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Not Submitted
                            </span>
                          )}
                        </div>
                      )}

                      {(currentUserRole === 'school_admin' || currentUserRole === 'teacher') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedAssignment(isSelected ? null : assign)}
                            className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" /> Submissions ({assignSubs.length})
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(assign.id)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                            title="Delete Assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student/Parent Grade & Feedback Display */}
                  {(currentUserRole === 'student' || currentUserRole === 'parent') && mySub && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Submitted on {new Date(mySub.submittedAt).toLocaleDateString()} at{' '}
                          {new Date(mySub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {mySub.fileName && mySub.fileUrl && (
                          <a
                            href={mySub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Download className="w-3 h-3" /> Attached: {mySub.fileName} ({mySub.fileSize})
                          </a>
                        )}
                      </div>

                      {mySub.content && (
                        <div className="text-xs bg-slate-50 p-2.5 rounded-xl text-slate-700 italic">
                          "{mySub.content}"
                        </div>
                      )}

                      {mySub.feedback && (
                        <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl space-y-1">
                          <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-indigo-600" />
                            Instructor Feedback {mySub.gradedBy ? `by ${mySub.gradedBy}` : ''}:
                          </div>
                          <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                            {mySub.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Teacher/Admin Submissions Side Panel */}
          {(currentUserRole === 'school_admin' || currentUserRole === 'teacher') && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs h-fit space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>Submissions Review</span>
                {selectedAssignment && (
                  <span className="text-indigo-600 font-semibold normal-case">
                    {selectedAssignment.title}
                  </span>
                )}
              </h4>

              {!selectedAssignment ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Select an assignment on the left to view and grade student submissions.
                </div>
              ) : getAssignmentSubmissions(selectedAssignment.id).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No submissions received for this assignment yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {getAssignmentSubmissions(selectedAssignment.id).map(sub => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{sub.studentName}</span>
                        {sub.status === 'graded' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {sub.grade} / {selectedAssignment.totalPoints}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Needs Grading
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </div>

                      {sub.content && (
                        <p className="text-xs text-slate-700 line-clamp-2 italic bg-white p-2 rounded-xl border border-slate-100">
                          "{sub.content}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        {sub.fileUrl ? (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Download className="w-3.5 h-3.5" /> File ({sub.fileSize || 'View'})
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">No file attached</span>
                        )}

                        <button
                          onClick={() => {
                            setActiveSubmissionToReview(sub);
                            setGradeScore(sub.grade || 0);
                            setGradeFeedback(sub.feedback || '');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Award className="w-3 h-3" /> {sub.status === 'graded' ? 'Regrade' : 'Grade'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Coursework Assignment</h3>
                <p className="text-xs text-slate-500">Add an assignment task with due dates and points.</p>
              </div>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Term Paper: Quadratic Modeling in Physics"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instructions & Requirements *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed guidelines, rubrics, and submission requirements for students..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Points
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={totalPoints}
                    onChange={e => setTotalPoints(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT SUBMIT ASSIGNMENT MODAL */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setShowSubmitModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Coursework</h3>
                <p className="text-xs text-slate-500">{selectedAssignment.title}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitAssignment} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Written Response / Solution Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your explanation, answers, or summary here..."
                  value={submissionText}
                  onChange={e => setSubmissionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Assignment File (PDF, DOCX, Image, ZIP)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="assignment-file-upload"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="assignment-file-upload" className="cursor-pointer">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    {selectedFile ? (
                      <div className="text-xs font-bold text-indigo-700">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-indigo-600">Click to browse</span> or drag and drop work file
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Uploading file to secure storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER GRADING MODAL */}
      {activeSubmissionToReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setActiveSubmissionToReview(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Grade Student Submission</h3>
                <p className="text-xs text-slate-500">Student: {activeSubmissionToReview.studentName}</p>
              </div>
            </div>

            {/* Submission preview */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100 text-xs">
              <div className="text-slate-500 font-medium">Submitted Content:</div>
              {activeSubmissionToReview.content ? (
                <p className="text-slate-800 leading-relaxed italic bg-white p-3 rounded-xl border border-slate-200/60">
                  "{activeSubmissionToReview.content}"
                </p>
              ) : (
                <p className="text-slate-400 italic">No written content provided.</p>
              )}

              {activeSubmissionToReview.fileUrl && (
                <div className="pt-1">
                  <a
                    href={activeSubmissionToReview.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Attached File ({activeSubmissionToReview.fileName || 'Document'})
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Awarded Score (Points) *
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedAssignment?.totalPoints || 100}
                  value={gradeScore}
                  onChange={e => setGradeScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teacher Feedback & Commentary
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide constructive feedback, commend strengths, and outline areas for improvement..."
                  value={gradeFeedback}
                  onChange={e => setGradeFeedback(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveSubmissionToReview(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGrading}
                onClick={handleSaveGrade}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isGrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Grade & Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
