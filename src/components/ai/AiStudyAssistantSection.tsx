import React, { useState } from 'react';
import { Sparkles, RefreshCw, Send, Copy, BookOpen, Lightbulb, Code, CheckCircle, ChevronRight } from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';

export interface AiStudyAssistantSectionProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiStudyAssistantSection: React.FC<AiStudyAssistantSectionProps> = ({ showToast }) => {
  const [problemInput, setProblemInput] = useState('Solve for x in the quadratic equation: 2x² - 8x + 6 = 0');
  const [subject, setSubject] = useState<'math' | 'physics' | 'chemistry' | 'coding' | 'essay'>('math');
  const [mode, setMode] = useState<'step_by_step' | 'hint_only' | 'explain_concept'>('step_by_step');
  const [isSolving, setIsSolving] = useState(false);
  const [solutionResult, setSolutionResult] = useState<string | null>(null);

  const handleSolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemInput.trim() || isSolving) return;

    setIsSolving(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `STUDY ASSISTANT REQUEST:
Problem/Question: ${problemInput}
Subject Domain: ${subject}
Learning Mode: ${mode}

Please provide student-guided, encouraging feedback. Use KaTeX math notation ($...$ and $$...$$ for equations), chemical formulas, and code blocks where relevant. If mode is "hint_only", give a helpful hint to get started rather than solving it completely. If "step_by_step", break down into clear logical steps.`,
          role: 'student',
          targetTask: subject === 'math' || subject === 'physics' ? 'math' : 'general'
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || 'Study Assistant API error.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  fullText += parsed.text;
                  setSolutionResult(fullText);
                }
              } catch (err) {}
            }
          }
        }
      }

      if (!fullText) {
        setSolutionResult('Analysis completed.');
      }
      showToast('Study explanation generated!', 'success');
    } catch (err: any) {
      console.error('Study assistant error:', err);
      showToast('Error generating explanation: ' + (err?.message || 'Check connection'), 'error');
    } finally {
      setIsSolving(false);
    }
  };

  const copySolution = () => {
    if (solutionResult) {
      navigator.clipboard.writeText(solutionResult);
      showToast('Solution copied to clipboard!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white p-6 rounded-3xl border border-[#D4AF37]/40 shadow-md flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-black tracking-tight">AI Socratic Study Assistant & Problem Solver</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Step-by-step guidance for Mathematics (KaTeX), Physics, Chemistry, Essay refinement, and Computer Science.
          </p>
        </div>

        <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-xs font-black">
          Socratic Learning Mode
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INPUT */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <form onSubmit={handleSolve} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e: any) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                <option value="math">Mathematics (Algebra, Calculus, Geometry)</option>
                <option value="physics">Physics (Kinematics, Electricity, Forces)</option>
                <option value="chemistry">Chemistry (Reactions, Stoichiometry, Organic)</option>
                <option value="coding">Computer Science & Python/JavaScript</option>
                <option value="essay">Essay Improvement & Grammar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Guidance Mode</label>
              <select
                value={mode}
                onChange={(e: any) => setMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                <option value="step_by_step">Step-by-Step Explanation</option>
                <option value="hint_only">Socratic Hint Only (Encourage Thinking)</option>
                <option value="explain_concept">Explain Core Concept with Analogy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Problem / Homework Question *</label>
              <textarea
                rows={5}
                value={problemInput}
                onChange={e => setProblemInput(e.target.value)}
                placeholder="Paste or type your question here..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <button
              type="submit"
              disabled={isSolving || !problemInput.trim()}
              className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSolving ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
              <span>{isSolving ? 'Solving Step-by-Step...' : 'Guide Me Step-by-Step'}</span>
            </button>
          </form>
        </div>

        {/* OUTPUT */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[450px]">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">Guided Educational Solution</h3>
              
              {solutionResult && (
                <button
                  onClick={copySolution}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {isSolving && !solutionResult ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#002147] mx-auto" />
                <p className="text-xs font-bold text-slate-700">Formulating step-by-step Socratic solution and LaTeX equations...</p>
              </div>
            ) : solutionResult ? (
              <MathScienceRenderer content={solutionResult} />
            ) : (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <Lightbulb className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Enter your question and click "Guide Me Step-by-Step".</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
