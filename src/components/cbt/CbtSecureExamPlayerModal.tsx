import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Flag, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Lock,
  Eye,
  Maximize2,
  FileText,
  AlertOctagon,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  CbtExamConfig, 
  CbtQuestion, 
  CbtStudentAnswer, 
  CbtSecurityViolationLog, 
  CbtActivityLogEntry,
  CbtAttempt 
} from '../../types/cbt';
import { CbtService } from '../../services/cbtService';
import { CbtMathRenderer } from './CbtMathRenderer';

interface CbtSecureExamPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: CbtExamConfig | null;
  questions: CbtQuestion[];
  studentId: string;
  studentName: string;
  className: string;
  onExamSubmitted: (attempt: CbtAttempt) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Utility to deterministic/random shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const CbtSecureExamPlayerModal: React.FC<CbtSecureExamPlayerModalProps> = ({
  isOpen,
  onClose,
  exam,
  questions,
  studentId,
  studentName,
  className,
  onExamSubmitted,
  showToast
}) => {
  const storageKeyStart = `cbt_start_${exam?.id || 'temp'}_${studentId}`;
  const storageKeyAnswers = `cbt_answers_${exam?.id || 'temp'}_${studentId}`;
  const storageKeyQuestions = `cbt_active_q_${exam?.id || 'temp'}_${studentId}`;

  const [hasAgreedToRules, setHasAgreedToRules] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<CbtQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CbtStudentAnswer>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>((exam?.durationMinutes || 45) * 60);
  const [violations, setViolations] = useState<CbtSecurityViolationLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<CbtActivityLogEntry[]>([]);
  const [timeSpentPerQuestion, setTimeSpentPerQuestion] = useState<Record<string, number>>({});
  
  const [showViolationBanner, setShowViolationBanner] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const startTimeRef = useRef(Date.now());
  const currentQStartTimeRef = useRef(Date.now());
  const activeQuestionsRef = useRef<CbtQuestion[]>([]);

  // Add activity log event helper
  const addActivityLog = (action: string, details?: string) => {
    const entry: CbtActivityLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      details
    };
    setActivityLogs(prev => [...prev, entry]);
  };

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Questions, Shuffling & Pooling
  useEffect(() => {
    if (!isOpen || !exam) return;

    // Reset agreement if opening a new exam
    setHasAgreedToRules(false);

    let prepared: CbtQuestion[] = [];
    const savedQuestionsStr = localStorage.getItem(storageKeyQuestions);

    if (savedQuestionsStr) {
      try {
        const parsed = JSON.parse(savedQuestionsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          prepared = parsed;
        }
      } catch (e) {
        console.warn('Could not parse cached exam questions:', e);
      }
    }

    if (prepared.length === 0 && questions.length > 0) {
      let pool = [...questions];

      // Pool question count sampling
      if (exam.poolQuestionCount && exam.poolQuestionCount > 0 && exam.poolQuestionCount < pool.length) {
        pool = shuffleArray(pool).slice(0, exam.poolQuestionCount);
      } else if (exam.randomizeQuestions) {
        pool = shuffleArray(pool);
      }

      // Option randomization
      if (exam.randomizeOptions) {
        pool = pool.map(q => {
          if (q.options && q.options.length > 0) {
            return {
              ...q,
              options: shuffleArray(q.options)
            };
          }
          return q;
        });
      }

      prepared = pool;
      localStorage.setItem(storageKeyQuestions, JSON.stringify(prepared));
    }

    setActiveQuestions(prepared);
    activeQuestionsRef.current = prepared;

    // Timer & Draft restoration
    let savedStart = localStorage.getItem(storageKeyStart);
    let startTime = savedStart ? parseInt(savedStart, 10) : Date.now();
    if (!savedStart) {
      localStorage.setItem(storageKeyStart, startTime.toString());
    }
    startTimeRef.current = startTime;
    currentQStartTimeRef.current = Date.now();

    const totalSec = (exam.durationMinutes || 45) * 60;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const initialRemaining = Math.max(0, totalSec - elapsed);

    setSecondsRemaining(initialRemaining);

    // Restore draft saved answers
    const savedAnswersStr = localStorage.getItem(storageKeyAnswers);
    if (savedAnswersStr) {
      try {
        const parsed = JSON.parse(savedAnswersStr);
        if (parsed && typeof parsed === 'object') {
          setAnswers(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse draft CBT answers:', e);
      }
    }
  }, [isOpen, exam?.id, studentId]);

  // Track time spent per question on index change
  useEffect(() => {
    if (!hasAgreedToRules || activeQuestions.length === 0) return;

    const qId = activeQuestions[currentIndex]?.id;
    if (!qId) return;

    const elapsedOnPrev = Math.max(1, Math.round((Date.now() - currentQStartTimeRef.current) / 1000));
    currentQStartTimeRef.current = Date.now();

    setTimeSpentPerQuestion(prev => ({
      ...prev,
      [qId]: (prev[qId] || 0) + elapsedOnPrev
    }));

    addActivityLog(`Viewed Question ${currentIndex + 1}`, `Question ID: ${qId}`);
  }, [currentIndex, hasAgreedToRules]);

  // Periodic Auto-Save Draft Answers
  useEffect(() => {
    if (!isOpen || !exam || !hasAgreedToRules) return;

    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(storageKeyAnswers, JSON.stringify(answers));
      }
    }, 3000);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(storageKeyAnswers, JSON.stringify(answers));
      }
      e.preventDefault();
      e.returnValue = 'CBT Examination in progress! Leaving will submit your answers.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, exam?.id, studentId, answers, hasAgreedToRules]);

  // Timer countdown loop
  useEffect(() => {
    if (!isOpen || !hasAgreedToRules) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          addActivityLog('Timer Expired', 'Examination auto-submitting now.');
          handleFinalSubmit('auto_submitted');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, hasAgreedToRules]);

  // Anti-Cheating & Security Listeners
  useEffect(() => {
    if (!isOpen || !exam || !hasAgreedToRules) return;

    const maxAllowed = exam.maxViolationsAllowed || 3;

    const logViolation = (type: CbtSecurityViolationLog['type'], detail: string) => {
      const newV: CbtSecurityViolationLog = {
        timestamp: new Date().toLocaleTimeString(),
        type,
        detail
      };
      
      setViolations(prev => {
        const updated = [...prev, newV];
        addActivityLog(`Security Violation: ${type}`, `${detail} (Total: ${updated.length})`);

        if (updated.length >= maxAllowed && exam.secureExamMode) {
          showToast(`Maximum security violations (${maxAllowed}) reached! Submitting exam now.`, 'error');
          setTimeout(() => handleFinalSubmit('auto_submitted'), 1000);
        }

        return updated;
      });

      setViolationMessage(detail);
      setShowViolationBanner(true);
      setTimeout(() => setShowViolationBanner(false), 6000);
    };

    // Full Screen Change Listener
    const handleFullScreenChange = () => {
      const isFS = !!document.fullscreenElement;
      setIsFullScreen(isFS);
      if (!isFS && exam.requireFullScreen !== false && exam.secureExamMode) {
        logViolation('fullscreen_exit', 'Warning: You exited full-screen mode! Full screen is required.');
      }
    };

    // Tab visibility change
    const handleVisibility = () => {
      if (document.hidden && exam.secureExamMode) {
        logViolation('tab_switch', 'Warning: Tab switch or window minimization detected!');
      }
    };

    // Window blur
    const handleBlur = () => {
      if (exam.secureExamMode) {
        logViolation('window_blur', 'Warning: Focus lost from active exam window!');
      }
    };

    // Keyboard shortcut blocker
    const handleKeyDown = (e: KeyboardEvent) => {
      if (exam.preventCopyPaste !== false && exam.secureExamMode) {
        if (
          (e.ctrlKey || e.metaKey) && 
          ['c', 'v', 'x', 'a', 'p', 's'].includes(e.key.toLowerCase())
        ) {
          e.preventDefault();
          logViolation('copy_paste', `Prohibited shortcut attempt: Ctrl+${e.key.toUpperCase()}`);
        }
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
          e.preventDefault();
          logViolation('dev_tools', 'Developer Tools keyboard shortcut blocked.');
        }
      }
    };

    // Copy / Paste & Context Menu
    const handleCopyPaste = (e: ClipboardEvent) => {
      if (exam.preventCopyPaste !== false && exam.secureExamMode) {
        e.preventDefault();
        logViolation('copy_paste', 'Security Alert: Copying or pasting text is prohibited during exam.');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (exam.secureExamMode) {
        e.preventDefault();
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isOpen, exam, hasAgreedToRules]);

  if (!isOpen || !exam) return null;

  // Request Fullscreen Helper
  const enterFullScreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          console.warn('Fullscreen request denied by browser container');
        });
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  // Start Exam Handler (Rules Agreement)
  const handleBeginExam = () => {
    setHasAgreedToRules(true);
    if (exam.secureExamMode || exam.requireFullScreen !== false) {
      enterFullScreen();
    }
    addActivityLog('Exam Started', `Student ${studentName} agreed to rules and initiated examination.`);
    showToast('Secure Exam session active. Good luck!', 'info');
  };

  const currentQuestion = activeQuestions[currentIndex] || null;

  const updateAnswer = (qId: string, updates: Partial<CbtStudentAnswer>) => {
    setAnswers(prev => {
      const updated = {
        ...prev,
        [qId]: {
          questionId: qId,
          ...(prev[qId] || {}),
          ...updates
        }
      };
      localStorage.setItem(storageKeyAnswers, JSON.stringify(updated));
      return updated;
    });
    addActivityLog(`Answer Updated for Question ${currentIndex + 1}`, `QID: ${qId}`);
  };

  const toggleFlagQuestion = (qId: string) => {
    const current = answers[qId]?.isFlagged;
    updateAnswer(qId, { isFlagged: !current });
  };

  const handleFinalSubmit = async (statusType: 'submitted' | 'auto_submitted' = 'submitted') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const timeSpent = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    // Record final question time
    if (currentQuestion?.id) {
      const elapsedOnLast = Math.max(1, Math.round((Date.now() - currentQStartTimeRef.current) / 1000));
      timeSpentPerQuestion[currentQuestion.id] = (timeSpentPerQuestion[currentQuestion.id] || 0) + elapsedOnLast;
    }

    try {
      const attempt = await CbtService.submitAttempt(
        exam,
        activeQuestions.length > 0 ? activeQuestions : questions,
        studentId,
        studentName,
        className,
        answers,
        violations,
        timeSpent,
        statusType
      );

      // Attach detailed activity logs and time spent
      attempt.activityLogs = activityLogs;
      attempt.timeSpentPerQuestion = timeSpentPerQuestion;

      // Clean up localStorage keys
      localStorage.removeItem(storageKeyStart);
      localStorage.removeItem(storageKeyAnswers);
      localStorage.removeItem(storageKeyQuestions);

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      showToast(
        statusType === 'auto_submitted' 
          ? 'Exam auto-submitted successfully. Your answers were saved.' 
          : 'CBT Exam submitted successfully! Results calculated.', 
        'success'
      );
      onExamSubmitted(attempt);
      onClose();
    } catch (err) {
      showToast('Unable to submit to cloud. Your answers are preserved locally in storage.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format Timer
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = (Object.values(answers) as CbtStudentAnswer[]).filter(a => 
    a.selectedOptionIds?.length || a.textResponse || a.numericResponse !== undefined
  ).length;

  // Render Pre-Exam Rules Modal if Rules not agreed
  if (!hasAgreedToRules) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 select-none overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
            <div className="p-3 bg-[#D4AF37]/20 rounded-2xl border border-[#D4AF37]/30 text-[#D4AF37]">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 uppercase tracking-wider block w-fit mb-1">
                Enterprise Secure Examination Portal
              </span>
              <h2 className="text-xl font-extrabold text-white">{exam.title}</h2>
              <p className="text-xs text-slate-400">
                {exam.subjectName} • {className} • Duration: {exam.durationMinutes} Minutes
              </p>
            </div>
          </div>

          {/* Rules Overview */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              Examination Rules & Anti-Cheating Protocol
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" /> Full-Screen Mandatory
                </span>
                <p className="text-slate-400 text-[11px]">
                  The exam runs in full screen mode. Exiting full screen will be flagged as a security violation.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" /> Tab Switch & Focus Monitor
                </span>
                <p className="text-slate-400 text-[11px]">
                  Navigating away from the window or switching tabs logs an immediate event in your audit trail.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-red-400" /> Copy & Paste Restricted
                </span>
                <p className="text-slate-400 text-[11px]">
                  Copying, pasting, right-click, and system shortcuts are disabled during the session.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" /> Continuous Auto-Save
                </span>
                <p className="text-slate-400 text-[11px]">
                  Answers auto-save every 3 seconds locally and sync seamlessly across page reloads.
                </p>
              </div>
            </div>

            {/* Custom Teacher Instructions */}
            {exam.instructions && (
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1 text-xs">
                <span className="font-bold text-slate-300 block">Teacher Instructions:</span>
                <p className="text-slate-400 leading-relaxed italic">{exam.instructions}</p>
              </div>
            )}

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                By clicking <strong>"I Agree & Start Examination"</strong>, you certify that you will complete this exam independently without unauthorized assistance.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel & Exit
            </button>
            <button
              onClick={handleBeginExam}
              className="px-6 py-3 bg-[#002147] hover:bg-slate-800 text-[#D4AF37] border border-[#D4AF37]/50 font-extrabold rounded-xl text-xs shadow-xl transition flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" /> I Agree & Start Examination
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allowBacktracking = exam.allowBacktracking !== false;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Top Security & Timer Bar */}
      <div className="bg-[#002147] px-6 py-3 border-b border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D4AF37]/20 rounded-xl border border-[#D4AF37]/30">
            <Lock className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white truncate max-w-md">{exam.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>{exam.subjectName}</span> • <span>{className}</span> • 
              <span className="text-emerald-400 font-semibold">{answeredCount} of {activeQuestions.length} Answered</span>
            </div>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-1.5 rounded-2xl border border-slate-700">
          <Clock className={`w-5 h-5 ${secondsRemaining < 300 ? 'text-red-400 animate-pulse' : 'text-[#D4AF37]'}`} />
          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Time Remaining</span>
            <span className={`text-lg font-mono font-black ${secondsRemaining < 300 ? 'text-red-400' : 'text-white'}`}>
              {formatTime(secondsRemaining)}
            </span>
          </div>
        </div>

        {/* Security Violations Counter & Network Status */}
        <div className="flex items-center gap-3">
          {!isFullScreen && exam.requireFullScreen !== false && (
            <button
              onClick={enterFullScreen}
              className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Re-enter Full Screen
            </button>
          )}

          {exam.secureExamMode && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
              violations.length > 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              <ShieldAlert className="w-4 h-4" />
              <span>{violations.length} / {exam.maxViolationsAllowed || 3} Violations</span>
            </div>
          )}

          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${
            isOnline ? 'text-emerald-400 bg-emerald-950/40' : 'text-amber-400 bg-amber-950/40'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Auto-Save Active' : 'Offline Mode'}</span>
          </div>

          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Submit Exam
          </button>
        </div>
      </div>

      {/* Violation Alert Banner */}
      {showViolationBanner && (
        <div className="bg-red-600 text-white px-6 py-2.5 flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-200 shadow-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{violationMessage}</span>
          </div>
          <span className="text-[10px] bg-red-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Logged in Audit Trail ({violations.length} total)
          </span>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden bg-slate-950">
        {/* Question Drawer Palette */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question Navigator</h3>
            <div className="grid grid-cols-4 gap-2">
              {activeQuestions.map((q, idx) => {
                const ans = answers[q.id!];
                const isCurrent = idx === currentIndex;
                const isAnswered = !!(ans?.selectedOptionIds?.length || ans?.textResponse || ans?.numericResponse !== undefined);
                const isFlagged = !!ans?.isFlagged;
                const isDisabledBacktrack = !allowBacktracking && idx < currentIndex;

                let btnStyle = 'bg-slate-800 text-slate-300 hover:bg-slate-700';
                if (isCurrent) btnStyle = 'bg-[#002147] text-[#D4AF37] border-2 border-[#D4AF37] font-black scale-105';
                else if (isFlagged) btnStyle = 'bg-amber-500/30 text-amber-300 border border-amber-500/50';
                else if (isAnswered) btnStyle = 'bg-emerald-600 text-white font-bold';
                
                if (isDisabledBacktrack) {
                  btnStyle = 'bg-slate-800/40 text-slate-600 cursor-not-allowed opacity-50';
                }

                return (
                  <button
                    key={q.id || idx}
                    disabled={isDisabledBacktrack}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs font-mono transition flex items-center justify-center relative cursor-pointer ${btnStyle}`}
                  >
                    {idx + 1}
                    {isFlagged && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-600 rounded" /> Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-800 border border-slate-600 rounded" /> Unanswered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-500/40 border border-amber-500 rounded" /> Flagged for Review</div>
            {!allowBacktracking && (
              <div className="text-[10px] text-amber-400/80 pt-1 border-t border-slate-800/60 font-semibold">
                * Strict Navigation: Backtracking Disabled
              </div>
            )}
          </div>
        </div>

        {/* Current Question View */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 overflow-y-auto bg-slate-900">
          {currentQuestion ? (
            <div className="max-w-3xl mx-auto w-full space-y-6">
              {/* Question Top Info */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] rounded-xl text-xs font-black">
                    Question {currentIndex + 1} of {activeQuestions.length}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg uppercase">
                    {currentQuestion.type}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    {currentQuestion.points} Points
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFlagQuestion(currentQuestion.id!)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    answers[currentQuestion.id!]?.isFlagged
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {answers[currentQuestion.id!]?.isFlagged ? 'Flagged' : 'Flag for Review'}
                </button>
              </div>

              {/* Title / Prompt */}
              <div className="space-y-4">
                <div className="text-lg sm:text-xl font-medium text-slate-100 leading-relaxed">
                  <CbtMathRenderer content={currentQuestion.title} />
                </div>

                {currentQuestion.latexFormula && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-amber-300 text-sm overflow-x-auto">
                    <CbtMathRenderer content={`$$${currentQuestion.latexFormula}$$`} />
                  </div>
                )}

                {currentQuestion.imageUrl && (
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Question Diagram"
                    className="max-h-64 rounded-2xl border border-slate-700 object-contain mx-auto"
                  />
                )}
              </div>

              {/* Options / Answer Input */}
              <div className="pt-4 space-y-3">
                {(currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false' || currentQuestion.type === 'multi_select') && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((opt, oIdx) => {
                      const selectedIds = answers[currentQuestion.id!]?.selectedOptionIds || [];
                      const isSelected = selectedIds.includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (currentQuestion.type === 'multi_select') {
                              const newSel = isSelected 
                                ? selectedIds.filter(id => id !== opt.id)
                                : [...selectedIds, opt.id];
                              updateAnswer(currentQuestion.id!, { selectedOptionIds: newSel });
                            } else {
                              updateAnswer(currentQuestion.id!, { selectedOptionIds: [opt.id] });
                            }
                          }}
                          className={`p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex items-start gap-3.5 ${
                            isSelected
                              ? 'bg-[#002147] border-[#D4AF37] text-white shadow-md'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5 ${
                            isSelected ? 'border-[#D4AF37] bg-[#D4AF37] text-[#002147]' : 'border-slate-500 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <div className="text-sm font-medium flex-1">
                            <CbtMathRenderer content={opt.text} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'numeric' || currentQuestion.type === 'fill_blank') && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 block">Type Your Response Below:</label>
                    <input
                      type={currentQuestion.type === 'numeric' ? 'number' : 'text'}
                      value={answers[currentQuestion.id!]?.textResponse || answers[currentQuestion.id!]?.numericResponse || ''}
                      onChange={e => updateAnswer(currentQuestion.id!, { 
                        textResponse: e.target.value,
                        numericResponse: currentQuestion.type === 'numeric' ? Number(e.target.value) : undefined 
                      })}
                      placeholder="Enter final answer..."
                      className="w-full px-5 py-3.5 bg-slate-950 border border-slate-700 rounded-2xl text-base font-bold text-amber-300 focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                )}

                {currentQuestion.type === 'essay' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 block">Essay Response (Supports detailed formatted text):</label>
                    <textarea
                      rows={8}
                      value={answers[currentQuestion.id!]?.textResponse || ''}
                      onChange={e => updateAnswer(currentQuestion.id!, { textResponse: e.target.value })}
                      placeholder="Write your complete essay response here..."
                      className="w-full px-5 py-4 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-medium text-slate-100 focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400 py-12">No question available.</p>
          )}

          {/* Navigation Control Buttons */}
          <div className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-800 flex items-center justify-between">
            <button
              disabled={currentIndex === 0 || !allowBacktracking}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs disabled:opacity-30 disabled:pointer-events-none transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentIndex < activeQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-6 py-2.5 bg-[#002147] hover:bg-slate-800 text-[#D4AF37] border border-[#D4AF37]/30 font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Final Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Ready to Submit CBT Exam?</h3>
            <p className="text-xs text-slate-300">
              You have answered <strong className="text-emerald-400">{answeredCount}</strong> out of <strong className="text-white">{activeQuestions.length}</strong> questions. Once submitted, your answers will be finalized for auto-grading.
            </p>
            {violations.length > 0 && (
              <p className="text-xs text-amber-300 bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30">
                Notice: {violations.length} security violation(s) recorded during this session will be submitted with your attempt.
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Return to Exam
              </button>
              <button
                onClick={() => handleFinalSubmit('submitted')}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
