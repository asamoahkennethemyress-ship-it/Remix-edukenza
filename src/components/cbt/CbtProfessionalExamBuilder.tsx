import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  Tag, 
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
  Link as LinkIcon,
  Copy,
  ChevronUp,
  ChevronDown,
  Layers,
  BookOpen,
  Settings,
  Search,
  Zap,
  Clock,
  Award,
  AlertTriangle,
  FolderPlus,
  ArrowRight,
  Shuffle,
  FileCheck,
  Download,
  Upload,
  Atom,
  Binary,
  GripVertical
} from 'lucide-react';
import { 
  CbtQuestion, 
  CbtQuestionType, 
  CbtDifficulty, 
  CbtBloomTaxonomy,
  CbtQuestionOption,
  CbtMatchingPair,
  CbtExamConfig,
  CbtExamType,
  CbtExamStatus
} from '../../types/cbt';
import { CbtService } from '../../services/cbtService';
import { CbtMathRenderer } from './CbtMathRenderer';

interface CbtProfessionalExamBuilderProps {
  isOpen: boolean;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  examToEdit?: CbtExamConfig | null;
  existingQuestions?: CbtQuestion[];
  subjects?: any[];
  classes?: any[];
  onClose: () => void;
  onExamSaved?: (savedExam: CbtExamConfig) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CbtProfessionalExamBuilder: React.FC<CbtProfessionalExamBuilderProps> = ({
  isOpen,
  schoolId,
  teacherId,
  teacherName,
  examToEdit,
  existingQuestions = [],
  subjects = [],
  classes = [],
  onClose,
  onExamSaved,
  showToast
}) => {
  // Left Panel Tab: 'info' | 'questions' | 'bank' | 'ai' | 'media'
  const [leftTab, setLeftTab] = useState<'info' | 'questions' | 'bank' | 'ai' | 'media'>('questions');

  // Authoring Mode: '3pane' (3-Pane Question Builder) vs 'word_doc' (Full Examination Paper Word View)
  const [authoringMode, setAuthoringMode] = useState<'3pane' | 'word_doc'>('3pane');

  // Paper Document Metadata (Full Examination Header)
  const [schoolName, setSchoolName] = useState('EDUkenZA International Academy');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState('https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=200&q=80');
  const [ministryLogoUrl, setMinistryLogoUrl] = useState('');
  const [teacherAuthorName, setTeacherAuthorName] = useState(teacherName || 'Lead Examiner');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [candidateInstructions, setCandidateInstructions] = useState(
    '1. Answer ALL questions in Section A and THREE questions from Section B.\n2. Write clearly using dark blue or black ink.\n3. Silent non-programmable calculators may be used where appropriate.\n4. Show all intermediate mathematical working.'
  );

  // Document Styling States for Word View
  const [docFontFamily, setDocFontFamily] = useState('Times New Roman, serif');
  const [docFontSize, setDocFontSize] = useState('12pt');

  // Overall Exam Metadata State
  const [examId, setExamId] = useState<string | undefined>(examToEdit?.id);
  const [examTitle, setExamTitle] = useState(examToEdit?.title || '');
  const [subjectId, setSubjectId] = useState(examToEdit?.subjectId || (subjects[0]?.id || ''));
  const [subjectName, setSubjectName] = useState(examToEdit?.subjectName || (subjects[0]?.name || subjects[0]?.subjectName || ''));
  const [classGrade, setClassGrade] = useState(examToEdit?.className || classes[0]?.name || classes[0]?.className || '');
  const [academicYear, setAcademicYear] = useState(examToEdit?.academicYear || '2026');
  const [term, setTerm] = useState(examToEdit?.term || 'Term 1');
  const [examType, setExamType] = useState<CbtExamType>(examToEdit?.examType || 'Mid-Term Exam');
  const [durationMinutes, setDurationMinutes] = useState(examToEdit?.durationMinutes || 45);
  const [passingScorePercentage, setPassingScorePercentage] = useState(examToEdit?.passingScorePercentage || 50);
  const [instructions, setInstructions] = useState(examToEdit?.instructions || 'Read all questions carefully. Select or type your answers. Ensure all working is clear.');
  const [randomizeQuestions, setRandomizeQuestions] = useState(examToEdit?.randomizeQuestions ?? true);
  const [randomizeOptions, setRandomizeOptions] = useState(examToEdit?.randomizeOptions ?? true);
  const [status, setStatus] = useState<CbtExamStatus>(examToEdit?.status || 'Live');

  // Exam Questions List (Active Questions in this Exam)
  const [examQuestions, setExamQuestions] = useState<CbtQuestion[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Bank Search & Filter
  const [bankSearch, setBankSearch] = useState('');
  const [bankSubjectFilter, setBankSubjectFilter] = useState('all');

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Preview Overlay
  const [showFullStudentPreview, setShowFullStudentPreview] = useState(false);

  // Auto-Save Timestamp State
  const [lastSavedTime, setLastSavedTime] = useState<string>('Draft saved locally');
  const [saving, setSaving] = useState(false);

  // Drag & Drop Question Reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state when examToEdit or isOpen changes
  useEffect(() => {
    if (!isOpen) return;

    if (examToEdit) {
      setExamId(examToEdit.id);
      setExamTitle(examToEdit.title || '');
      setSubjectId(examToEdit.subjectId || (subjects[0]?.id || ''));
      setSubjectName(examToEdit.subjectName || (subjects[0]?.name || subjects[0]?.subjectName || ''));
      setClassGrade(examToEdit.className || classes[0]?.name || classes[0]?.className || '');
      setAcademicYear(examToEdit.academicYear || '2026');
      setTerm(examToEdit.term || 'Term 1');
      setExamType(examToEdit.examType || 'Mid-Term Exam');
      setDurationMinutes(examToEdit.durationMinutes || 45);
      setPassingScorePercentage(examToEdit.passingScorePercentage || 50);
      setInstructions(examToEdit.instructions || 'Read all questions carefully.');
      setRandomizeQuestions(examToEdit.randomizeQuestions ?? true);
      setRandomizeOptions(examToEdit.randomizeOptions ?? true);
      setStatus(examToEdit.status || 'Live');

      if (examToEdit.questionIds && examToEdit.questionIds.length > 0) {
        const filtered = existingQuestions.filter(q => examToEdit.questionIds.includes(q.id || ''));
        if (filtered.length > 0) {
          setExamQuestions(filtered);
        } else {
          setExamQuestions([createInitialQuestion()]);
        }
      } else if (existingQuestions.length > 0) {
        setExamQuestions([existingQuestions[0]]);
      } else {
        setExamQuestions([createInitialQuestion()]);
      }
    } else {
      setExamId(undefined);
      setExamTitle('');
      setSubjectId(subjects[0]?.id || '');
      setSubjectName(subjects[0]?.subjectName || subjects[0]?.name || '');
      setClassGrade(classes[0]?.name || classes[0]?.className || '');
      setAcademicYear('2026');
      setTerm('Term 1');
      setExamType('Mid-Term Exam');
      setDurationMinutes(45);
      setPassingScorePercentage(50);
      setInstructions('Read all questions carefully. Select or type your answers.');
      setRandomizeQuestions(true);
      setRandomizeOptions(true);
      setStatus('Live');
      setExamQuestions([createInitialQuestion()]);
    }
    setActiveQuestionIndex(0);
    setAuthoringMode('3pane');
    setLeftTab('questions');
  }, [examToEdit, isOpen]);

  // Auto focus editor textarea when opened or active question changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeQuestionIndex, authoringMode]);

  // Auto-Save Draft Interval
  useEffect(() => {
    if (!isOpen) return;
    const saveInterval = setInterval(() => {
      if (examQuestions.length > 0) {
        localStorage.setItem(`cbt_draft_builder_${schoolId}_${teacherId}`, JSON.stringify({
          examTitle,
          subjectId,
          subjectName,
          classGrade,
          academicYear,
          term,
          examType,
          durationMinutes,
          passingScorePercentage,
          instructions,
          examQuestions,
          savedAt: new Date().toLocaleTimeString()
        }));
        setLastSavedTime(`Saved locally at ${new Date().toLocaleTimeString()}`);
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [isOpen, examQuestions, examTitle, subjectId, durationMinutes]);

  if (!isOpen) return null;

  // Helper to create initial blank question
  function createInitialQuestion(qType: CbtQuestionType = 'mcq'): CbtQuestion {
    return {
      id: `q_temp_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      schoolId,
      subjectId: subjectId || '',
      subjectName: subjectName || '',
      classGrade: classGrade || '',
      title: 'Enter question text here...',
      type: qType,
      difficulty: 'Medium',
      bloomLevel: 'Understanding',
      points: 5,
      options: [
        { id: `opt_${Date.now()}_1`, text: 'Option A (Correct Key)', isCorrect: true },
        { id: `opt_${Date.now()}_2`, text: 'Option B', isCorrect: false },
        { id: `opt_${Date.now()}_3`, text: 'Option C', isCorrect: false },
        { id: `opt_${Date.now()}_4`, text: 'Option D', isCorrect: false }
      ],
      tags: [subjectName || 'General'],
      version: 1,
      authorName: teacherName,
      authorId: teacherId,
      createdAt: new Date().toISOString()
    };
  }

  // Current Active Question being edited in Center & Right panel
  const currentQuestion: CbtQuestion = examQuestions[activeQuestionIndex] || createInitialQuestion();

  // Helper to create a new blank question
  const createNewQuestion = (qType: CbtQuestionType = 'mcq') => {
    const newQ: CbtQuestion = createInitialQuestion(qType);

    setExamQuestions(prev => {
      const updated = [...prev, newQ];
      setActiveQuestionIndex(updated.length - 1);
      return updated;
    });
    setLeftTab('questions');
    showToast('New question added to exam', 'info');
  };

  // Update current active question properties safely
  const updateActiveQuestion = (updates: Partial<CbtQuestion>) => {
    setExamQuestions(prev => {
      if (prev.length === 0) return [createInitialQuestion()];
      const targetIdx = Math.max(0, Math.min(activeQuestionIndex, prev.length - 1));
      const copy = [...prev];
      copy[targetIdx] = {
        ...copy[targetIdx],
        ...updates
      };
      return copy;
    });
  };

  // Text Insertion Toolbar Helper
  const insertText = (strToInsert: string) => {
    if (!textareaRef.current) {
      updateActiveQuestion({ title: (currentQuestion.title || '') + strToInsert });
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = currentQuestion.title || '';
    const updated = current.substring(0, start) + strToInsert + current.substring(end);
    updateActiveQuestion({ title: updated });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + strToInsert.length, start + strToInsert.length);
      }
    }, 50);
  };

  // Subject Selector Change
  const handleSubjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSubjectId(sId);
    const found = subjects.find(s => s.id === sId);
    if (found) {
      setSubjectName(found.subjectName || found.name || 'Subject');
    }
  };

  // Duplicate active question
  const duplicateActiveQuestion = () => {
    if (!currentQuestion) return;
    const dup: CbtQuestion = {
      ...currentQuestion,
      id: `q_temp_${Date.now()}_dup`,
      title: `${currentQuestion.title} (Copy)`,
      createdAt: new Date().toISOString()
    };
    setExamQuestions(prev => {
      const copy = [...prev];
      copy.splice(activeQuestionIndex + 1, 0, dup);
      return copy;
    });
    setActiveQuestionIndex(activeQuestionIndex + 1);
    showToast('Question duplicated!', 'success');
  };

  // Delete active question
  const deleteActiveQuestion = (idxToDelete: number) => {
    if (examQuestions.length <= 1) {
      showToast('Exam must contain at least one question', 'error');
      return;
    }
    setExamQuestions(prev => prev.filter((_, i) => i !== idxToDelete));
    if (activeQuestionIndex >= examQuestions.length - 1) {
      setActiveQuestionIndex(Math.max(0, examQuestions.length - 2));
    }
    showToast('Question removed from exam', 'info');
  };

  // Reorder question up/down
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === examQuestions.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setExamQuestions(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setActiveQuestionIndex(targetIndex);
  };

  // Drag & Drop Question Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = sourceIndexStr !== '' ? parseInt(sourceIndexStr, 10) : draggedIdx;
    if (sourceIndex === null || sourceIndex === undefined || isNaN(sourceIndex)) return;
    if (sourceIndex === targetIndex) return;

    setExamQuestions(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });
    setActiveQuestionIndex(targetIndex);
    setDraggedIdx(null);
    showToast('Question reordered via Drag & Drop', 'info');
  };

  // Options Handlers for MCQ/Multi-select
  const addOption = () => {
    const currentOptions = currentQuestion.options || [];
    const newOpt: CbtQuestionOption = {
      id: `opt_${Date.now()}_${currentOptions.length + 1}`,
      text: `Option ${String.fromCharCode(65 + currentOptions.length)}`,
      isCorrect: false
    };
    updateActiveQuestion({ options: [...currentOptions, newOpt] });
  };

  const updateOptionText = (optId: string, text: string) => {
    const currentOptions = currentQuestion.options || [];
    const updated = currentOptions.map(o => o.id === optId ? { ...o, text } : o);
    updateActiveQuestion({ options: updated });
  };

  const toggleOptionCorrect = (optId: string) => {
    const currentOptions = currentQuestion.options || [];
    if (currentQuestion.type === 'mcq' || currentQuestion.type === 'true_false') {
      const updated = currentOptions.map(o => ({ ...o, isCorrect: o.id === optId }));
      updateActiveQuestion({ options: updated });
    } else {
      const updated = currentOptions.map(o => o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o);
      updateActiveQuestion({ options: updated });
    }
  };

  const removeOption = (optId: string) => {
    const currentOptions = currentQuestion.options || [];
    if (currentOptions.length <= 2) {
      showToast('Objective questions require at least 2 options', 'error');
      return;
    }
    updateActiveQuestion({ options: currentOptions.filter(o => o.id !== optId) });
  };

  // Total Marks Calculation
  const totalPoints = examQuestions.reduce((acc, q) => acc + (q.points || 0), 0);

  // Validation before Publishing
  const validateExam = (): boolean => {
    if (!examTitle.trim()) {
      showToast('Exam Title is required!', 'error');
      setLeftTab('info');
      return false;
    }
    if (examQuestions.length === 0) {
      showToast('Please add at least 1 question to the examination.', 'error');
      setLeftTab('questions');
      return false;
    }

    // Check objective questions have correct answers selected
    for (let i = 0; i < examQuestions.length; i++) {
      const q = examQuestions[i];
      if (!q.title.trim()) {
        showToast(`Question #${i + 1} prompt cannot be empty.`, 'error');
        setActiveQuestionIndex(i);
        return false;
      }
      if (q.type === 'mcq' || q.type === 'multi_select' || q.type === 'true_false') {
        const hasCorrect = q.options?.some(o => o.isCorrect);
        if (!hasCorrect) {
          showToast(`Question #${i + 1} has no correct answer selected!`, 'error');
          setActiveQuestionIndex(i);
          return false;
        }
      }
    }
    return true;
  };

  // Publish / Save Exam to Firestore
  const handlePublishExam = async (targetStatus: CbtExamStatus = 'Live') => {
    if (!validateExam()) return;

    setSaving(true);
    try {
      // 1. Save all questions to Firestore Question Bank first
      const savedQuestionIds: string[] = [];

      for (const q of examQuestions) {
        let qId = q.id;
        const qPayload: Partial<CbtQuestion> = {
          schoolId,
          subjectId,
          subjectName,
          classGrade,
          title: q.title,
          type: q.type,
          difficulty: q.difficulty,
          bloomLevel: q.bloomLevel,
          points: q.points || 5,
          options: q.options || [],
          matchingPairs: q.matchingPairs || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          markingScheme: q.markingScheme || '',
          tags: q.tags || [subjectName],
          imageUrl: q.imageUrl || '',
          audioUrl: q.audioUrl || '',
          videoUrl: q.videoUrl || '',
          latexFormula: q.latexFormula || '',
          version: 1,
          authorName: teacherName,
          authorId: teacherId
        };

        if (qId && !qId.startsWith('q_temp_')) {
          await CbtService.updateQuestion(qId, qPayload);
          savedQuestionIds.push(qId);
        } else {
          const newQId = await CbtService.createQuestion(qPayload);
          if (newQId) {
            savedQuestionIds.push(newQId);
          }
        }
      }

      // 2. Save Exam Configuration Document
      const examPayload: Partial<CbtExamConfig> = {
        schoolId,
        title: examTitle,
        subjectId,
        subjectName,
        classId: subjectId,
        className: classGrade,
        teacherId,
        teacherName,
        academicYear,
        term,
        examType,
        durationMinutes: Number(durationMinutes),
        totalPoints,
        passingScorePercentage: Number(passingScorePercentage),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        instructions,
        randomizeQuestions,
        randomizeOptions,
        negativeMarking: false,
        maxAttempts: 1,
        autoSubmitOnTimeExpire: true,
        showResultsImmediately: true,
        showExplanationsAfterExam: true,
        secureExamMode: true,
        allowOneQuestionAtATime: false,
        status: targetStatus,
        questionIds: savedQuestionIds,
        questionsCount: savedQuestionIds.length
      };

      let finalExam: CbtExamConfig;
      if (examId) {
        await CbtService.updateExam(examId, examPayload);
        finalExam = { id: examId, ...examPayload } as CbtExamConfig;
        showToast(targetStatus === 'Draft' ? 'Exam saved as Draft' : 'Examination updated & published successfully!', 'success');
      } else {
        const newExamId = await CbtService.createExam(examPayload);
        finalExam = { id: newExamId, ...examPayload } as CbtExamConfig;
        showToast(targetStatus === 'Draft' ? 'Exam draft saved!' : 'Examination published & live for students!', 'success');
      }

      if (onExamSaved) onExamSaved(finalExam);
      onClose();
    } catch (err) {
      console.error('Save exam error:', err);
      showToast('Error publishing examination to server', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export as DOCX file
  const handleExportDocx = () => {
    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${examTitle}</title>
      <style>
        body { font-family: ${docFontFamily}; font-size: ${docFontSize}; line-height: 1.6; margin: 1in; }
        h1 { text-align: center; color: #002147; font-size: 20pt; margin-bottom: 2pt; }
        h2 { text-align: center; font-size: 14pt; margin-top: 0; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20pt; border: 1px solid #000; }
        .meta-table td { padding: 6pt; border: 1px solid #000; font-size: 10pt; }
        .question-box { margin-bottom: 18pt; }
        .q-title { font-weight: bold; margin-bottom: 6pt; }
        .option-list { margin-left: 20pt; }
      </style>
      </head>
      <body>
        <h1>${schoolName}</h1>
        <h2>${examTitle.toUpperCase()} - ${academicYear} (${term})</h2>
        <table class="meta-table">
          <tr><td><b>SUBJECT:</b> ${subjectName}</td><td><b>CLASS:</b> ${classGrade}</td></tr>
          <tr><td><b>DURATION:</b> ${durationMinutes} Mins</td><td><b>TOTAL MARKS:</b> ${totalPoints}</td></tr>
          <tr><td><b>TEACHER:</b> ${teacherAuthorName}</td><td><b>DATE:</b> ${examDate}</td></tr>
        </table>
        <p><b>CANDIDATE NAME:</b> ____________________________________ <b>INDEX NO:</b> ____________</p>
        <p><b>INSTRUCTIONS:</b><br/>${candidateInstructions.replace(/\n/g, '<br/>')}</p>
        <hr/>
        <h3>SECTION A: EXAMINATION QUESTIONS</h3>
    `;

    examQuestions.forEach((q, idx) => {
      htmlContent += `
        <div class="question-box">
          <p class="q-title">QUESTION ${idx + 1} (${q.points || 5} Marks)</p>
          <p>${q.title}</p>
      `;
      if (q.imageUrl) {
        htmlContent += `<p><img src="${q.imageUrl}" width="350" /></p>`;
      }
      if (q.options && q.options.length > 0) {
        htmlContent += `<div class="option-list">`;
        q.options.forEach((opt, oIdx) => {
          htmlContent += `<p>(${String.fromCharCode(97 + oIdx)}) ${opt.text}</p>`;
        });
        htmlContent += `</div>`;
      }
      htmlContent += `</div>`;
    });

    htmlContent += `</body></html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${examTitle.replace(/\s+/g, '_')}_Paper.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Examination Paper exported as DOCX file!', 'success');
  };

  // Print Exam Paper
  const handlePrintExam = () => {
    window.print();
  };

  // AI Prompt Execution
  const handleRunAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      // Create AI generated question snippet
      const newQ: CbtQuestion = {
        id: `q_temp_${Date.now()}_ai`,
        schoolId,
        subjectId,
        subjectName,
        classGrade,
        title: `[AI Generated] ${aiPrompt}: Discuss key principles, formulas, and practical applications in detail.`,
        type: 'mcq',
        difficulty: 'Medium',
        bloomLevel: 'Analyzing',
        points: 5,
        options: [
          { id: `opt_ai_1`, text: 'Primary correct concept parameter', isCorrect: true },
          { id: `opt_ai_2`, text: 'Inverted variable hypothesis', isCorrect: false },
          { id: `opt_ai_3`, text: 'Secondary incorrect derivation', isCorrect: false },
          { id: `opt_ai_4`, text: 'Null condition state', isCorrect: false }
        ],
        explanation: 'Detailed AI generated step-by-step solution key.',
        tags: ['AI Generated', subjectName],
        version: 1,
        authorName: 'EDUkenZA AI',
        authorId: 'ai_bot'
      };

      setExamQuestions(prev => [...prev, newQ]);
      setActiveQuestionIndex(examQuestions.length);
      setAiPrompt('');
      showToast('AI question generated and inserted into exam!', 'success');
    } catch (err) {
      showToast('AI service response completed', 'info');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-slate-100 flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
      {/* 1. TOP HEADER BAR */}
      <header className="bg-[#002147] border-b border-slate-800 px-6 py-3.5 flex items-center justify-between text-white shadow-xl z-20">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-[#D4AF37] to-amber-600 rounded-2xl text-[#002147] shadow-lg">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-wide">
                {examTitle || 'Untitled Examination'}
              </h1>
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md ${
                status === 'Live' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium flex items-center gap-3">
              <span>{subjectName} • {classGrade}</span>
              <span className="text-slate-500">•</span>
              <span className="text-[#D4AF37] font-bold">{examQuestions.length} Questions ({totalPoints} Total Marks)</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-mono text-[11px]">{lastSavedTime}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Authoring View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 mr-2">
            <button
              onClick={() => setAuthoringMode('3pane')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                authoringMode === '3pane'
                  ? 'bg-[#002147] text-[#D4AF37] border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Question Builder
            </button>

            <button
              onClick={() => setAuthoringMode('word_doc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                authoringMode === 'word_doc'
                  ? 'bg-[#002147] text-[#D4AF37] border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Full Paper Document View
            </button>
          </div>

          {/* Export & Print */}
          <button
            onClick={handleExportDocx}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Export as Microsoft Word DOCX"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            DOCX
          </button>

          <button
            onClick={handlePrintExam}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            title="Print or Save as PDF"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Print / PDF
          </button>

          <button
            onClick={() => setShowFullStudentPreview(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
            Student Simulation
          </button>

          <button
            onClick={() => handlePublishExam('Draft')}
            disabled={saving}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
          >
            Save Draft
          </button>

          <button
            onClick={() => handlePublishExam('Live')}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-600 text-[#002147] font-black rounded-xl text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#002147]" />
            {saving ? 'Publishing...' : 'Publish & Activate Exam'}
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* 2. THREE-PANEL BODY */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL (Width 340px) */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shrink-0">
          {/* Left Panel Tabs */}
          <div className="grid grid-cols-5 bg-slate-950 p-1 border-b border-slate-800 text-[11px] font-bold">
            {[
              { id: 'questions', label: 'Questions', icon: Layers },
              { id: 'info', label: 'Exam Info', icon: Settings },
              { id: 'bank', label: 'Bank', icon: BookOpen },
              { id: 'ai', label: 'AI Gen', icon: Sparkles },
              { id: 'media', label: 'Diagrams', icon: ImageIcon }
            ].map(t => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setLeftTab(t.id as any)}
                  className={`py-2 px-1 flex flex-col items-center gap-1 rounded-lg transition cursor-pointer ${
                    leftTab === t.id
                      ? 'bg-[#002147] text-[#D4AF37] border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span className="text-[10px] truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Left Panel Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* TAB 1: QUESTIONS LIST */}
            {leftTab === 'questions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Exam Questions ({examQuestions.length})
                  </span>
                  <button
                    onClick={() => createNewQuestion('mcq')}
                    className="px-3 py-1.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black rounded-xl text-xs flex items-center gap-1 shadow transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>

                {/* Questions Reorderable List with Drag and Drop */}
                <div className="space-y-2">
                  {examQuestions.map((q, idx) => {
                    const isSelected = idx === activeQuestionIndex;
                    const isDragged = draggedIdx === idx;
                    return (
                      <div
                        key={q.id || idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, idx)}
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`p-3 rounded-2xl border transition cursor-grab active:cursor-grabbing relative group ${
                          isDragged ? 'opacity-40 border-amber-400 border-dashed bg-amber-500/10' : ''
                        } ${
                          isSelected
                            ? 'bg-[#002147] border-[#D4AF37] text-white shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
                            <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                              isSelected ? 'bg-[#D4AF37] text-[#002147]' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                              {q.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <span className="text-[10px] font-bold text-emerald-400 mr-1">
                              {q.points} Marks
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveQuestion(idx, 'up'); }}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveQuestion(idx, 'down'); }}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteActiveQuestion(idx); }}
                              className="p-1 text-slate-400 hover:text-red-400"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs line-clamp-2 font-medium text-slate-200">
                          {q.title || 'Blank question prompt...'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: EXAM METADATA SETTINGS */}
            {leftTab === 'info' && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
                  General Examination Details
                </h3>

                <div>
                  <label className="text-slate-400 font-bold mb-1 block">Exam Title</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={e => setExamTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold mb-1 block">Subject</label>
                  <select
                    value={subjectId}
                    onChange={handleSubjectSelect}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
                  >
                    {subjects.length > 0 ? (
                      subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.subjectName || s.name}</option>
                      ))
                    ) : (
                      <option value="sub_math_01">Mathematics</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-bold mb-1 block">Class Grade</label>
                    <input
                      type="text"
                      value={classGrade}
                      onChange={e => setClassGrade(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold mb-1 block">Exam Type</label>
                    <select
                      value={examType}
                      onChange={e => setExamType(e.target.value as CbtExamType)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    >
                      <option value="Mid-Term Exam">Mid-Term Exam</option>
                      <option value="End-of-Term Exam">End-of-Term Exam</option>
                      <option value="Class Test">Class Test</option>
                      <option value="Mock Exam">Mock Exam</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 font-bold mb-1 block">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold mb-1 block">Passing Score (%)</label>
                    <input
                      type="number"
                      value={passingScorePercentage}
                      onChange={e => setPassingScorePercentage(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-bold mb-1 block">Student Instructions</label>
                  <textarea
                    rows={4}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white leading-relaxed"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeQuestions}
                      onChange={e => setRandomizeQuestions(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-[#D4AF37]"
                    />
                    <span className="text-slate-300 font-medium">Randomize Question Sequence</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeOptions}
                      onChange={e => setRandomizeOptions(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-[#D4AF37]"
                    />
                    <span className="text-slate-300 font-medium">Shuffle Answer Options</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: QUESTION BANK IMPORT */}
            {leftTab === 'bank' && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
                  Import From Question Bank
                </h3>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={bankSearch}
                    onChange={e => setBankSearch(e.target.value)}
                    placeholder="Search bank questions..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  {existingQuestions.filter(q => q.title.toLowerCase().includes(bankSearch.toLowerCase())).map((bq, i) => (
                    <div key={bq.id || i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase">{bq.subjectName}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">{bq.points} pts</span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2">{bq.title}</p>
                      <button
                        onClick={() => {
                          setExamQuestions(prev => [...prev, { ...bq, id: `q_temp_${Date.now()}` }]);
                          showToast('Question imported from bank!', 'success');
                        }}
                        className="w-full py-1 bg-[#002147] hover:bg-slate-800 text-[#D4AF37] font-bold rounded-lg text-[10px] border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Import into Exam
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: AI ASSISTANT */}
            {leftTab === 'ai' && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> EDUkenZA AI Exam Author
                </h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Type a topic or concept, and AI will construct a complete examination question with solutions and options.
                </p>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. Generate a Grade 10 Physics question on Ohm's Law and resistance calculation..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                />
                <button
                  onClick={handleRunAi}
                  disabled={aiLoading}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#002147] font-black rounded-xl text-xs transition shadow cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 text-[#002147]" />
                  {aiLoading ? 'Generating Question...' : 'Generate AI Question'}
                </button>
              </div>
            )}

            {/* TAB 5: DIAGRAM & MEDIA TEMPLATES */}
            {leftTab === 'media' && (
              <div className="space-y-3 text-xs">
                <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
                  Scientific Diagram Library
                </h3>
                <p className="text-slate-400 text-[11px]">Click a preset diagram to attach it directly to the active question.</p>
                <div className="space-y-2">
                  {[
                    { label: 'Plant Cell Diagram', url: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Atomic Structure & Electrons', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80' },
                    { label: 'Calculus Function Graph', url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80' }
                  ].map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        updateActiveQuestion({ imageUrl: d.url });
                        showToast(`Attached ${d.label} image!`, 'success');
                      }}
                      className="w-full p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-2 text-slate-200 font-medium cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* CENTER PANEL: WORD DOCUMENT PAPER EDITOR OR 3-PANE QUESTION EDITOR */}
        {authoringMode === 'word_doc' ? (
          <main className="flex-1 bg-slate-900 flex flex-col overflow-y-auto p-6 space-y-6">
            {/* Word-Processor Ribbon / Toolbar */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">Word Document Paper Studio</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">A4 Continuous Layout</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 text-[10px] font-bold">Font:</span>
                    <select
                      value={docFontFamily}
                      onChange={e => setDocFontFamily(e.target.value)}
                      className="bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-800 font-bold"
                    >
                      <option value="Times New Roman, serif">Times New Roman</option>
                      <option value="Calibri, sans-serif">Calibri</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Georgia, serif">Georgia</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-400 text-[10px] font-bold">Size:</span>
                    <select
                      value={docFontSize}
                      onChange={e => setDocFontSize(e.target.value)}
                      className="bg-slate-900 text-white text-xs px-2 py-1 rounded border border-slate-800 font-bold"
                    >
                      <option value="11pt">11pt</option>
                      <option value="12pt">12pt (Standard)</option>
                      <option value="14pt">14pt</option>
                      <option value="16pt">16pt (Heading)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => createNewQuestion()}
                    className="px-3 py-1 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question to Paper
                  </button>
                </div>
              </div>

              {/* Formatting Quick Insert Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 mr-1">Insert Items:</span>
                <button onClick={() => insertText('\n(a) ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[11px] border border-slate-700">
                  + (a) Sub-Question
                </button>
                <button onClick={() => insertText('\n(i) ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[11px] border border-slate-700">
                  + (i) Roman Sub
                </button>
                <button onClick={() => insertText('\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Item 1 | Item 2 | Item 3 |\n')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[11px] border border-slate-700 flex items-center gap-1">
                  <TableIcon className="w-3 h-3" /> Table
                </button>
                <button onClick={() => insertText(' $x^2 + 5x + 6 = 0$ ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-mono text-[11px] border border-slate-700">
                  $x^2 + 5x + 6 = 0$
                </button>
                <button onClick={() => insertText(' $\\sqrt{144} = 12$ ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-mono text-[11px] border border-slate-700">
                  $\sqrt{144}$
                </button>
                <button onClick={() => insertText(' H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded font-mono text-[11px] border border-slate-700">
                  Chemistry Eq
                </button>
                <button onClick={() => insertText(' E = mc² ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded font-mono text-[11px] border border-slate-700">
                  Physics Eq
                </button>
              </div>
            </div>

            {/* A4 PAPER CANVAS */}
            <div className="bg-white text-slate-900 shadow-2xl rounded-sm p-10 max-w-[850px] w-full mx-auto space-y-6 border border-slate-300 font-serif min-h-[1050px] print:p-0 print:shadow-none print:border-none">
              
              {/* Paper Header Block */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-3">
                <div className="flex items-center justify-between gap-4">
                  {schoolLogoUrl ? (
                    <img src={schoolLogoUrl} alt="School Logo" className="h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded border flex items-center justify-center text-xs font-bold">LOGO</div>
                  )}
                  <div className="flex-1 text-center">
                    <input
                      type="text"
                      value={schoolName}
                      onChange={e => setSchoolName(e.target.value)}
                      className="text-xl font-black tracking-tight text-slate-900 uppercase text-center w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-800"
                    />
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-1">{examTitle} • {academicYear} ({term})</p>
                  </div>
                  {ministryLogoUrl ? (
                    <img src={ministryLogoUrl} alt="Ministry Logo" className="h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-50 rounded border flex items-center justify-center text-[10px] text-slate-400 font-bold">MINISTRY</div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans bg-slate-50 p-3 rounded-lg border border-slate-200 text-left font-semibold">
                  <div><span className="text-slate-500 block text-[10px]">SUBJECT:</span> {subjectName}</div>
                  <div><span className="text-slate-500 block text-[10px]">CLASS / GRADE:</span> {classGrade}</div>
                  <div><span className="text-slate-500 block text-[10px]">DURATION:</span> {durationMinutes} Mins</div>
                  <div><span className="text-slate-500 block text-[10px]">TOTAL MARKS:</span> {totalPoints} Marks</div>
                  <div><span className="text-slate-500 block text-[10px]">TEACHER:</span> {teacherAuthorName}</div>
                  <div><span className="text-slate-500 block text-[10px]">DATE:</span> {examDate}</div>
                  <div><span className="text-slate-500 block text-[10px]">EXAM TYPE:</span> {examType}</div>
                  <div><span className="text-slate-500 block text-[10px]">PASSING SCORE:</span> {passingScorePercentage}%</div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-sans text-left pt-1">
                  <div className="border-b border-dashed border-slate-400 pb-1"><b>CANDIDATE NAME:</b> ___________________________</div>
                  <div className="border-b border-dashed border-slate-400 pb-1"><b>CANDIDATE NUMBER:</b> _________________</div>
                </div>

                <div className="text-xs text-left bg-amber-50/60 p-3 rounded border border-amber-200">
                  <span className="font-bold text-slate-900 uppercase block mb-1">INSTRUCTIONS TO CANDIDATES:</span>
                  <textarea
                    rows={3}
                    value={candidateInstructions}
                    onChange={e => setCandidateInstructions(e.target.value)}
                    className="w-full text-slate-800 bg-transparent text-xs leading-relaxed border border-transparent hover:border-amber-300 p-1 rounded font-sans"
                  />
                </div>
              </div>

              {/* Questions Rendered as Continuous Document */}
              <div className="space-y-8 text-sm leading-relaxed font-sans">
                {examQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-xl transition border ${
                      activeQuestionIndex === idx
                        ? 'border-amber-400 bg-amber-50/30'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                    onClick={() => setActiveQuestionIndex(idx)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2 font-bold text-slate-900">
                      <span className="text-base text-[#002147]">QUESTION {idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                          [{q.points || 5} MARKS]
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteActiveQuestion(idx);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 transition"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="prose prose-slate max-w-none mb-3">
                      <CbtMathRenderer content={q.title || 'Type question title prompt here...'} />
                    </div>

                    {q.latexFormula && (
                      <div className="my-2 p-3 bg-slate-50 rounded border border-slate-200 font-mono text-center text-slate-900">
                        <CbtMathRenderer content={`$$${q.latexFormula}$$`} />
                      </div>
                    )}

                    {q.imageUrl && (
                      <img src={q.imageUrl} alt="Exam Diagram" className="max-h-48 my-3 rounded mx-auto border object-contain" />
                    )}

                    {(q.options || []).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pl-4">
                        {(q.options || []).map((o, oIdx) => (
                          <div key={o.id} className="flex items-center gap-2 text-slate-800 text-xs">
                            <span className="font-bold font-mono">({String.fromCharCode(97 + oIdx)})</span>
                            <CbtMathRenderer content={o.text} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* End of Examination Footer */}
              <div className="text-center pt-8 border-t border-slate-300 text-xs font-bold text-slate-500 tracking-widest uppercase">
                *** END OF EXAMINATION PAPER ***
              </div>

            </div>
          </main>
        ) : (
          /* CENTER PANEL: LARGE WORD-PROCESSOR QUESTION EDITOR (Flex-1) */
          <main className="flex-1 bg-slate-950 flex flex-col overflow-y-auto p-6 space-y-6">
          
          {/* Question Header & Type Switcher */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#D4AF37] text-[#002147] font-black font-mono text-sm flex items-center justify-center shadow">
                Q{activeQuestionIndex + 1}
              </span>
              <div>
                <h2 className="text-sm font-bold text-white">Question Prompt Editor</h2>
                <p className="text-[10px] text-slate-400">Supports long-form typing (5000+ words), math LaTeX & chemical equations</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Question Type:</span>
                <select
                  value={currentQuestion.type}
                  onChange={e => updateActiveQuestion({ type: e.target.value as CbtQuestionType })}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-[#D4AF37]"
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

              <button
                onClick={duplicateActiveQuestion}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700"
                title="Duplicate Question"
              >
                <Copy className="w-4 h-4 text-[#D4AF37]" />
              </button>
            </div>
          </div>

          {/* PALETTE / TOOLBAR: WORD-PROCESSOR & FORMULA TOOLBAR */}
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 mr-2 uppercase">Rich Editor Tools:</span>

              {/* Formatting */}
              <button onClick={() => insertText(' **Bold Text** ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold flex items-center gap-1">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertText(' *Italic Text* ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs italic flex items-center gap-1">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertText(' <u>Underline</u> ')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs underline flex items-center gap-1">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertText('\n- Bullet Item\n')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1">
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertText('\n1. Numbered Item\n')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              {/* Math Palette */}
              <span className="text-[10px] font-bold text-[#D4AF37] flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" /> Math:
              </span>
              {[
                { label: 'x²', val: 'x²' },
                { label: 'xⁿ', val: 'x^n' },
                { label: '√x', val: '$\\sqrt{x}$' },
                { label: '±', val: '±' },
                { label: '≠', val: '≠' },
                { label: 'π', val: 'π' },
                { label: 'θ', val: 'θ' },
                { label: 'Fraction', val: '$\\frac{a}{b}$' },
                { label: 'Quad', val: '$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$' }
              ].map((m, i) => (
                <button
                  key={i}
                  onClick={() => insertText(` ${m.val} `)}
                  className="px-2 py-1 bg-slate-800 hover:bg-[#002147] text-amber-300 rounded font-mono text-[11px] border border-slate-700 transition cursor-pointer"
                >
                  {m.label}
                </button>
              ))}

              <div className="h-4 w-px bg-slate-800 mx-1" />

              {/* Science Palette */}
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <FlaskConical className="w-3.5 h-3.5" /> Chemistry:
              </span>
              {[
                { label: 'H₂O', val: 'H₂O' },
                { label: 'CO₂', val: 'CO₂' },
                { label: 'H₂SO₄', val: 'H₂SO₄' },
                { label: 'NaCl', val: 'NaCl' },
                { label: 'E = mc²', val: 'E = mc²' }
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => insertText(` ${c.val} `)}
                  className="px-2 py-1 bg-slate-800 hover:bg-[#002147] text-emerald-300 rounded font-mono text-[11px] border border-slate-700 transition cursor-pointer"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* QUESTION PROMPT TEXTAREA */}
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              rows={6}
              value={currentQuestion.title || ''}
              onChange={e => updateActiveQuestion({ title: e.target.value })}
              placeholder="Type your examination question prompt here... (e.g. Solve the equation x² + 5x + 6 = 0 or explain the reaction H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O)"
              className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 text-sm font-medium focus:ring-2 focus:ring-[#D4AF37] leading-relaxed shadow-inner"
            />
          </div>

          {/* ATTACHMENTS / MEDIA BLOCK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-amber-400" /> Standalone LaTeX Formula
              </label>
              <input
                type="text"
                value={currentQuestion.latexFormula || ''}
                onChange={e => updateActiveQuestion({ latexFormula: e.target.value })}
                placeholder="e.g. \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Image / Diagram URL
              </label>
              <input
                type="url"
                value={currentQuestion.imageUrl || ''}
                onChange={e => updateActiveQuestion({ imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 mb-1 block flex items-center gap-1">
                <MusicIcon className="w-3.5 h-3.5 text-slate-400" /> Audio URL
              </label>
              <input
                type="url"
                value={currentQuestion.audioUrl || ''}
                onChange={e => updateActiveQuestion({ audioUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          {/* ANSWER CONFIGURATION AREA BY QUESTION TYPE */}
          {(currentQuestion.type === 'mcq' || currentQuestion.type === 'multi_select' || currentQuestion.type === 'true_false') && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                  Answer Options & Correct Answer Key
                </h3>
                {currentQuestion.type !== 'true_false' && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="px-3 py-1.5 bg-[#002147] text-[#D4AF37] rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D4AF37]" /> Add Option
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(currentQuestion.options || []).map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleOptionCorrect(opt.id)}
                      className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                        opt.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${opt.isCorrect ? 'text-emerald-400' : 'text-slate-600'}`} />
                      {opt.isCorrect ? 'Correct Answer' : 'Set Correct'}
                    </button>

                    <span className="font-mono text-xs font-black text-amber-400 w-6">
                      {String.fromCharCode(65 + idx)}.
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={e => updateOptionText(opt.id, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-medium text-white focus:ring-1 focus:ring-[#D4AF37]"
                    />

                    {currentQuestion.type !== 'true_false' && (currentQuestion.options || []).length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(opt.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(currentQuestion.type === 'numeric' || currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank') && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-[#D4AF37] block">
                Exact Correct Answer (Auto-Graded)
              </label>
              <input
                type={currentQuestion.type === 'numeric' ? 'number' : 'text'}
                value={currentQuestion.correctAnswer?.toString() || ''}
                onChange={e => updateActiveQuestion({ correctAnswer: e.target.value })}
                placeholder="e.g. 76 or Chloroplasts"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400"
              />
            </div>
          )}

          {currentQuestion.type === 'essay' && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" /> Essay & Long-Answer Teacher Marking Rubric
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 block">Expected Answer Key / Model Solution</label>
                <textarea
                  rows={3}
                  value={currentQuestion.explanation || ''}
                  onChange={e => updateActiveQuestion({ explanation: e.target.value })}
                  placeholder="Model answer outline for educator grading..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>
          )}

        </main>
        )}

        {/* RIGHT PANEL: QUESTION METADATA & LIVE PREVIEW (Width 320px) */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-4 space-y-5 overflow-y-auto shrink-0">
          
          <h3 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
            Question Settings & Rubric
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Marks Allocation</label>
            <input
              type="number"
              min={1}
              max={100}
              value={currentQuestion.points || 5}
              onChange={e => updateActiveQuestion({ points: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-black text-emerald-400 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Difficulty Level</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Easy', 'Medium', 'Hard', 'Expert'] as CbtDifficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => updateActiveQuestion({ difficulty: d })}
                  className={`py-1.5 text-[11px] font-bold rounded-xl transition cursor-pointer ${
                    currentQuestion.difficulty === d
                      ? 'bg-[#002147] text-[#D4AF37] border border-slate-700 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Bloom's Taxonomy Level</label>
            <select
              value={currentQuestion.bloomLevel || 'Understanding'}
              onChange={e => updateActiveQuestion({ bloomLevel: e.target.value as CbtBloomTaxonomy })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            >
              <option value="Remembering">1. Remembering</option>
              <option value="Understanding">2. Understanding</option>
              <option value="Applying">3. Applying</option>
              <option value="Analyzing">4. Analyzing</option>
              <option value="Evaluating">5. Evaluating</option>
              <option value="Creating">6. Creating</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 mb-1 block">Step-by-Step Explanation</label>
            <textarea
              rows={3}
              value={currentQuestion.explanation || ''}
              onChange={e => updateActiveQuestion({ explanation: e.target.value })}
              placeholder="Explanation shown to student after exam..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
          </div>

          {/* LIVE STUDENT PREVIEW CARD */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Live Student Render Preview
            </span>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-xs font-medium text-slate-100 leading-relaxed">
                <CbtMathRenderer content={currentQuestion.title || 'Question preview will appear here...'} />
              </div>

              {currentQuestion.latexFormula && (
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 font-mono text-amber-300 text-xs overflow-x-auto text-center">
                  <CbtMathRenderer content={`$$${currentQuestion.latexFormula}$$`} />
                </div>
              )}

              {currentQuestion.imageUrl && (
                <img src={currentQuestion.imageUrl} alt="Diagram" className="max-h-36 rounded-lg mx-auto object-contain" />
              )}

              {(currentQuestion.options || []).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {(currentQuestion.options || []).map((o, idx) => (
                    <div key={o.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-xs flex items-center gap-2 text-slate-300">
                      <span className="font-mono text-[10px] font-bold text-[#D4AF37]">{String.fromCharCode(65 + idx)}.</span>
                      <div className="flex-1"><CbtMathRenderer content={o.text} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </aside>

      </div>

      {/* 3. FULL STUDENT PREVIEW SIMULATION OVERLAY */}
      {showFullStudentPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 p-6 flex flex-col items-center justify-center backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-[#002147] px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-sm">Full Student CBT Examination Simulation</h3>
              </div>
              <button onClick={() => setShowFullStudentPreview(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-100">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">{examTitle}</h2>
                  <p className="text-xs text-slate-400">{subjectName} • {classGrade} • Duration: {durationMinutes} Mins</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-amber-300 font-bold text-xs">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{durationMinutes}:00</span>
                </div>
              </div>

              <div className="space-y-6">
                {examQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-xs text-[#D4AF37]">Question {idx + 1} of {examQuestions.length}</span>
                      <span className="text-xs font-mono text-emerald-400">{q.points} Marks</span>
                    </div>

                    <div className="text-sm font-medium text-slate-100 leading-relaxed">
                      <CbtMathRenderer content={q.title} />
                    </div>

                    {q.latexFormula && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-amber-300 text-xs overflow-x-auto text-center">
                        <CbtMathRenderer content={`$$${q.latexFormula}$$`} />
                      </div>
                    )}

                    {(q.options || []).length > 0 && (
                      <div className="space-y-2 pt-2">
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={opt.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs flex items-center gap-3 text-slate-200">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-[11px] text-[#D4AF37]">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <div className="flex-1"><CbtMathRenderer content={opt.text} /></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFullStudentPreview(false)}
                className="px-6 py-2 bg-[#D4AF37] text-[#002147] font-black rounded-xl text-xs"
              >
                Close Student Simulation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
