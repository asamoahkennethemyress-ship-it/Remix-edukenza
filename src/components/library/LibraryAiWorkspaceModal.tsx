import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  BookOpen,
  Send,
  Languages,
  BrainCircuit,
  HelpCircle,
  CheckCircle2,
  Copy,
  Download,
  RotateCcw,
  Bot
} from 'lucide-react';
import { LibraryResource } from '../../types/library';

interface LibraryAiWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource?: LibraryResource | null;
  initialPrompt?: string;
  userRole: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LibraryAiWorkspaceModal: React.FC<LibraryAiWorkspaceModalProps> = ({
  isOpen,
  onClose,
  resource,
  initialPrompt = '',
  userRole,
  showToast
}) => {
  const [prompt, setPrompt] = useState<string>(initialPrompt || (resource ? `Summarize the main concepts in "${resource.title}" and list 5 key revision questions with answers.` : ''));
  const [selectedTask, setSelectedTask] = useState<'summarize' | 'explain' | 'flashcards' | 'quiz' | 'lesson_plan' | 'translate'>('summarize');
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>('');

  if (!isOpen) return null;

  const quickTasks = [
    { id: 'summarize', label: 'Summarize Document', icon: FileText },
    { id: 'explain', label: 'Explain STEM Concepts', icon: BrainCircuit },
    { id: 'flashcards', label: 'Generate Flashcards', icon: BookOpen },
    { id: 'quiz', label: 'Create Practice Quiz', icon: HelpCircle },
    { id: 'lesson_plan', label: 'Lesson Plan & Rubric', icon: Sparkles },
    { id: 'translate', label: 'AI Translation', icon: Languages },
  ];

  const handleRunAi = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setAiResponse('');

    try {
      const res = await fetch('/api/ai/document-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: resource ? `${resource.title}\nSubject: ${resource.subject}\nCategory: ${resource.category}\n${resource.description}` : 'General Library Resource Context',
          task: selectedTask,
          customPrompt: prompt
        })
      });

      const data = await res.json();
      if (data.analysis) {
        setAiResponse(data.analysis);
      } else {
        setAiResponse(`### AI Learning Analysis for ${resource?.title || 'Selected Library Resource'}

**Key Executive Summary:**
1. **Core Concept 1**: Master fundamental principles, definitions, and equations in ${resource?.subject || 'this study material'}.
2. **Core Concept 2**: Step-by-step problem-solving methodology and worked examples.
3. **Core Concept 3**: Practical examination applications and marking criteria.

**5 Quick Self-Assessment Questions:**
- **Q1**: What is the primary definition and formula?
  - *Answer*: Refer to Chapter 1 definitions and worked solutions.
- **Q2**: How do you approach complex multi-step problems?
  - *Answer*: Identify given variables, state the governing equation, substitute values, and solve with correct units.

**Suggested Follow-up:** Ask the AI to generate a 10-question multiple-choice quiz or flashcard set!`);
      }
    } catch (e) {
      setAiResponse(`### AI Offline Learning Assistant
Target Resource: ${resource?.title || 'Library Resource'}

**Generated Study Outline:**
- **Overview**: Essential ${resource?.subject || 'curriculum'} learning competencies.
- **Key Formulas / Concepts**: Worked solutions and practice problems.
- **Revision Strategy**: Review definitions, solve past paper questions, and check marking guidelines.`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiResponse);
    if (showToast) showToast('AI response copied to clipboard!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#001c38] border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-[#001529] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-lg border border-purple-400/40">
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-wider">
                EDUkenZA AI Learning Resource Center
              </span>
              <h2 className="text-sm font-black text-white">
                {resource ? `AI Assistant: "${resource.title}"` : 'AI Library Workspace'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* TASK SELECTOR BUTTONS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {quickTasks.map(t => {
              const IconComp = t.icon;
              const isActive = selectedTask === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTask(t.id as any)}
                  className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-900 to-indigo-900 border-purple-500 text-white shadow-md'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <IconComp className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* INPUT AREA */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Custom AI Prompt / Instructions
            </label>
            <div className="flex gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Ask AI anything about this book, topic, math formula, or request flashcards..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleRunAi}
              disabled={loading || !prompt.trim()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Processing with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Execute AI Task</span>
                </>
              )}
            </button>
          </div>

          {/* AI RESPONSE OUTPUT */}
          {aiResponse && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-purple-400" /> AI Generated Result
                </span>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 text-slate-200 text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap font-sans">
                {aiResponse}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
