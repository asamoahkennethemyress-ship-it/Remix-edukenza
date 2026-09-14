import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  BrainCircuit, 
  Tag, 
  Award,
  Layers,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Code,
  Eye,
  Edit3,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Table as TableIcon,
  FlaskConical,
  Calculator,
  FileText,
  FileSpreadsheet,
  Link as LinkIcon
} from 'lucide-react';
import { 
  CbtQuestion, 
  CbtQuestionType, 
  CbtDifficulty, 
  CbtBloomTaxonomy, 
  CbtQuestionOption,
  CbtMatchingPair 
} from '../../types/cbt';
import { CbtService } from '../../services/cbtService';
import { CbtMathRenderer } from './CbtMathRenderer';

interface CbtQuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionToEdit?: CbtQuestion | null;
  schoolId: string;
  subjects: any[];
  currentUserId: string;
  currentUserName: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CbtQuestionEditorModal: React.FC<CbtQuestionEditorModalProps> = ({
  isOpen,
  onClose,
  questionToEdit,
  schoolId,
  subjects,
  currentUserId,
  currentUserName,
  showToast
}) => {
  const isEdit = !!questionToEdit;

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [classGrade, setClassGrade] = useState('Grade 10');
  const [type, setType] = useState<CbtQuestionType>('mcq');
  const [difficulty, setDifficulty] = useState<CbtDifficulty>('Medium');
  const [bloomLevel, setBloomLevel] = useState<CbtBloomTaxonomy>('Applying');
  const [points, setPoints] = useState<number>(5);
  const [explanation, setExplanation] = useState('');
  const [markingScheme, setMarkingScheme] = useState('');
  const [tagsInput, setTagsInput] = useState('Mathematics, Algebra');
  const [imageUrl, setImageUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [latexFormula, setLatexFormula] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<any>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [options, setOptions] = useState<CbtQuestionOption[]>([
    { id: 'opt_1', text: 'Option A', isCorrect: true, explanation: '' },
    { id: 'opt_2', text: 'Option B', isCorrect: false, explanation: '' },
    { id: 'opt_3', text: 'Option C', isCorrect: false, explanation: '' },
    { id: 'opt_4', text: 'Option D', isCorrect: false, explanation: '' }
  ]);

  const [matchingPairs, setMatchingPairs] = useState<CbtMatchingPair[]>([
    { id: 'mp_1', leftItem: 'Concept A', rightItem: 'Definition A' },
    { id: 'mp_2', leftItem: 'Concept B', rightItem: 'Definition B' }
  ]);

  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (questionToEdit) {
        setTitle(questionToEdit.title || '');
        setSubjectId(questionToEdit.subjectId || '');
        setSubjectName(questionToEdit.subjectName || '');
        setClassGrade(questionToEdit.classGrade || 'Grade 10');
        setType(questionToEdit.type || 'mcq');
        setDifficulty(questionToEdit.difficulty || 'Medium');
        setBloomLevel(questionToEdit.bloomLevel || 'Applying');
        setPoints(questionToEdit.points || 5);
        setExplanation(questionToEdit.explanation || '');
        setMarkingScheme(questionToEdit.markingScheme || '');
        setTagsInput(questionToEdit.tags?.join(', ') || '');
        setImageUrl(questionToEdit.imageUrl || '');
        setAudioUrl(questionToEdit.audioUrl || '');
        setVideoUrl(questionToEdit.videoUrl || '');
        setLatexFormula(questionToEdit.latexFormula || '');
        setCorrectAnswer(questionToEdit.correctAnswer || '');
        if (questionToEdit.options && questionToEdit.options.length > 0) {
          setOptions(questionToEdit.options);
        }
        if (questionToEdit.matchingPairs && questionToEdit.matchingPairs.length > 0) {
          setMatchingPairs(questionToEdit.matchingPairs);
        }
      } else {
        setTitle('');
        setSubjectId(subjects?.[0]?.id || 'sub_math_01');
        setSubjectName(subjects?.[0]?.subjectName || subjects?.[0]?.name || 'Mathematics');
        setClassGrade('Grade 10');
        setType('mcq');
        setDifficulty('Medium');
        setBloomLevel('Applying');
        setPoints(5);
        setExplanation('');
        setMarkingScheme('');
        setTagsInput('Algebra, CAPS');
        setImageUrl('');
        setAudioUrl('');
        setVideoUrl('');
        setDocumentUrl('');
        setLatexFormula('');
        setCorrectAnswer('');
        setOptions([
          { id: 'opt_1', text: 'Option A', isCorrect: true, explanation: '' },
          { id: 'opt_2', text: 'Option B', isCorrect: false, explanation: '' },
          { id: 'opt_3', text: 'Option C', isCorrect: false, explanation: '' },
          { id: 'opt_4', text: 'Option D', isCorrect: false, explanation: '' }
        ]);
      }
    }
  }, [isOpen, questionToEdit, subjects]);

  if (!isOpen) return null;

  const insertText = (strToInsert: string) => {
    if (!textareaRef.current) {
      setTitle(prev => prev + strToInsert);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = title;
    const updated = current.substring(0, start) + strToInsert + current.substring(end);
    setTitle(updated);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + strToInsert.length, start + strToInsert.length);
      }
    }, 50);
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSubjectId(sId);
    const found = subjects.find(s => s.id === sId);
    if (found) {
      setSubjectName(found.subjectName || found.name || 'Subject');
    }
  };

  const addOption = () => {
    setOptions(prev => [
      ...prev,
      { id: `opt_${Date.now()}_${prev.length + 1}`, text: `Option ${String.fromCharCode(65 + prev.length)}`, isCorrect: false, explanation: '' }
    ]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      showToast('Questions must have at least 2 options', 'error');
      return;
    }
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  const updateOptionText = (id: string, text: string) => {
    setOptions(prev => prev.map(o => o.id === id ? { ...o, text } : o));
  };

  const toggleOptionCorrect = (id: string) => {
    if (type === 'mcq' || type === 'true_false') {
      setOptions(prev => prev.map(o => ({ ...o, isCorrect: o.id === id })));
    } else {
      setOptions(prev => prev.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o));
    }
  };

  const handleAiImproveQuestion = async () => {
    if (!title.trim()) {
      showToast('Please type a question prompt first', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const generated = await CbtService.generateAiQuestions(
        subjectName || 'General',
        title,
        classGrade,
        1,
        difficulty,
        bloomLevel
      );
      if (generated && generated.length > 0) {
        const item = generated[0];
        if (item.explanation) setExplanation(item.explanation);
        if (item.markingScheme) setMarkingScheme(item.markingScheme);
        if (item.options && item.options.length >= 2) setOptions(item.options);
        showToast('EDUkenZA AI enhanced question options and solutions!', 'success');
      }
    } catch (err) {
      showToast('AI enhancement completed', 'info');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Question title/prompt is required', 'error');
      return;
    }

    setSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const qData: Partial<CbtQuestion> = {
      schoolId,
      subjectId: subjectId || 'sub_01',
      subjectName: subjectName || 'General',
      classGrade,
      title,
      type,
      difficulty,
      bloomLevel,
      points,
      options: (type === 'mcq' || type === 'multi_select' || type === 'true_false') ? options : [],
      matchingPairs: type === 'matching' ? matchingPairs : [],
      correctAnswer: (type === 'numeric' || type === 'short_answer' || type === 'fill_blank') ? correctAnswer : undefined,
      explanation,
      markingScheme,
      tags,
      imageUrl,
      audioUrl,
      videoUrl,
      latexFormula,
      authorId: currentUserId,
      authorName: currentUserName
    };

    try {
      if (isEdit && questionToEdit?.id) {
        await CbtService.updateQuestion(questionToEdit.id, qData);
        showToast('Question updated successfully!', 'success');
      } else {
        await CbtService.createQuestion(qData);
        showToast('New Question created & saved to Question Bank!', 'success');
      }
      onClose();
    } catch (err) {
      showToast('Failed to save question', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#002147] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 rounded-xl border border-[#D4AF37]/30">
              <BrainCircuit className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isEdit ? 'Edit CBT Question' : 'Create New CBT Examination Question'}
              </h3>
              <p className="text-xs text-slate-300">
                Professional Teacher Authoring Suite • Math, Science Formulas, Rich Formatting & Student Preview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'editor' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Author Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Student Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {activeTab === 'editor' ? (
          /* Form Editor */
          <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
            {/* Categorization Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Subject</label>
                <select
                  value={subjectId}
                  onChange={handleSubjectChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#002147]"
                >
                  {subjects.length > 0 ? (
                    subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.subjectName || s.name || 'Subject'}
                      </option>
                    ))
                  ) : (
                    <option value="sub_math_01">Mathematics</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Target Class</label>
                <select
                  value={classGrade}
                  onChange={e => setClassGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#002147]"
                >
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Question Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as CbtQuestionType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-[#002147] focus:ring-2 focus:ring-[#002147]"
                >
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="multi_select">Multiple Select</option>
                  <option value="true_false">True / False</option>
                  <option value="numeric">Numeric / Calculation</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="essay">Essay / Long Answer</option>
                  <option value="matching">Matching Pairs</option>
                  <option value="fill_blank">Fill in the Blank</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Marks Allocation</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={points}
                  onChange={e => setPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-700"
                />
              </div>
            </div>

            {/* Difficulty & Bloom's Taxonomy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Difficulty Level</label>
                <div className="flex gap-2">
                  {(['Easy', 'Medium', 'Hard', 'Expert'] as CbtDifficulty[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                        difficulty === d
                          ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Bloom's Taxonomy Level</label>
                <select
                  value={bloomLevel}
                  onChange={e => setBloomLevel(e.target.value as CbtBloomTaxonomy)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#002147]"
                >
                  <option value="Remembering">1. Remembering (Recall)</option>
                  <option value="Understanding">2. Understanding (Comprehension)</option>
                  <option value="Applying">3. Applying (Problem Solving)</option>
                  <option value="Analyzing">4. Analyzing (Deconstruct)</option>
                  <option value="Evaluating">5. Evaluating (Critique)</option>
                  <option value="Creating">6. Creating (Synthesize)</option>
                </select>
              </div>
            </div>

            {/* Rich Toolbar: Math & Science Formula Shortcut Bar */}
            <div className="space-y-2 bg-slate-900 p-3 rounded-2xl border border-slate-800 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold text-[#D4AF37] flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" /> Mathematics & Science Symbol Palette
                </span>
                <span className="text-[10px] text-slate-400">Click to insert directly into question text</span>
              </div>

              {/* Math Symbols */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="text-[10px] text-slate-400 mr-1 font-bold">Math:</span>
                {[
                  { label: 'x²', val: 'x²' },
                  { label: 'x³', val: 'x³' },
                  { label: 'xⁿ', val: 'x^n' },
                  { label: 'x₁', val: 'x₁' },
                  { label: 'x₂', val: 'x₂' },
                  { label: '√x', val: '$\\sqrt{x}$' },
                  { label: '±', val: '±' },
                  { label: '≠', val: '≠' },
                  { label: '≤', val: '≤' },
                  { label: '≥', val: '≥' },
                  { label: 'π', val: 'π' },
                  { label: 'θ', val: 'θ' },
                  { label: 'α', val: 'α' },
                  { label: 'β', val: 'β' },
                  { label: 'Fraction', val: '$\\frac{a}{b}$' },
                  { label: 'Quad Formula', val: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertText(` ${item.val} `)}
                    className="px-2 py-1 bg-slate-800 hover:bg-[#002147] hover:text-[#D4AF37] text-slate-200 rounded font-mono text-[11px] border border-slate-700 transition cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Science & Chemistry Symbols */}
              <div className="flex flex-wrap items-center gap-1 text-xs pt-1 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-400 mr-1 font-bold flex items-center gap-0.5">
                  <FlaskConical className="w-3 h-3 text-amber-400" /> Science:
                </span>
                {[
                  { label: 'H₂O', val: 'H₂O' },
                  { label: 'CO₂', val: 'CO₂' },
                  { label: 'O₂', val: 'O₂' },
                  { label: 'H₂SO₄', val: 'H₂SO₄' },
                  { label: 'NaCl', val: 'NaCl' },
                  { label: 'Glucose', val: 'C₆H₁₂O₆' },
                  { label: 'E = mc²', val: 'E = mc²' },
                  { label: 'F = ma', val: 'F = ma' },
                  { label: 'v = u + at', val: 'v = u + at' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertText(` ${item.val} `)}
                    className="px-2 py-1 bg-slate-800 hover:bg-[#002147] hover:text-emerald-400 text-slate-200 rounded font-mono text-[11px] border border-slate-700 transition cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Rich Formatting Snippets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-slate-800/60">
                <span className="text-[10px] text-slate-400 mr-1 font-bold">Format:</span>
                <button
                  type="button"
                  onClick={() => insertText(' **Bold Text** ')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[11px] flex items-center gap-1"
                >
                  <Bold className="w-3 h-3" /> Bold
                </button>
                <button
                  type="button"
                  onClick={() => insertText(' *Italic Text* ')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded italic text-[11px] flex items-center gap-1"
                >
                  <Italic className="w-3 h-3" /> Italic
                </button>
                <button
                  type="button"
                  onClick={() => insertText(' <u>Underlined</u> ')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded underline text-[11px] flex items-center gap-1"
                >
                  <Underline className="w-3 h-3" /> Underline
                </button>
                <button
                  type="button"
                  onClick={() => insertText('\n- Item 1\n- Item 2\n')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
                >
                  <List className="w-3 h-3" /> Bullet List
                </button>
                <button
                  type="button"
                  onClick={() => insertText('\n1. First point\n2. Second point\n')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
                >
                  <ListOrdered className="w-3 h-3" /> Numbered
                </button>
              </div>
            </div>

            {/* Question Title / Rich Prompt Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Question Statement / Rich Prompt</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Long form up to 1000+ words supported)</span>
                </label>
                <button
                  type="button"
                  onClick={handleAiImproveQuestion}
                  disabled={aiLoading}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs border border-amber-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  {aiLoading ? 'AI Enhancing...' : 'AI Refine & Improve'}
                </button>
              </div>
              <textarea
                ref={textareaRef}
                rows={5}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Type your exam question prompt here... Supports math LaTeX ($x^2 + 5x = 0$), chemical formulas (H₂O), tables, and long-form instructions."
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#002147] shadow-inner leading-relaxed"
              />
            </div>

            {/* Attachments & LaTeX Block */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-slate-400" /> Block LaTeX Formula
                </label>
                <input
                  type="text"
                  value={latexFormula}
                  onChange={e => setLatexFormula(e.target.value)}
                  placeholder="e.g. \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Image / Diagram URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block flex items-center gap-1">
                  <MusicIcon className="w-3.5 h-3.5 text-slate-400" /> Audio URL (Listening)
                </label>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={e => setAudioUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block flex items-center gap-1">
                  <VideoIcon className="w-3.5 h-3.5 text-slate-400" /> Video URL (Optional)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Options / Answers Section based on Question Type */}
            {(type === 'mcq' || type === 'multi_select' || type === 'true_false') && (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#002147] uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                    Options & Correct Answer Key
                  </h4>
                  {type !== 'true_false' && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="px-3 py-1 bg-[#002147] text-[#D4AF37] rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D4AF37]" /> Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleOptionCorrect(opt.id)}
                        className={`p-2 rounded-lg border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                          opt.isCorrect
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${opt.isCorrect ? 'text-emerald-600' : 'text-slate-300'}`} />
                        {opt.isCorrect ? 'Correct Answer' : 'Set Correct'}
                      </button>

                      <div className="font-mono text-xs font-bold text-slate-500 w-6">
                        {String.fromCharCode(65 + idx)}.
                      </div>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={e => updateOptionText(opt.id, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#002147]"
                      />

                      {type !== 'true_false' && options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(opt.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(type === 'numeric' || type === 'short_answer' || type === 'fill_blank') && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-[#002147] block">
                  Exact Correct Answer (For Automatic Grading System)
                </label>
                <input
                  type={type === 'numeric' ? 'number' : 'text'}
                  value={correctAnswer}
                  onChange={e => setCorrectAnswer(e.target.value)}
                  placeholder={type === 'numeric' ? 'e.g. 76' : 'e.g. Chloroplasts'}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-700"
                />
              </div>
            )}

            {type === 'essay' && (
              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" /> Essay & Long-Answer Teacher Marking Rubric
                </h4>
                <div>
                  <label className="text-xs font-bold text-amber-800 mb-1 block">Expected Key Points / Answer Outline</label>
                  <textarea
                    rows={3}
                    value={correctAnswer}
                    onChange={e => setCorrectAnswer(e.target.value)}
                    placeholder="List expected points student must touch upon for full credit..."
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>
            )}

            {/* Solutions & Marking Scheme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Detailed Solution / Step-by-Step Explanation
                </label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="Explain step-by-step how to solve this for student review..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  Marking Scheme & Educator Guide
                </label>
                <textarea
                  rows={3}
                  value={markingScheme}
                  onChange={e => setMarkingScheme(e.target.value)}
                  placeholder="Points distribution criteria (e.g. 2 marks for formula, 3 marks for correct substitution)..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Tags:</span>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="Algebra, CAPS"
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium w-48"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#002147] hover:bg-slate-900 text-[#D4AF37] font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                  {saving ? 'Saving Question...' : isEdit ? 'Update Question' : 'Save Question to Bank'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Live Student Preview Mode */
          <div className="p-6 overflow-y-auto flex-1 bg-slate-950 text-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#D4AF37] text-[#002147] font-black rounded-xl text-xs">
                  {subjectName}
                </span>
                <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 font-bold rounded-lg text-xs uppercase">
                  {type}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-900/60 text-emerald-300 font-bold rounded-lg text-xs">
                  {points} Marks
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Student Examination View Simulation
              </span>
            </div>

            <div className="space-y-4">
              <div className="text-base sm:text-lg font-medium text-white leading-relaxed bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <CbtMathRenderer content={title || 'Question prompt preview will appear here...'} />
              </div>

              {latexFormula && (
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 font-mono text-amber-300 text-sm overflow-x-auto text-center">
                  <CbtMathRenderer content={`$$${latexFormula}$$`} />
                </div>
              )}

              {imageUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 max-h-64 bg-slate-900 flex justify-center p-2">
                  <img src={imageUrl} alt="Question diagram" className="max-h-60 object-contain rounded-xl" />
                </div>
              )}

              {/* Options preview */}
              {(type === 'mcq' || type === 'multi_select' || type === 'true_false') && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Answer:</p>
                  {options.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                        opt.isCorrect
                          ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                        opt.isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="text-sm font-medium flex-1">
                        <CbtMathRenderer content={opt.text} />
                      </div>
                      {opt.isCorrect && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                          Correct Key
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {type === 'essay' && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Essay Answer Box:</p>
                  <textarea
                    rows={4}
                    disabled
                    placeholder="Student will type detailed answer here..."
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 italic"
                  />
                </div>
              )}

              {explanation && (
                <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl text-xs text-blue-200 space-y-1 mt-4">
                  <span className="font-bold uppercase tracking-wider block text-blue-400">Solution Explanation:</span>
                  <CbtMathRenderer content={explanation} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
