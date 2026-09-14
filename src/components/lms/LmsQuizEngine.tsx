import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Award,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { LmsQuiz, LmsQuestion, LmsQuizAttempt } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface LmsQuizEngineProps {
  quiz: LmsQuiz;
  currentUserId: string;
  currentUserName: string;
  onComplete: (attempt: LmsQuizAttempt) => void;
  onBack: () => void;
}

export const LmsQuizEngine: React.FC<LmsQuizEngineProps> = ({
  quiz,
  currentUserId,
  currentUserName,
  onComplete,
  onBack
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(quiz.timeLimitMinutes > 0 ? quiz.timeLimitMinutes * 60 : 0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [attemptResult, setAttemptResult] = useState<LmsQuizAttempt | null>(null);

  // Timer effect
  useEffect(() => {
    if (quiz.timeLimitMinutes <= 0 || isSubmitted) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz.timeLimitMinutes, isSubmitted]);

  const questions = quiz.questions;
  const currentQ = questions[currentQuestionIndex];

  const handleSelectOption = (qId: string, value: any) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const handleToggleMultipleSelect = (qId: string, option: string) => {
    if (isSubmitted) return;
    const currentList: string[] = userAnswers[qId] || [];
    const updated = currentList.includes(option)
      ? currentList.filter(o => o !== option)
      : [...currentList, option];
    setUserAnswers(prev => ({ ...prev, [qId]: updated }));
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    let totalScore = 0;
    let earnedPoints = 0;

    questions.forEach(q => {
      totalScore += q.points;
      const ans = userAnswers[q.id];

      if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'fill_blank') {
        if (String(ans).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
          earnedPoints += q.points;
        }
      } else if (q.type === 'short_answer') {
        if (String(ans || '').trim().toLowerCase().includes(String(q.correctAnswer || '').trim().toLowerCase())) {
          earnedPoints += q.points;
        }
      } else if (q.type === 'multiple_select') {
        const correctList = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        const studentList = Array.isArray(ans) ? ans : [];
        const isMatch = correctList.length === studentList.length && correctList.every(c => studentList.includes(c));
        if (isMatch) earnedPoints += q.points;
      } else if (q.type === 'essay') {
        // Essay awarded partial credit by default until manual teacher grade
        earnedPoints += Math.round(q.points * 0.7);
      }
    });

    const percentage = Math.round((earnedPoints / Math.max(totalScore, 1)) * 100);
    const passed = percentage >= quiz.passingScore;

    const attemptData: Omit<LmsQuizAttempt, 'id'> = {
      quizId: quiz.id,
      courseId: quiz.courseId,
      schoolId: quiz.schoolId,
      studentId: currentUserId,
      studentName: currentUserName,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeSpentSeconds: quiz.timeLimitMinutes > 0 ? (quiz.timeLimitMinutes * 60) - timeLeftSeconds : 0,
      answers: userAnswers,
      score: earnedPoints,
      totalPoints: totalScore,
      percentage,
      passed,
      graded: true
    };

    const savedAttempt = await LmsService.submitQuizAttempt(attemptData);
    setAttemptResult(savedAttempt);
    onComplete(savedAttempt);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isSubmitted && attemptResult) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
          attemptResult.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
        }`}>
          {attemptResult.passed ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {attemptResult.passed ? 'Quiz Passed 🎉' : 'Needs Improvement'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {quiz.title}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <div>
            <div className="text-2xl font-black text-slate-900">{attemptResult.percentage}%</div>
            <div className="text-xs text-slate-500 font-medium">Score</div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-600">{attemptResult.score} / {attemptResult.totalPoints}</div>
            <div className="text-xs text-slate-500 font-medium">Points</div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{quiz.passingScore}%</div>
            <div className="text-xs text-slate-500 font-medium">Pass Requirement</div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <button onClick={onBack} className="text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Exit Quiz
        </button>

        <div className="text-sm font-bold text-slate-800">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>

        {quiz.timeLimitMinutes > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 font-mono text-xs font-bold border border-amber-200">
            <Clock className="w-4 h-4" /> {formatTime(timeLeftSeconds)}
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between text-xs font-semibold text-indigo-600">
          <span className="uppercase tracking-wider">
            {currentQ.type.replace('_', ' ')}
          </span>
          <span>{currentQ.points} Points</span>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
          {currentQ.questionText}
        </h3>

        {/* Answer Options according to type */}
        <div className="space-y-3 pt-2">
          {currentQ.type === 'multiple_choice' && currentQ.options?.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectOption(currentQ.id, opt)}
              className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between ${
                userAnswers[currentQ.id] === opt
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                  : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span>{opt}</span>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                userAnswers[currentQ.id] === opt ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
              }`}>
                {userAnswers[currentQ.id] === opt && '✓'}
              </div>
            </button>
          ))}

          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              {[true, false].map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(currentQ.id, val)}
                  className={`p-5 rounded-2xl border font-bold text-sm text-center transition-all ${
                    userAnswers[currentQ.id] === val
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {val ? 'TRUE' : 'FALSE'}
                </button>
              ))}
            </div>
          )}

          {(currentQ.type === 'short_answer' || currentQ.type === 'fill_blank') && (
            <input
              type="text"
              value={userAnswers[currentQ.id] || ''}
              onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          )}

          {currentQ.type === 'essay' && (
            <textarea
              rows={5}
              value={userAnswers[currentQ.id] || ''}
              onChange={(e) => handleSelectOption(currentQ.id, e.target.value)}
              placeholder="Write your explanation or essay response..."
              className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-900"
            />
          )}

          {currentQ.type === 'multiple_select' && currentQ.options?.map((opt, idx) => {
            const selectedList: string[] = userAnswers[currentQ.id] || [];
            const isSelected = selectedList.includes(opt);
            return (
              <button
                key={idx}
                onClick={() => handleToggleMultipleSelect(currentQ.id, opt)}
                className={`w-full text-left p-4 rounded-2xl border text-sm font-medium transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                    : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{opt}</span>
                <div className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {isSelected && '✓'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nav Controls */}
      <div className="flex items-center justify-between">
        <button
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-40"
        >
          Previous
        </button>

        {currentQuestionIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            Next Question
          </button>
        ) : (
          <button
            onClick={handleSubmitQuiz}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
};
