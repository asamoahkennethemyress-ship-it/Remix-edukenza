import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Settings, 
  Lock, 
  RotateCcw, 
  HelpCircle,
  Award,
  BookOpen,
  Users
} from 'lucide-react';
import { CbtExamConfig, CbtExamType, CbtExamStatus, CbtQuestion } from '../../types/cbt';
import { CbtService } from '../../services/cbtService';

interface CbtExamConfiguratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  examToEdit?: CbtExamConfig | null;
  schoolId: string;
  subjects: any[];
  classes: any[];
  availableQuestions: CbtQuestion[];
  currentUserId: string;
  currentUserName: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CbtExamConfiguratorModal: React.FC<CbtExamConfiguratorModalProps> = ({
  isOpen,
  onClose,
  examToEdit,
  schoolId,
  subjects,
  classes,
  availableQuestions,
  currentUserId,
  currentUserName,
  showToast
}) => {
  const isEdit = !!examToEdit;

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [classId, setClassId] = useState('');
  const [className, setClassName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026');
  const [term, setTerm] = useState('Term 1');
  const [examType, setExamType] = useState<CbtExamType>('Mid-Term Exam');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [passingScorePercentage, setPassingScorePercentage] = useState<number>(50);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16));
  const [instructions, setInstructions] = useState('Read each question carefully. Remain in full screen mode for security logging.');
  
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [poolQuestionCount, setPoolQuestionCount] = useState<number>(0);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkingFactor, setNegativeMarkingFactor] = useState(0.25);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [autoSubmitOnTimeExpire, setAutoSubmitOnTimeExpire] = useState(true);
  const [showResultsImmediately, setShowResultsImmediately] = useState(true);
  const [showExplanationsAfterExam, setShowExplanationsAfterExam] = useState(true);
  const [secureExamMode, setSecureExamMode] = useState(true);
  const [requireFullScreen, setRequireFullScreen] = useState(true);
  const [preventCopyPaste, setPreventCopyPaste] = useState(true);
  const [maxViolationsAllowed, setMaxViolationsAllowed] = useState(3);
  const [violationAction, setViolationAction] = useState<'warning' | 'auto_submit' | 'immediate_submit'>('auto_submit');
  const [allowOneQuestionAtATime, setAllowOneQuestionAtATime] = useState(false);
  const [allowBacktracking, setAllowBacktracking] = useState(true);
  const [scheduledResultReleaseDate, setScheduledResultReleaseDate] = useState('');
  const [status, setStatus] = useState<CbtExamStatus>('Live');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (examToEdit) {
        setTitle(examToEdit.title || '');
        setSubjectId(examToEdit.subjectId || '');
        setSubjectName(examToEdit.subjectName || '');
        setClassId(examToEdit.classId || '');
        setClassName(examToEdit.className || '');
        setAcademicYear(examToEdit.academicYear || '2026');
        setTerm(examToEdit.term || 'Term 1');
        setExamType(examToEdit.examType || 'Mid-Term Exam');
        setStatus(examToEdit.status || 'Live');
        setDurationMinutes(examToEdit.durationMinutes || 45);
        setPassingScorePercentage(examToEdit.passingScorePercentage || 50);
        setStartDate(examToEdit.startDate ? new Date(examToEdit.startDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
        setEndDate(examToEdit.endDate ? new Date(examToEdit.endDate).toISOString().slice(0, 16) : new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16));
        setInstructions(examToEdit.instructions || '');
        setRandomizeQuestions(examToEdit.randomizeQuestions ?? true);
        setRandomizeOptions(examToEdit.randomizeOptions ?? true);
        setPoolQuestionCount(examToEdit.poolQuestionCount || 0);
        setNegativeMarking(examToEdit.negativeMarking ?? false);
        setNegativeMarkingFactor(examToEdit.negativeMarkingFactor || 0.25);
        setMaxAttempts(examToEdit.maxAttempts || 1);
        setAutoSubmitOnTimeExpire(examToEdit.autoSubmitOnTimeExpire ?? true);
        setShowResultsImmediately(examToEdit.showResultsImmediately ?? true);
        setShowExplanationsAfterExam(examToEdit.showExplanationsAfterExam ?? true);
        setSecureExamMode(examToEdit.secureExamMode ?? true);
        setRequireFullScreen(examToEdit.requireFullScreen ?? true);
        setPreventCopyPaste(examToEdit.preventCopyPaste ?? true);
        setMaxViolationsAllowed(examToEdit.maxViolationsAllowed ?? 3);
        setViolationAction(examToEdit.violationAction || 'auto_submit');
        setAllowOneQuestionAtATime(examToEdit.allowOneQuestionAtATime ?? false);
        setAllowBacktracking(examToEdit.allowBacktracking ?? true);
        setScheduledResultReleaseDate(examToEdit.scheduledResultReleaseDate ? new Date(examToEdit.scheduledResultReleaseDate).toISOString().slice(0, 16) : '');
        setSelectedQuestionIds(examToEdit.questionIds || []);
      } else {
        setTitle('');
        setSubjectId(subjects?.[0]?.id || '');
        setSubjectName(subjects?.[0]?.subjectName || subjects?.[0]?.name || '');
        setClassId(classes?.[0]?.id || '');
        setClassName(classes?.[0]?.className || classes?.[0]?.name || '');
        setAcademicYear('2026');
        setTerm('Term 1');
        setExamType('Mid-Term Exam');
        setStatus('Live');
        setDurationMinutes(45);
        setPassingScorePercentage(50);
        setStartDate(new Date().toISOString().slice(0, 16));
        setEndDate(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16));
        setInstructions('Ensure you stay in full screen mode. Tab switching and window blurring are monitored.');
        setRandomizeQuestions(true);
        setRandomizeOptions(true);
        setPoolQuestionCount(0);
        setNegativeMarking(false);
        setNegativeMarkingFactor(0.25);
        setMaxAttempts(1);
        setAutoSubmitOnTimeExpire(true);
        setShowResultsImmediately(true);
        setShowExplanationsAfterExam(true);
        setSecureExamMode(true);
        setRequireFullScreen(true);
        setPreventCopyPaste(true);
        setMaxViolationsAllowed(3);
        setViolationAction('auto_submit');
        setAllowOneQuestionAtATime(false);
        setAllowBacktracking(true);
        setScheduledResultReleaseDate('');
        setSelectedQuestionIds(availableQuestions.map(q => q.id!).filter(Boolean));
      }
    }
  }, [isOpen, examToEdit, subjects, classes, availableQuestions]);

  if (!isOpen) return null;

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSubjectId(sId);
    const found = subjects.find(s => s.id === sId);
    if (found) setSubjectName(found.subjectName || found.name || 'Subject');
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cId = e.target.value;
    setClassId(cId);
    const found = classes.find(c => c.id === cId);
    if (found) setClassName(found.className || found.name || 'Class');
  };

  const toggleQuestionSelection = (qId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const toggleSelectAllQuestions = () => {
    if (selectedQuestionIds.length === availableQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(availableQuestions.map(q => q.id!).filter(Boolean));
    }
  };

  const handleSave = async (e?: React.FormEvent, targetStatus: CbtExamStatus = status) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      showToast('Exam title is required', 'error');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      showToast('Please select at least 1 question for this exam', 'error');
      return;
    }

    setSaving(true);
    const chosenQuestions = availableQuestions.filter(q => selectedQuestionIds.includes(q.id!));
    const calculatedTotalPoints = chosenQuestions.reduce((sum, q) => sum + (q.points || 2), 0);

    const examData: Partial<CbtExamConfig> = {
      schoolId,
      title,
      subjectId: subjectId || 'sub_01',
      subjectName: subjectName || 'Mathematics',
      classId: classId || 'cls_01',
      className: className || 'Grade 10',
      teacherId: currentUserId,
      teacherName: currentUserName,
      academicYear,
      term,
      examType,
      durationMinutes,
      totalPoints: calculatedTotalPoints || 20,
      passingScorePercentage,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      instructions,
      randomizeQuestions,
      randomizeOptions,
      poolQuestionCount,
      negativeMarking,
      negativeMarkingFactor,
      maxAttempts,
      autoSubmitOnTimeExpire,
      showResultsImmediately,
      showExplanationsAfterExam,
      secureExamMode,
      requireFullScreen,
      preventCopyPaste,
      maxViolationsAllowed,
      violationAction,
      allowOneQuestionAtATime,
      allowBacktracking,
      scheduledResultReleaseDate: scheduledResultReleaseDate ? new Date(scheduledResultReleaseDate).toISOString() : undefined,
      status: targetStatus,
      questionIds: selectedQuestionIds,
      questionsCount: selectedQuestionIds.length
    };

    try {
      if (isEdit && examToEdit?.id) {
        await CbtService.updateExam(examToEdit.id, examData);
        showToast(targetStatus === 'Draft' ? 'CBT Exam saved as Draft' : 'CBT Exam configuration updated!', 'success');
      } else {
        await CbtService.createExam(examData);
        showToast(targetStatus === 'Draft' ? 'CBT Exam saved as Draft' : 'CBT Exam published & activated!', 'success');
      }
      onClose();
    } catch (err) {
      showToast('Failed to save exam config', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#002147] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 rounded-xl border border-[#D4AF37]/30">
              <Settings className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isEdit ? 'Configure CBT Exam' : 'Create & Schedule CBT Exam'}
              </h3>
              <p className="text-xs text-slate-300">
                Exam Controls • Anti-Cheating Rules, Duration, Negative Marking & Question Pooling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* Exam Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 mb-1 block">Exam Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Grade 10 Mathematics Term 1 Mid-Term Examination"
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-[#002147] focus:ring-2 focus:ring-[#002147]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Exam Type</label>
              <select
                value={examType}
                onChange={e => setExamType(e.target.value as CbtExamType)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#002147]"
              >
                <option value="Practice Test">Practice Test</option>
                <option value="Class Test">Class Test</option>
                <option value="Quiz">Quiz</option>
                <option value="Mid-Term Exam">Mid-Term Exam</option>
                <option value="End-of-Term Exam">End-of-Term Exam</option>
                <option value="Mock Exam">Mock Exam</option>
                <option value="Entrance Exam">Entrance Exam</option>
                <option value="National Exam Prep">National Exam Prep</option>
              </select>
            </div>
          </div>

          {/* Target Audience & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Subject</label>
              <select
                value={subjectId}
                onChange={handleSubjectChange}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              >
                {subjects.length > 0 ? (
                  subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.subjectName || s.name || 'Subject'}</option>
                  ))
                ) : (
                  <option value="sub_math_01">Mathematics</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Class Target</label>
              <select
                value={classId}
                onChange={handleClassChange}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              >
                {classes.length > 0 ? (
                  classes.map(c => (
                    <option key={c.id} value={c.id}>{c.className || c.name || 'Class'}</option>
                  ))
                ) : (
                  <option value="cls_1">Grade 10 A</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Start Date & Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">End Date & Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Duration, Attempts & Passing Score */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                max={240}
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Passing Score %</label>
              <input
                type="number"
                min={10}
                max={100}
                value={passingScorePercentage}
                onChange={e => setPassingScorePercentage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Max Attempts Allowed</label>
              <select
                value={maxAttempts}
                onChange={e => setMaxAttempts(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value={1}>1 Attempt (Strict Exam)</option>
                <option value={2}>2 Attempts</option>
                <option value={3}>3 Attempts</option>
                <option value={99}>Unlimited Attempts (Practice)</option>
              </select>
            </div>
          </div>

          {/* Anti-Cheating & Security Toggles */}
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-4">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Enterprise Anti-Cheating & Security Controls
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium text-slate-700">
              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={secureExamMode}
                  onChange={e => setSecureExamMode(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block">Secure Exam Lock Mode</span>
                  <span className="text-[10px] text-slate-500">Enforces pre-exam rules agreement and audit logging</span>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireFullScreen}
                  onChange={e => setRequireFullScreen(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block">Mandatory Full-Screen</span>
                  <span className="text-[10px] text-slate-500">Flags exits from full-screen browser mode</span>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preventCopyPaste}
                  onChange={e => setPreventCopyPaste(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block">Copy / Paste Protection</span>
                  <span className="text-[10px] text-slate-500">Blocks Ctrl+C/V/X, right-click, and text selection</span>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={e => setRandomizeQuestions(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block">Randomize Question Order</span>
                  <span className="text-[10px] text-slate-500">Unique question sequence per student</span>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={randomizeOptions}
                  onChange={e => setRandomizeOptions(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block">Randomize Answer Choices</span>
                  <span className="text-[10px] text-slate-500">Shuffles MCQ option keys per student</span>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSubmitOnTimeExpire}
                  onChange={e => setAutoSubmitOnTimeExpire(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block">Auto-Submit On Expiry</span>
                  <span className="text-[10px] text-slate-500">Submits answers immediately when timer hits zero</span>
                </div>
              </label>
            </div>

            {/* Violation Limits & Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">Max Violation Threshold</label>
                <select
                  value={maxViolationsAllowed}
                  onChange={e => setMaxViolationsAllowed(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value={1}>1 Violation (Zero Tolerance)</option>
                  <option value={2}>2 Violations</option>
                  <option value={3}>3 Violations (Standard)</option>
                  <option value={5}>5 Violations</option>
                  <option value={99}>Warning Only (No Auto-Disqualification)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">Action On Exceeding Limit</label>
                <select
                  value={violationAction}
                  onChange={e => setViolationAction(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="auto_submit">Auto-Submit Current Answers</option>
                  <option value="immediate_submit">Immediate Force Submit & Disqualify</option>
                  <option value="warning">Log Violation Warning Only</option>
                </select>
              </div>
            </div>

            {/* Layout, Navigation & Question Pool Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/60">
              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowOneQuestionAtATime}
                  onChange={e => setAllowOneQuestionAtATime(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block text-xs">One Question / Page</span>
                  <span className="text-[10px] text-slate-500">Presents questions individually</span>
                </div>
              </label>

              <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowBacktracking}
                  onChange={e => setAllowBacktracking(e.target.checked)}
                  className="w-4 h-4 text-[#002147] rounded"
                />
                <div>
                  <span className="font-bold text-[#002147] block text-xs">Allow Backtracking</span>
                  <span className="text-[10px] text-slate-500">Uncheck to prevent returning to prior questions</span>
                </div>
              </label>

              <div>
                <label className="text-[11px] font-bold text-amber-900 block mb-1">
                  Question Pool Count (0 = All {selectedQuestionIds.length})
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedQuestionIds.length}
                  value={poolQuestionCount}
                  onChange={e => setPoolQuestionCount(Number(e.target.value))}
                  placeholder={`Max ${selectedQuestionIds.length}`}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-blue-900"
                />
              </div>
            </div>
          </div>

          {/* Question Selector Pool */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#002147]">Selected Exam Questions ({selectedQuestionIds.length})</h4>
                <p className="text-[10px] text-slate-500">Select questions from Question Bank to include in this exam</p>
              </div>
              <button
                type="button"
                onClick={toggleSelectAllQuestions}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                {selectedQuestionIds.length === availableQuestions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 p-2 rounded-xl bg-slate-50">
              {availableQuestions.length > 0 ? (
                availableQuestions.map((q, idx) => {
                  const isChecked = selectedQuestionIds.includes(q.id!);
                  return (
                    <div
                      key={q.id || idx}
                      onClick={() => toggleQuestionSelection(q.id!)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                        isChecked
                          ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#002147] rounded"
                        />
                        <span className="font-bold text-slate-400">Q{idx + 1}.</span>
                        <span className="truncate">{q.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md uppercase">{q.type}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">{q.points} pts</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No questions in Question Bank yet.</p>
              )}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSave(e, 'Draft')}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={(e) => handleSave(e, 'Live')}
                className="px-6 py-2.5 bg-[#002147] hover:bg-slate-900 text-[#D4AF37] font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                {saving ? 'Saving...' : isEdit ? 'Update & Publish' : 'Publish & Activate Exam'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
