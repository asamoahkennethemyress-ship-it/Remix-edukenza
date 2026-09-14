import React, { useState } from 'react';
import { BookOpen, Sparkles, RefreshCw, Copy, FileText, Check, Download, Layers } from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';

export interface AiLessonPlannerSectionProps {
  onInsertToAssignment?: (text: string, imageUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiLessonPlannerSection: React.FC<AiLessonPlannerSectionProps> = ({
  onInsertToAssignment,
  showToast
}) => {
  const [grade, setGrade] = useState('Grade 10');
  const [subject, setSubject] = useState('Life Sciences / Biology');
  const [topic, setTopic] = useState('Cell Structure & Function (Organelles)');
  const [duration, setDuration] = useState('60 Minutes');
  const [curriculum, setCurriculum] = useState('CAPS / IEB');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonPlanResult, setLessonPlanResult] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/lesson-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade,
          subject,
          topic,
          duration,
          curriculum
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Lesson planner API error.');
      }
      if (data.lessonPlan) {
        setLessonPlanResult(data.lessonPlan);
        showToast('Comprehensive lesson plan created!', 'success');
      }
    } catch (err: any) {
      console.error('Lesson plan error:', err);
      showToast('Error generating plan: ' + (err?.message || 'Check connection'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPlan = () => {
    if (lessonPlanResult) {
      navigator.clipboard.writeText(lessonPlanResult);
      showToast('Lesson plan copied to clipboard!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white p-6 rounded-3xl border border-[#D4AF37]/40 shadow-md flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-black tracking-tight">AI Teacher Lesson Planner & Curriculum Suite</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Generate CAPS/IEB aligned weekly lesson plans, learning objectives, practical activities, rubrics & PowerPoint outlines.
          </p>
        </div>

        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-black">
          CAPS / IEB Aligned
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Grade / Class Level</label>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
              >
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12 (Matric)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Life Sciences / Physical Sciences / Mathematics"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Lesson Topic *</label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis & Cellular Energy Transfer"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Curriculum</label>
                <select
                  value={curriculum}
                  onChange={e => setCurriculum(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
                >
                  <option value="CAPS / IEB">CAPS / IEB</option>
                  <option value="Cambridge International">Cambridge</option>
                  <option value="IB Diploma">IB Diploma</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
              <span>{isGenerating ? 'Generating Lesson Plan...' : 'Generate Full Lesson Plan'}</span>
            </button>
          </form>
        </div>

        {/* OUTPUT */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">Generated Lesson Plan Document</h3>
              
              {lessonPlanResult && (
                <div className="flex gap-2">
                  <button
                    onClick={copyPlan}
                    className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>

                  {onInsertToAssignment && (
                    <button
                      onClick={() => onInsertToAssignment(lessonPlanResult)}
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
                <p className="text-xs font-bold text-slate-700">Designing CAPS objectives, timing, practical experiments & rubrics...</p>
              </div>
            ) : lessonPlanResult ? (
              <MathScienceRenderer content={lessonPlanResult} />
            ) : (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Click "Generate Full Lesson Plan" to create classroom materials.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
