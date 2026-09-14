import React, { useState } from 'react';
import { X, Sparkles, BrainCircuit, CheckCircle2, Layers } from 'lucide-react';
import { CbtBloomTaxonomy, CbtDifficulty, CbtQuestion } from '../../types/cbt';
import { CbtService } from '../../services/cbtService';

interface CbtAiGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  subjects: any[];
  currentUserId: string;
  currentUserName: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CbtAiGeneratorModal: React.FC<CbtAiGeneratorModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  subjects,
  currentUserId,
  currentUserName,
  showToast
}) => {
  const [subjectName, setSubjectName] = useState('Mathematics');
  const [topic, setTopic] = useState('');
  const [classGrade, setClassGrade] = useState('Grade 10');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<CbtDifficulty>('Medium');
  const [bloomLevel, setBloomLevel] = useState<CbtBloomTaxonomy>('Applying');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      showToast('Please specify a topic or curriculum module', 'error');
      return;
    }

    setLoading(true);
    try {
      const generated = await CbtService.generateAiQuestions(
        subjectName,
        topic,
        classGrade,
        count,
        difficulty,
        bloomLevel
      );

      let savedCount = 0;
      for (const item of generated) {
        await CbtService.createQuestion({
          schoolId,
          subjectId: 'sub_gen',
          subjectName,
          classGrade,
          title: item.title || `AI Generated Question on ${topic}`,
          type: item.type || 'mcq',
          difficulty: item.difficulty || difficulty,
          bloomLevel: item.bloomLevel || bloomLevel,
          points: item.points || 5,
          options: item.options || [],
          explanation: item.explanation || '',
          markingScheme: item.markingScheme || '',
          tags: item.tags || [subjectName, topic, 'AI Generated'],
          authorId: currentUserId,
          authorName: `${currentUserName} (AI)`
        });
        savedCount++;
      }

      showToast(`EDUkenZA AI generated & added ${savedCount} questions to Question Bank!`, 'success');
      onClose();
    } catch (err) {
      showToast('AI Question Generation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">EDUkenZA AI CBT Question Generator</h3>
              <p className="text-xs text-amber-100">Automatic Question & Answer Generation with Gemini API</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-amber-100 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleGenerate} className="p-6 space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Subject</label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={e => setSubjectName(e.target.value)}
              placeholder="e.g. Mathematics, Chemistry, Physical Sciences"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 mb-1 block">Topic / Curriculum Concept</label>
            <input
              type="text"
              required
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Quadratic Equations, Newton's Third Law, Photosynthesis"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-[#002147]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Grade Level</label>
              <select
                value={classGrade}
                onChange={e => setClassGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Number of Questions</label>
              <select
                value={count}
                onChange={e => setCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-amber-700"
              >
                <option value={1}>1 Question</option>
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as CbtDifficulty)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">Bloom's Taxonomy</label>
              <select
                value={bloomLevel}
                onChange={e => setBloomLevel(e.target.value as CbtBloomTaxonomy)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
              >
                <option value="Remembering">Remembering</option>
                <option value="Understanding">Understanding</option>
                <option value="Applying">Applying</option>
                <option value="Analyzing">Analyzing</option>
                <option value="Evaluating">Evaluating</option>
                <option value="Creating">Creating</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              {loading ? 'AI Generating...' : 'Generate Questions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
