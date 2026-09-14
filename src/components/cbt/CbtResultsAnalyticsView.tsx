import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  BarChart2, 
  BookOpen, 
  Sparkles, 
  Printer, 
  Download, 
  Clock, 
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Brain,
  FileCheck
} from 'lucide-react';
import { CbtAttempt, CbtExamConfig, CbtQuestion } from '../../types/cbt';

interface CbtResultsAnalyticsViewProps {
  attempt: CbtAttempt | null;
  exam?: CbtExamConfig | null;
  questions?: CbtQuestion[];
  onOpenCertificate?: () => void;
  onBack?: () => void;
}

export const CbtResultsAnalyticsView: React.FC<CbtResultsAnalyticsViewProps> = ({
  attempt,
  exam,
  questions = [],
  onOpenCertificate,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'review' | 'ai_study' | 'integrity'>('summary');

  if (!attempt) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-200">
        No CBT examination attempt results selected.
      </div>
    );
  }

  const isPass = attempt.passed;
  const violationCount = attempt.violationCount || attempt.securityViolations?.length || 0;
  const integrityScore = Math.max(0, 100 - violationCount * 25);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className={`p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 ${
        isPass ? 'bg-gradient-to-r from-[#002147] via-slate-900 to-emerald-950 border border-emerald-500/30' : 'bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 border border-rose-500/30'
      }`}>
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-xs font-bold text-[#D4AF37]">
            <Award className="w-3.5 h-3.5" /> Official CBT Result Record
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{attempt.examTitle}</h2>
          <p className="text-xs text-slate-300">
            Student: <strong className="text-white">{attempt.studentName}</strong> • Class: <strong className="text-white">{attempt.className}</strong> • Subject: <strong className="text-white">{attempt.subjectName}</strong>
          </p>
        </div>

        {/* Score Pill & Badge */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall Score</span>
            <div className="text-3xl sm:text-4xl font-black text-[#D4AF37]">
              {attempt.percentageScore}%
            </div>
            <span className="text-xs text-slate-300 font-medium">{attempt.totalScoreObtained} / {attempt.maxPossibleScore} Points</span>
          </div>

          <div className={`p-4 rounded-2xl flex flex-col items-center justify-center border shadow-inner ${
            isPass ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-rose-500/20 border-rose-400 text-rose-300'
          }`}>
            <span className="text-xs font-black uppercase tracking-widest">{attempt.grade} Grade</span>
            <span className="text-[10px] font-bold mt-0.5 uppercase">{isPass ? 'Passed' : 'Needs Review'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
              activeTab === 'summary' ? 'bg-[#002147] text-[#D4AF37]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Performance Overview
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
              activeTab === 'review' ? 'bg-[#002147] text-[#D4AF37]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Questions & Answers Review
          </button>
          <button
            onClick={() => setActiveTab('integrity')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'integrity'
                ? 'bg-amber-600 text-white'
                : violationCount > 0
                ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Exam Integrity Audit ({violationCount} Violations)
          </button>
          <button
            onClick={() => setActiveTab('ai_study')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ai_study' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" /> AI Study & Flashcards
          </button>
        </div>

        {attempt.certificateIssued && onOpenCertificate && (
          <button
            onClick={onOpenCertificate}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-500 text-[#002147] font-bold rounded-2xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Award className="w-4 h-4" /> View Certificate
          </button>
        )}
      </div>

      {/* Tab 1: Summary */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Key Metrics */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Spent</span>
                <p className="text-lg font-black text-[#002147] flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {Math.floor(attempt.timeSpentSeconds / 60)}m {attempt.timeSpentSeconds % 60}s
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Passing Threshold</span>
                <p className="text-lg font-black text-emerald-700 mt-1">
                  {exam?.passingScorePercentage || 50}% Required
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Log</span>
                <p className="text-lg font-black text-slate-700 flex items-center gap-1.5 mt-1">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  {attempt.violationCount} Alerts
                </p>
              </div>
            </div>

            {/* Strengths & Weaknesses Analysis */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#002147] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Topic & Learning Outcome Breakdown
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-2">
                  <span className="text-xs font-bold text-emerald-900 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Demonstrated Strengths
                  </span>
                  <ul className="text-xs text-emerald-800 space-y-1 list-disc list-inside font-medium">
                    {attempt.strengths?.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                  <span className="text-xs font-bold text-amber-900 block flex items-center gap-1.5">
                    <Brain className="w-4 h-4 text-amber-600" /> Target Areas for Revision
                  </span>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside font-medium">
                    {attempt.weaknesses?.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Comments & AI Recommendation */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teacher Feedback</h3>
              <p className="text-xs text-slate-700 italic bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                "{attempt.teacherComments || 'Good effort. Review incorrect questions in the detailed review tab.'}"
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-6 rounded-3xl text-white shadow-md space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-100">
                <Sparkles className="w-4 h-4 text-amber-200" /> EDUkenZA AI Tutor Recommendation
              </div>
              <p className="text-xs leading-relaxed text-amber-50 font-medium">
                {attempt.aiStudyPlan || 'Focus on reviewing quadratic factoring rules and physical forces equations to improve mastery.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Review Questions & Answers */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {questions.length > 0 ? (
            questions.map((q, idx) => {
              const studentAns = attempt.answers?.[q.id!];
              const scoreAwarded = studentAns?.scoreAwarded || 0;
              const isCorrect = scoreAwarded > 0;

              return (
                <div key={q.id || idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-[#002147] font-black rounded-xl text-xs">
                        Question {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-400">({q.points} Points)</span>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                      <span>{scoreAwarded} / {q.points} Pts</span>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-slate-800">{q.title}</p>

                  {/* Options status */}
                  {q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                      {q.options.map(opt => {
                        const isStudentSel = studentAns?.selectedOptionIds?.includes(opt.id);
                        const isCorrectKey = opt.isCorrect;

                        let style = 'bg-slate-50 border-slate-200 text-slate-600';
                        if (isCorrectKey) style = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                        else if (isStudentSel && !isCorrectKey) style = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';

                        return (
                          <div key={opt.id} className={`p-2.5 rounded-xl border flex items-center justify-between ${style}`}>
                            <span>{opt.text}</span>
                            {isCorrectKey && <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Correct Key</span>}
                            {isStudentSel && !isCorrectKey && <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">Your Choice</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 pt-2">
                      <strong className="text-[#002147] block mb-0.5">Explanation:</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-slate-400 py-8">Detailed question list unavailable.</p>
          )}
        </div>
      )}

      {/* Tab 3: Security & Exam Integrity Audit */}
      {activeTab === 'integrity' && (
        <div className="space-y-6">
          {/* Integrity Header Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                violationCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002147]">Exam Integrity Audit & Proctoring Log</h3>
                <p className="text-xs text-slate-500">
                  Comprehensive anti-cheating telemetry, tab switch logs, full-screen events, and answer velocity audit.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Session Integrity Rating</span>
                <span className={`text-xl font-black ${
                  violationCount === 0 ? 'text-emerald-600' : violationCount < 3 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {violationCount === 0 ? '100% Verified Clean' : `${violationCount} Violations Recorded`}
                </span>
              </div>
            </div>
          </div>

          {/* Violation Details & Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Violations Breakdown */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Security Violations ({attempt.securityViolations?.length || 0})</span>
                <span className="text-slate-500 font-normal text-[11px]">Recorded by Client Engine</span>
              </h4>

              {attempt.securityViolations && attempt.securityViolations.length > 0 ? (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {attempt.securityViolations.map((v, idx) => (
                    <div key={idx} className="p-3 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs flex items-start gap-3">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-950 uppercase text-[10px] bg-rose-200 px-2 py-0.5 rounded-md">
                            {v.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{v.timestamp}</span>
                        </div>
                        <p className="text-rose-900 mt-1 font-medium">{v.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center text-xs text-emerald-800 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold">No Security Violations Detected</p>
                  <p className="text-emerald-700 text-[11px]">
                    Student remained in full-screen mode without leaving the browser tab or attempting copy/paste.
                  </p>
                </div>
              )}
            </div>

            {/* Time Spent per Question Velocity Audit */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Question Response Velocity & Time Spent
              </h4>

              {attempt.timeSpentPerQuestion && Object.keys(attempt.timeSpentPerQuestion).length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {Object.entries(attempt.timeSpentPerQuestion).map(([qId, sec], idx) => {
                    const durationSec = typeof sec === 'number' ? sec : Number(sec) || 0;
                    const isSuspiciouslyFast = durationSec < 3;
                    return (
                      <div
                        key={qId}
                        className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                          isSuspiciouslyFast ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold">Question #{idx + 1}</span>
                          {isSuspiciouslyFast && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                              Fast Completion (&lt; 3s)
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-[#002147]">{durationSec} seconds</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                  Total Exam Time: {Math.floor(attempt.timeSpentSeconds / 60)} minutes {attempt.timeSpentSeconds % 60} seconds.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: AI Flashcards & Study Plan */}
      {activeTab === 'ai_study' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#002147]">AI Exam Revision & Flashcard Engine</h3>
              <p className="text-xs text-slate-500">Personalized smart flashcards generated from missed questions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-3">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-bold uppercase">Flashcard #1</span>
              <h4 className="text-sm font-bold text-[#D4AF37]">Newton's Third Law Force Interaction</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Q:</strong> Do action-reaction force pairs cancel each other?
              </p>
              <div className="p-3 bg-slate-800 rounded-xl text-xs text-emerald-300 border border-slate-700">
                <strong>Ans:</strong> No. They act on <em>different</em> objects, so they never cancel each other out on a single object.
              </div>
            </div>

            <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-3">
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-bold uppercase">Flashcard #2</span>
              <h4 className="text-sm font-bold text-[#D4AF37]">Quadratic Discriminant Check</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Q:</strong> What is the discriminant formula for $ax^2 + bx + c = 0$?
              </p>
              <div className="p-3 bg-slate-800 rounded-xl text-xs text-emerald-300 border border-slate-700">
                <strong>Ans:</strong> $\Delta = b^2 - 4ac$. If $\Delta &gt; 0$, there are 2 real distinct roots.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
