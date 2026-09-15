import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  BrainCircuit, 
  BookOpen, 
  FileText, 
  Plus, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  BarChart2, 
  ShieldCheck, 
  Settings, 
  UserCheck, 
  Search,
  Filter,
  Eye,
  Trash2,
  Edit,
  RotateCcw,
  GraduationCap
} from 'lucide-react';
import { 
  CbtQuestion, 
  CbtExamConfig, 
  CbtAttempt, 
  CbtCertificate,
  CbtExamType 
} from '../../types/cbt';
import { CbtService } from '../../services/cbtService';
import { CbtQuestionBankView } from './CbtQuestionBankView';
import { CbtQuestionEditorModal } from './CbtQuestionEditorModal';
import { CbtExamConfiguratorModal } from './CbtExamConfiguratorModal';
import { CbtProfessionalExamBuilder } from './CbtProfessionalExamBuilder';
import { CbtSecureExamPlayerModal } from './CbtSecureExamPlayerModal';
import { CbtResultsAnalyticsView } from './CbtResultsAnalyticsView';
import { CbtCertificateModal } from './CbtCertificateModal';
import { CbtAiGeneratorModal } from './CbtAiGeneratorModal';

export interface CbtMainDashboardProps {
  schoolId: string;
  userRole: 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  userId: string;
  userName: string;
  userClassName?: string;
  subjects?: any[];
  classes?: any[];
  students?: any[];
  teachers?: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CbtMainDashboard: React.FC<CbtMainDashboardProps> = ({
  schoolId,
  userRole,
  userId,
  userName,
  userClassName = '',
  subjects = [],
  classes = [],
  students = [],
  teachers = [],
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'exams' | 'question_bank' | 'attempts' | 'analytics' | 'certificates'>('exams');
  
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [exams, setExams] = useState<CbtExamConfig[]>([]);
  const [attempts, setAttempts] = useState<CbtAttempt[]>([]);
  const [certificates, setCertificates] = useState<CbtCertificate[]>([]);

  // Modals state
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<CbtQuestion | null>(null);

  const [isExamConfigOpen, setIsExamConfigOpen] = useState(false);
  const [examToEdit, setExamToEdit] = useState<CbtExamConfig | null>(null);

  const [isProfBuilderOpen, setIsProfBuilderOpen] = useState(false);
  const [examForProfBuilder, setExamForProfBuilder] = useState<CbtExamConfig | null>(null);

  const [isExamPlayerOpen, setIsExamPlayerOpen] = useState(false);
  const [activeExamForPlayer, setActiveExamForPlayer] = useState<CbtExamConfig | null>(null);

  const [selectedAttemptForAnalytics, setSelectedAttemptForAnalytics] = useState<CbtAttempt | null>(null);
  
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState<CbtCertificate | null>(null);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Firestore Subscriptions
  useEffect(() => {
    const unsubQ = CbtService.subscribeToQuestions(schoolId, (data) => setQuestions(data));
    const unsubE = CbtService.subscribeToExams(schoolId, (data) => setExams(data));
    const unsubA = CbtService.subscribeToAttempts(schoolId, (data) => setAttempts(data));

    return () => {
      unsubQ();
      unsubE();
      unsubA();
    };
  }, [schoolId]);

  // Launch Player
  const handleStartExam = (exam: CbtExamConfig) => {
    setActiveExamForPlayer(exam);
    setIsExamPlayerOpen(true);
  };

  const handleExamSubmitted = (attempt: CbtAttempt) => {
    setAttempts(prev => [attempt, ...prev]);
    setSelectedAttemptForAnalytics(attempt);
    setActiveTab('analytics');
  };

  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'school_admin' || userRole === 'platform_owner';
  const isStudent = userRole === 'student';
  const isParent = userRole === 'parent';

  // Filter exams for student
  const filteredExams = useMemo(() => {
    if (isStudent || isParent) {
      return exams.filter(e => e.status === 'Live' || e.status === 'Closed');
    }
    return exams;
  }, [exams, isStudent, isParent]);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Hero Banner Header */}
      <div className="bg-[#002147] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#D4AF37]/20 rounded-full border border-[#D4AF37]/30 text-xs font-bold text-[#D4AF37]">
            <Award className="w-4 h-4" /> Enterprise Computer-Based Testing (CBT) System
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Secure Online Examinations & Question Analytics
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Real-time anti-cheating monitoring, LaTeX formula rendering, auto-grading engine, AI question generator & certified transcripts.
          </p>
        </div>

        {isTeacherOrAdmin && (
          <div className="flex flex-wrap items-center gap-3 z-10">
            <button
              onClick={() => {
                setExamForProfBuilder(null);
                setIsProfBuilderOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-600 text-[#002147] font-black rounded-2xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer border border-[#D4AF37]"
            >
              <Plus className="w-4 h-4 text-[#002147]" />
              Create Exam (Professional Builder)
            </button>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              AI Exam Creator
            </button>
            <button
              onClick={() => {
                setExamToEdit(null);
                setIsExamConfigOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer border border-slate-700"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              Schedule Settings
            </button>
          </div>
        )}
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('exams');
            setSelectedAttemptForAnalytics(null);
          }}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'exams' && !selectedAttemptForAnalytics
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Scheduled & Live Exams ({filteredExams.length})
        </button>

        {isTeacherOrAdmin && (
          <button
            onClick={() => {
              setActiveTab('question_bank');
              setSelectedAttemptForAnalytics(null);
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'question_bank'
                ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            Question Bank ({questions.length})
          </button>
        )}

        <button
          onClick={() => {
            setActiveTab('attempts');
            setSelectedAttemptForAnalytics(null);
          }}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'attempts'
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Student Attempts & Manual Grading ({attempts.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('analytics');
          }}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'analytics' || selectedAttemptForAnalytics
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Results & Analytics
        </button>
      </div>

      {/* Tab 1: Exams List */}
      {activeTab === 'exams' && !selectedAttemptForAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.length > 0 ? (
            filteredExams.map(exam => {
              const questionItems = questions.filter(q => exam.questionIds?.includes(q.id!));
              const isLive = exam.status === 'Live';

              return (
                <div 
                  key={exam.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase ${
                        isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {exam.status} • {exam.examType}
                      </span>
                      {exam.secureExamMode && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-600" /> Secure Mode
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#002147] leading-snug">
                      {exam.title}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Subject</span>
                        <strong className="text-slate-800">{exam.subjectName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Target Class</span>
                        <strong className="text-slate-800">{exam.className}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Duration</span>
                        <strong className="text-blue-700">{exam.durationMinutes} Mins</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Questions</span>
                        <strong className="text-emerald-700">{exam.questionsCount || exam.questionIds?.length || 5} Questions</strong>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {exam.instructions}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {isTeacherOrAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setExamForProfBuilder(exam);
                            setIsProfBuilderOpen(true);
                          }}
                          className="px-3 py-1.5 bg-[#002147] text-[#D4AF37] font-bold rounded-xl text-xs hover:bg-slate-900 transition cursor-pointer flex items-center gap-1"
                          title="Open Professional Question Editor Suite"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#D4AF37]" /> Author Suite
                        </button>
                        <button
                          onClick={() => {
                            setExamToEdit(exam);
                            setIsExamConfigOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-[#002147] hover:bg-slate-100 rounded-xl transition cursor-pointer"
                          title="Schedule Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete exam configuration?')) {
                              await CbtService.deleteExam(exam.id!);
                              showToast('Exam deleted', 'info');
                            }
                          }}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleStartExam(exam)}
                      className="ml-auto px-5 py-2.5 bg-[#002147] hover:bg-slate-900 text-[#D4AF37] font-bold rounded-2xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-[#D4AF37] fill-current" />
                      {isStudent ? 'Take CBT Exam' : 'Preview Exam Player'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center space-y-4 border border-slate-200 shadow-sm">
              <BookOpen className="w-12 h-12 text-[#D4AF37] mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No scheduled CBT examinations yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create a professional examination using our rich question authoring builder or schedule from your existing Question Bank.
              </p>
              {isTeacherOrAdmin && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setExamForProfBuilder(null);
                      setIsProfBuilderOpen(true);
                    }}
                    className="px-5 py-2.5 bg-[#002147] hover:bg-slate-900 text-[#D4AF37] font-bold rounded-2xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#D4AF37]" /> Create Exam (Professional Builder)
                  </button>
                  <button
                    onClick={() => {
                      setExamToEdit(null);
                      setIsExamConfigOpen(true);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition flex items-center gap-2 cursor-pointer border border-slate-300"
                  >
                    <Settings className="w-4 h-4 text-slate-500" /> Schedule from Question Bank
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Question Bank */}
      {activeTab === 'question_bank' && isTeacherOrAdmin && (
        <CbtQuestionBankView
          questions={questions}
          subjects={subjects}
          schoolId={schoolId}
          onOpenCreateQuestion={() => {
            setQuestionToEdit(null);
            setIsQuestionEditorOpen(true);
          }}
          onEditQuestion={q => {
            setQuestionToEdit(q);
            setIsQuestionEditorOpen(true);
          }}
          onOpenAiGenerator={() => setIsAiModalOpen(true)}
          currentUserId={userId}
          currentUserName={userName}
          showToast={showToast}
        />
      )}

      {/* Tab 3: Attempts & Grading */}
      {activeTab === 'attempts' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#002147]">Student Exam Attempt Audit Logs</h3>
            <span className="text-xs font-bold text-slate-500">{attempts.length} Submissions Logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Exam Title</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Score & Grade</th>
                  <th className="p-3">Violations</th>
                  <th className="p-3">Submitted At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {attempts.length > 0 ? (
                  attempts.map((att, idx) => (
                    <tr key={att.id || idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-[#002147]">{att.studentName}</td>
                      <td className="p-3">{att.examTitle}</td>
                      <td className="p-3">{att.subjectName}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                          att.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {att.percentageScore}% ({att.grade})
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.violationCount > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {att.violationCount} Alerts
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{new Date(att.submittedAt || Date.now()).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedAttemptForAnalytics(att);
                            setActiveTab('analytics');
                          }}
                          className="px-3 py-1.5 bg-[#002147] text-[#D4AF37] font-bold rounded-xl text-xs hover:bg-slate-900 transition cursor-pointer"
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No student CBT exam submissions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Results & Analytics */}
      {(activeTab === 'analytics' || selectedAttemptForAnalytics) && (
        <CbtResultsAnalyticsView
          attempt={selectedAttemptForAnalytics || attempts[0] || null}
          exam={exams.find(e => e.id === (selectedAttemptForAnalytics || attempts[0])?.examId)}
          questions={questions}
          onOpenCertificate={() => {
            const currentAtt = selectedAttemptForAnalytics || attempts[0];
            if (currentAtt) {
              setActiveCertificate({
                id: currentAtt.certificateId || `cert_${Date.now()}`,
                schoolId,
                schoolName: 'EDUkenZA Academy',
                studentId: currentAtt.studentId,
                studentName: currentAtt.studentName,
                examId: currentAtt.examId,
                examTitle: currentAtt.examTitle,
                subjectName: currentAtt.subjectName,
                scorePercentage: currentAtt.percentageScore,
                grade: currentAtt.grade,
                issuedDate: new Date().toLocaleDateString(),
                certificateCode: `EDUK-CBT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
              });
              setIsCertificateOpen(true);
            }
          }}
        />
      )}

      {/* Modals */}
      <CbtQuestionEditorModal
        isOpen={isQuestionEditorOpen}
        onClose={() => setIsQuestionEditorOpen(false)}
        questionToEdit={questionToEdit}
        schoolId={schoolId}
        subjects={subjects}
        currentUserId={userId}
        currentUserName={userName}
        showToast={showToast}
      />

      <CbtExamConfiguratorModal
        isOpen={isExamConfigOpen}
        onClose={() => setIsExamConfigOpen(false)}
        examToEdit={examToEdit}
        schoolId={schoolId}
        subjects={subjects}
        classes={classes}
        availableQuestions={questions}
        currentUserId={userId}
        currentUserName={userName}
        showToast={showToast}
      />

      <CbtProfessionalExamBuilder
        isOpen={isProfBuilderOpen}
        onClose={() => setIsProfBuilderOpen(false)}
        schoolId={schoolId}
        teacherId={userId}
        teacherName={userName}
        examToEdit={examForProfBuilder}
        existingQuestions={questions}
        subjects={subjects}
        classes={classes}
        showToast={showToast}
      />

      <CbtSecureExamPlayerModal
        isOpen={isExamPlayerOpen}
        onClose={() => setIsExamPlayerOpen(false)}
        exam={activeExamForPlayer}
        questions={questions.filter(q => activeExamForPlayer?.questionIds?.includes(q.id!) || true)}
        studentId={userId}
        studentName={userName}
        className={userClassName}
        onExamSubmitted={handleExamSubmitted}
        showToast={showToast}
      />

      <CbtCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        certificate={activeCertificate}
      />

      <CbtAiGeneratorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        schoolId={schoolId}
        subjects={subjects}
        currentUserId={userId}
        currentUserName={userName}
        showToast={showToast}
      />
    </div>
  );
};
