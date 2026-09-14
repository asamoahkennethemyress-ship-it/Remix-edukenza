import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Brain, 
  Check, 
  X,
  Copy,
  Wand2
} from 'lucide-react';
import { LmsService } from '../../services/lmsService';

interface LmsAiAssistantModalProps {
  userRole: 'school_admin' | 'teacher' | 'student' | 'parent';
  onClose: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LmsAiAssistantModal: React.FC<LmsAiAssistantModalProps> = ({
  userRole,
  onClose,
  showToast
}) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'tutor' | 'math' | 'summary' | 'teacher_quiz' | 'lesson_plan'>('tutor');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse(null);

    const result = await LmsService.generateAiResponse(prompt, mode);
    setResponse(result);
    setLoading(false);
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      showToast?.('Copied to clipboard!', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title Banner */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">EDUkenZA AI Learning Assistant</h2>
            <p className="text-xs text-slate-500 font-medium">
              {userRole === 'teacher' || userRole === 'school_admin'
                ? 'Generate lesson plans, marking schemes, and custom quizzes.'
                : 'Solve math equations, summarize lessons, and generate flashcard notes.'}
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setMode('tutor')}
            className={`px-3.5 py-2 rounded-xl border transition-all ${
              mode === 'tutor'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Ask AI Tutor
          </button>
          <button
            onClick={() => setMode('math')}
            className={`px-3.5 py-2 rounded-xl border transition-all ${
              mode === 'math'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Solve Math & Science
          </button>
          <button
            onClick={() => setMode('summary')}
            className={`px-3.5 py-2 rounded-xl border transition-all ${
              mode === 'summary'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Study Notes & Flashcards
          </button>

          {(userRole === 'teacher' || userRole === 'school_admin') && (
            <>
              <button
                onClick={() => setMode('teacher_quiz')}
                className={`px-3.5 py-2 rounded-xl border transition-all ${
                  mode === 'teacher_quiz'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Generate Quiz
              </button>
              <button
                onClick={() => setMode('lesson_plan')}
                className={`px-3.5 py-2 rounded-xl border transition-all ${
                  mode === 'lesson_plan'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Lesson Plan
              </button>
            </>
          )}
        </div>

        {/* Form Input */}
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                mode === 'math'
                  ? 'e.g. Solve 2x^2 + 5x - 3 = 0 step by step...'
                  : mode === 'summary'
                  ? 'e.g. Create flashcards for photosynthesis and cellular respiration...'
                  : mode === 'teacher_quiz'
                  ? 'e.g. Generate a 5 question quiz on Newton’s 2nd Law of Motion...'
                  : 'Ask EDUkenZA AI any question about your course topic...'
              }
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              {loading ? 'AI Thinking...' : 'Generate with AI'}
            </button>
          </div>
        </form>

        {/* AI Output Result Box */}
        {response && (
          <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 text-xs space-y-3 max-h-72 overflow-y-auto border border-slate-800 font-mono leading-relaxed shadow-inner relative">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-[10px] flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy
            </button>
            <div className="pr-12 whitespace-pre-wrap">{response}</div>
          </div>
        )}
      </div>
    </div>
  );
};
