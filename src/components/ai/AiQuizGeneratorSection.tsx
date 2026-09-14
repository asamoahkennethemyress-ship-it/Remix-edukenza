import React, { useState } from 'react';
import { HelpCircle, Sparkles, RefreshCw, Copy, FileText, Check, Download, Image as ImageIcon } from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';

export interface AiQuizGeneratorSectionProps {
  onInsertToAssignment?: (text: string, imageUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiQuizGeneratorSection: React.FC<AiQuizGeneratorSectionProps> = ({
  onInsertToAssignment,
  showToast
}) => {
  const [topic, setTopic] = useState('Photosynthesis & Plant Anatomy');
  const [grade, setGrade] = useState('Grade 10');
  const [subject, setSubject] = useState('Life Sciences');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizResult, setQuizResult] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/quiz-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          grade,
          subject,
          numQuestions,
          difficulty
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Quiz generator API error.');
      }
      if (data.quiz) {
        setQuizResult(data.quiz);
        showToast('Quiz & Marking Scheme generated!', 'success');
      }
    } catch (err: any) {
      console.error('Quiz error:', err);
      showToast('Error generating quiz: ' + (err?.message || 'Check connection'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyQuiz = () => {
    if (quizResult) {
      navigator.clipboard.writeText(quizResult);
      showToast('Quiz copied to clipboard!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white p-6 rounded-3xl border border-[#D4AF37]/40 shadow-md flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-black tracking-tight">AI Quiz & Assignment Generator</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Generate custom school quizzes, exams, worksheets, teacher marking memorandums, and assessment rubrics.
          </p>
        </div>

        <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black">
          With Marking Memorandum
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Topic *</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Chemical Equilibrium & Reaction Rates"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Grade</label>
                <select
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
                >
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Questions</label>
                <select
                  value={numQuestions}
                  onChange={e => setNumQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                <option value="Easy">Easy (Foundational)</option>
                <option value="Medium">Medium (Application)</option>
                <option value="Hard">Hard (Exemplar / Exam Level)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
              <span>{isGenerating ? 'Creating Quiz...' : 'Generate Quiz & Memo'}</span>
            </button>
          </form>
        </div>

        {/* OUTPUT */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[450px]">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">Generated Quiz & Memorandum</h3>
              
              {quizResult && (
                <div className="flex gap-2">
                  <button
                    onClick={copyQuiz}
                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>

                  {onInsertToAssignment && (
                    <button
                      onClick={() => onInsertToAssignment(quizResult)}
                      className="px-3 py-1 bg-[#002147] hover:bg-[#003366] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Insert in Assignment</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {isGenerating ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#002147] mx-auto" />
                <p className="text-xs font-bold text-slate-700">Formulating questions, memorandum answers, and rubric criteria...</p>
              </div>
            ) : quizResult ? (
              <MathScienceRenderer content={quizResult} />
            ) : (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Click "Generate Quiz & Memo" to create student assessments.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
