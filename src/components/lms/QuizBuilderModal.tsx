import React, { useState } from 'react';
import { X, HelpCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { LmsQuiz, LmsQuestion, QuestionType } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface QuizBuilderModalProps {
  courseId: string;
  schoolId: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onSaved: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const QuizBuilderModal: React.FC<QuizBuilderModalProps> = ({
  courseId,
  schoolId,
  currentUserId,
  currentUserName,
  onClose,
  onSaved,
  showToast
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<LmsQuestion[]>([
    {
      id: 'q_1',
      type: 'multiple_choice',
      questionText: 'Sample Question 1',
      points: 5,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Explanation for correct choice.'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleAddQuestion = () => {
    const newQ: LmsQuestion = {
      id: `q_${Date.now()}`,
      type: 'multiple_choice',
      questionText: 'New Question',
      points: 5,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: 'Option 1'
    };
    setQuestions(prev => [...prev, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || questions.length === 0) return;

    setLoading(true);

    const totalPts = questions.reduce((acc, q) => acc + q.points, 0);

    await LmsService.createQuiz({
      courseId,
      schoolId,
      title,
      description,
      timeLimitMinutes: Number(timeLimitMinutes),
      passingScore: Number(passingScore),
      randomizeQuestions: true,
      randomizeAnswers: true,
      totalPoints: totalPts,
      status: 'published',
      authorId: currentUserId,
      authorName: currentUserName,
      questions
    });

    setLoading(false);
    showToast?.('Quiz created & published!', 'success');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Quiz Builder Engine</h3>
            <p className="text-xs text-slate-500">
              Create randomized quizzes across 7 question types with auto-grading.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase">Quiz Title</label>
            <input
              type="text"
              required
              placeholder="e.g. End of Unit Assessment"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Time Limit (Minutes)</label>
              <input
                type="number"
                value={timeLimitMinutes}
                onChange={e => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Passing Score (%)</label>
              <input
                type="number"
                value={passingScore}
                onChange={e => setPassingScore(Number(e.target.value))}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Questions ({questions.length})</h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(idx)}
                  className="absolute top-3 right-3 text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-indigo-600">Q{idx + 1}</span>
                  <select
                    value={q.type}
                    onChange={e => {
                      const updated = [...questions];
                      updated[idx].type = e.target.value as QuestionType;
                      setQuestions(updated);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-xs font-medium"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay</option>
                    <option value="fill_blank">Fill in Blank</option>
                    <option value="multiple_select">Multiple Select</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Question text..."
                  value={q.questionText}
                  onChange={e => {
                    const updated = [...questions];
                    updated[idx].questionText = e.target.value;
                    setQuestions(updated);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              {loading ? 'Creating...' : 'Publish Quiz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
