import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Sparkles, 
  Download, 
  Upload, 
  Edit, 
  Copy, 
  Trash2, 
  Archive, 
  Layers, 
  Award,
  CheckCircle2,
  FileSpreadsheet,
  BrainCircuit,
  HelpCircle,
  Tag
} from 'lucide-react';
import { CbtQuestion, CbtQuestionType, CbtDifficulty, CbtBloomTaxonomy } from '../../types/cbt';
import { CbtService } from '../../services/cbtService';
import { CbtMathRenderer } from './CbtMathRenderer';

interface CbtQuestionBankViewProps {
  questions: CbtQuestion[];
  subjects: any[];
  schoolId?: string;
  onOpenCreateQuestion: () => void;
  onEditQuestion: (q: CbtQuestion) => void;
  onOpenAiGenerator: () => void;
  currentUserId: string;
  currentUserName: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CbtQuestionBankView: React.FC<CbtQuestionBankViewProps> = ({
  questions,
  subjects,
  schoolId = '',
  onOpenCreateQuestion,
  onEditQuestion,
  onOpenAiGenerator,
  currentUserId,
  currentUserName,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedBloom, setSelectedBloom] = useState('ALL');

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = !searchTerm || 
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        q.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSubject = selectedSubject === 'ALL' || q.subjectId === selectedSubject || q.subjectName === selectedSubject;
      const matchesType = selectedType === 'ALL' || q.type === selectedType;
      const matchesDifficulty = selectedDifficulty === 'ALL' || q.difficulty === selectedDifficulty;
      const matchesBloom = selectedBloom === 'ALL' || q.bloomLevel === selectedBloom;

      return matchesSearch && matchesSubject && matchesType && matchesDifficulty && matchesBloom;
    });
  }, [questions, searchTerm, selectedSubject, selectedType, selectedDifficulty, selectedBloom]);

  const handleDuplicate = async (q: CbtQuestion) => {
    try {
      await CbtService.duplicateQuestion(q, currentUserName, currentUserId);
      showToast('Question duplicated successfully!', 'success');
    } catch (err) {
      showToast('Failed to duplicate question', 'error');
    }
  };

  const handleDelete = async (qId: string) => {
    if (confirm('Are you sure you want to delete this question from the Question Bank?')) {
      try {
        await CbtService.deleteQuestion(qId);
        showToast('Question deleted', 'info');
      } catch (err) {
        showToast('Failed to delete question', 'error');
      }
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredQuestions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CBT_Question_Bank_Export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${filteredQuestions.length} questions to JSON!`, 'success');
  };

  const handleImportJSONClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const targetSchoolId = schoolId || questions[0]?.schoolId;
          if (!targetSchoolId) {
            showToast('School authorization required to import questions.', 'error');
            return;
          }
          try {
            const count = await CbtService.importQuestionsJSON(
              targetSchoolId,
              event.target?.result as string,
              currentUserId,
              currentUserName
            );
            showToast(`Successfully imported ${count} questions into Question Bank!`, 'success');
          } catch (err) {
            showToast('Invalid JSON question bank format', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Action Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[#002147] flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-[#D4AF37]" />
            Enterprise Question Bank
          </h2>
          <p className="text-xs text-slate-500">
            {filteredQuestions.length} Questions Available • Multimodal Media, LaTeX & Bloom's Taxonomy Tagged
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onOpenAiGenerator}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-200" /> AI Question Generator
          </button>

          <button
            onClick={handleImportJSONClick}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-slate-500" /> Import JSON
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export JSON
          </button>

          <button
            onClick={onOpenCreateQuestion}
            className="px-4 py-2 bg-[#002147] hover:bg-slate-900 text-[#D4AF37] font-bold rounded-2xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" /> Add Question
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search questions by prompt or tag..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.subjectName || s.name || 'Subject'}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium"
          >
            <option value="ALL">All Question Types</option>
            <option value="mcq">Multiple Choice (MCQ)</option>
            <option value="multi_select">Multiple Select</option>
            <option value="true_false">True / False</option>
            <option value="numeric">Numeric Answer</option>
            <option value="short_answer">Short Answer</option>
            <option value="essay">Essay</option>
          </select>
        </div>

        <div>
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium"
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Expert">Expert</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((q, idx) => (
            <div 
              key={q.id || idx}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] font-black rounded-xl text-xs">
                    {q.subjectName}
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs uppercase">
                    {q.type}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                    q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                    q.difficulty === 'Medium' ? 'bg-blue-100 text-blue-800' :
                    q.difficulty === 'Hard' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {q.difficulty}
                  </span>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-lg text-xs">
                    Bloom: {q.bloomLevel}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {q.points} Pts
                  </span>
                </div>

                {/* Question Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditQuestion(q)}
                    className="p-2 text-slate-500 hover:text-[#002147] hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicate(q)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    title="Duplicate Question"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {q.id && !q.id.startsWith('q_sample') && (
                    <button
                      onClick={() => handleDelete(q.id!)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Title Prompt */}
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-800 leading-relaxed">
                  <CbtMathRenderer content={q.title} />
                </div>

                {q.latexFormula && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-amber-300">
                    <CbtMathRenderer content={`$$${q.latexFormula}$$`} />
                  </div>
                )}
              </div>

              {/* Option Snippets */}
              {q.options && q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                  {q.options.map(opt => (
                    <div 
                      key={opt.id} 
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        opt.isCorrect 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span><CbtMathRenderer content={opt.text} /></span>
                      {opt.isCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                  ))}
                </div>
              )}

              {/* Tags & Author Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {q.tags?.map((t, tIdx) => (
                    <span key={tIdx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
                <span>Author: <strong className="text-slate-600">{q.authorName || 'Teacher'}</strong></span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200">
            <BrainCircuit className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-700">No questions found matching your filter</h3>
            <p className="text-xs text-slate-400">Try clearing filters or create a new question using the button above.</p>
          </div>
        )}
      </div>
    </div>
  );
};
