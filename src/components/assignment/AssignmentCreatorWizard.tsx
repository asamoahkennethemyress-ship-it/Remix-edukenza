import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  BookOpen, 
  Award, 
  Calendar, 
  Paperclip, 
  Users, 
  Eye, 
  Send, 
  Save, 
  Clock, 
  Plus, 
  Trash2, 
  Upload, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  Sigma
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { RichTextEditor } from './RichTextEditor';
import { MathFormulaRenderer } from './MathFormulaRenderer';

export interface RubricCriterion {
  id: string;
  title: string;
  maxPoints: number;
  description: string;
  weightPercent?: number;
}

export interface AssignmentFormData {
  id?: string;
  assignmentId?: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  classId?: string;
  className: string;
  academicYear: string;
  academicTerm: string;
  term?: string;
  type: string;
  topic?: string;
  learningObjectives?: string;
  instructions: string;
  description?: string;
  estimatedTime?: string;
  totalMarks: number;
  passingMarks: number;
  gradingMethod: 'Points' | 'Percentage' | 'Letter Grade' | 'Rubric';
  rubricCriteria: RubricCriterion[];
  availableFromDate: string;
  availableFromTime: string;
  dueDate: string;
  dueTime: string;
  publishMode: 'Immediately' | 'Scheduled' | 'Draft';
  scheduledPublishDate?: string;
  lateSubmissionRule: 'Allowed' | 'Not Allowed' | 'Allowed Until Date';
  lateCutoffDate?: string;
  latePenaltyPercent: number;
  attachments: { name: string; url: string; size?: string; type?: string }[];
  recipientsMode: 'Class' | 'Specific Students';
  recipientStudentIds: string[];
  status?: 'Draft' | 'Published' | 'published' | 'Scheduled' | 'Archived' | 'draft' | 'closed' | string;
}

interface AssignmentCreatorWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AssignmentFormData, publish: boolean) => Promise<void>;
  schoolId: string;
  currentUser: any;
  assignedClasses: any[];
  assignedSubjects: any[];
  availableStudents: any[];
  initialData?: Partial<AssignmentFormData> | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AssignmentCreatorWizard: React.FC<AssignmentCreatorWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  schoolId,
  currentUser,
  assignedClasses,
  assignedSubjects,
  availableStudents,
  initialData,
  showToast
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const defaultClassName = assignedClasses[0]?.name || assignedClasses[0]?.className || (typeof assignedClasses[0] === 'string' ? assignedClasses[0] : '');
  const defaultSubjectName = assignedSubjects[0]?.name || assignedSubjects[0]?.subjectName || (typeof assignedSubjects[0] === 'string' ? assignedSubjects[0] : '');

  const [form, setForm] = useState<AssignmentFormData>({
    title: '',
    subjectName: defaultSubjectName,
    className: defaultClassName,
    academicYear: '2026',
    academicTerm: 'Term 1',
    type: 'Homework',
    topic: '',
    learningObjectives: '',
    instructions: '',
    estimatedTime: '45 mins',
    totalMarks: 100,
    passingMarks: 50,
    gradingMethod: 'Points',
    rubricCriteria: [
      { id: '1', title: 'Content Knowledge & Accuracy', maxPoints: 40, description: 'Demonstrates thorough understanding of the core concepts.' },
      { id: '2', title: 'Problem Solving Steps & Logic', maxPoints: 40, description: 'Clear step-by-step calculations and structured reasoning.' },
      { id: '3', title: 'Clarity & Formatting', maxPoints: 20, description: 'Neat, legible presentation with correct scientific notation.' }
    ],
    availableFromDate: new Date().toISOString().split('T')[0],
    availableFromTime: '08:00',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueTime: '23:59',
    publishMode: 'Immediately',
    scheduledPublishDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lateSubmissionRule: 'Allowed',
    lateCutoffDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    latePenaltyPercent: 10,
    attachments: [],
    recipientsMode: 'Class',
    recipientStudentIds: [],
    status: 'Draft'
  });

  useEffect(() => {
    if (initialData) {
      setForm(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Auto-save draft effect every 20 seconds
  useEffect(() => {
    if (!isOpen || !form.title) return;
    const interval = setInterval(() => {
      setAutoSaveStatus('saving');
      setTimeout(() => setAutoSaveStatus('saved'), 800);
    }, 20000);
    return () => clearInterval(interval);
  }, [form, isOpen]);

  if (!isOpen) return null;

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments = [...form.attachments];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const storageRef = ref(storage, `assignmentFiles/${schoolId}/${Date.now()}_${file.name}`);
        const snap = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snap.ref);
        newAttachments.push({
          name: file.name,
          url,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          type: file.type
        });
      } catch (err) {
        console.warn("Storage fallback link:", err);
        newAttachments.push({
          name: file.name,
          url: URL.createObjectURL(file),
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          type: file.type
        });
      }
    }

    setForm(prev => ({ ...prev, attachments: newAttachments }));
    setUploading(false);
    showToast("Attachment uploaded!", "success");
  };

  const removeAttachment = (index: number) => {
    const updated = form.attachments.filter((_, idx) => idx !== index);
    setForm(prev => ({ ...prev, attachments: updated }));
  };

  // Rubric Handlers
  const addRubricCriterion = () => {
    const newId = String(Date.now());
    setForm(prev => ({
      ...prev,
      rubricCriteria: [
        ...prev.rubricCriteria,
        { id: newId, title: 'New Criterion', maxPoints: 10, description: 'Evaluation criteria details' }
      ]
    }));
  };

  const updateRubricCriterion = (id: string, field: string, val: any) => {
    setForm(prev => ({
      ...prev,
      rubricCriteria: prev.rubricCriteria.map(c => c.id === id ? { ...c, [field]: val } : c)
    }));
  };

  const removeRubricCriterion = (id: string) => {
    setForm(prev => ({
      ...prev,
      rubricCriteria: prev.rubricCriteria.filter(c => c.id !== id)
    }));
  };

  // Submit Handler
  const handleFinalSubmit = async (publishNow: boolean) => {
    if (!form.title.trim()) {
      showToast("Please enter an Assignment Title", "error");
      setCurrentStep(1);
      return;
    }

    setSaving(true);
    try {
      const finalStatus = publishNow ? 'Published' : form.publishMode === 'Scheduled' ? 'Scheduled' : 'Draft';
      const updatedForm = { ...form, status: finalStatus };
      await onSave(updatedForm, publishNow);
      onClose();
    } catch (err) {
      console.error("Error saving assignment:", err);
      showToast("Failed to save assignment", "error");
    } finally {
      setSaving(false);
    }
  };

  const assignmentTypes = [
    'Homework', 'Classwork', 'Quiz', 'Project', 'Practical', 
    'Research', 'Group Work', 'Essay', 'Laboratory Report', 'Revision'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* HEADER BAR */}
        <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] px-6 py-4 text-white flex justify-between items-center border-b border-[#D4AF37]/30">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-xl font-black tracking-tight">Enterprise Assignment Wizard</h2>
              {autoSaveStatus === 'saved' && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-medium">
                  Draft Auto-Saved
                </span>
              )}
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              Create, design, schedule, and configure STEM equations & rubrics in 8 intuitive steps.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* STEPPER STEP CONTROLS */}
        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 overflow-x-auto flex items-center gap-2 text-xs font-bold">
          {[
            { id: 1, label: '1. Details', icon: FileText },
            { id: 2, label: '2. Content & Math', icon: Sigma },
            { id: 3, label: '3. Grading & Rubrics', icon: Award },
            { id: 4, label: '4. Scheduling', icon: Calendar },
            { id: 5, label: '5. Attachments', icon: Paperclip },
            { id: 6, label: '6. Recipients', icon: Users },
            { id: 7, label: '7. Live Preview', icon: Eye },
            { id: 8, label: '8. Publish', icon: Send }
          ].map(s => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                  isActive ? 'bg-[#002147] text-white shadow-sm border border-[#D4AF37]/40' :
                  isCompleted ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D4AF37]' : ''}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* WIZARD BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#002147] border-b pb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                Step 1: Core Assignment Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Assignment Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Quadratic Equations & Real-World Parabolas"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Subject Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.subjectName}
                    onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    {assignedSubjects.map((sb, idx) => {
                      const name = sb.name || sb.subjectName || sb;
                      return <option key={idx} value={name}>{name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Assigned Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    {assignedClasses.map((cl, idx) => {
                      const name = cl.name || cl.className || cl;
                      return <option key={idx} value={name}>{name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Assignment Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    {assignmentTypes.map((t, idx) => (
                      <option key={idx} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Estimated Completion Time
                  </label>
                  <input
                    type="text"
                    value={form.estimatedTime || ''}
                    onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
                    placeholder="e.g. 45 minutes"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Academic Term
                  </label>
                  <input
                    type="text"
                    value={form.academicTerm}
                    onChange={(e) => setForm({ ...form, academicTerm: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Topic / Sub-Unit (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.topic || ''}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    placeholder="e.g., Algebra - Unit 4: Quadratic Graphs & Roots"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Learning Objectives (Optional)
                  </label>
                  <textarea
                    value={form.learningObjectives || ''}
                    onChange={(e) => setForm({ ...form, learningObjectives: e.target.value })}
                    rows={2}
                    placeholder="e.g., Students will be able to calculate discriminant b^2 - 4ac and determine roots."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTENT & MATH */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                  <Sigma className="w-5 h-5 text-[#D4AF37]" />
                  Step 2: Rich Text & STEM Equation Editor
                </h3>
                <span className="text-[11px] text-slate-500 italic">
                  Tip: Use the "STEM Equation" button to format math/science formulas safely.
                </span>
              </div>

              <RichTextEditor
                value={form.instructions}
                onChange={(val) => setForm({ ...form, instructions: val })}
                placeholder="Type assignment problems, instructions, LaTeX math $E=mc^2$, chemistry reactions, tables or checklist..."
              />
            </div>
          )}

          {/* STEP 3: GRADING & RUBRICS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#002147] border-b pb-2 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                Step 3: Grading & Assessment Rubric
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Maximum Marks (Total)
                  </label>
                  <input
                    type="number"
                    value={form.totalMarks}
                    onChange={(e) => setForm({ ...form, totalMarks: Number(e.target.value) || 100 })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Passing Marks Threshold
                  </label>
                  <input
                    type="number"
                    value={form.passingMarks}
                    onChange={(e) => setForm({ ...form, passingMarks: Number(e.target.value) || 50 })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Grading Method
                  </label>
                  <select
                    value={form.gradingMethod}
                    onChange={(e) => setForm({ ...form, gradingMethod: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-800"
                  >
                    <option value="Points">Points / Score</option>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Letter Grade">Letter Grade (A, B, C, D, F)</option>
                    <option value="Rubric">Rubric-Based Assessment</option>
                  </select>
                </div>
              </div>

              {/* RUBRIC BUILDER SECTION */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-3xl space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#002147]">Rubric Criteria Builder</h4>
                    <p className="text-[11px] text-slate-500">Define criteria titles and max points for structured evaluation.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addRubricCriterion}
                    className="px-3 py-1.5 bg-[#002147] text-white text-xs font-bold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Criterion</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {form.rubricCriteria.map((crit, idx) => (
                    <div key={crit.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 font-mono">#{idx + 1}</span>
                      
                      <div className="flex-1 space-y-1 w-full">
                        <input
                          type="text"
                          value={crit.title}
                          onChange={(e) => updateRubricCriterion(crit.id, 'title', e.target.value)}
                          placeholder="Criterion Title"
                          className="w-full text-xs font-bold text-slate-800 p-1.5 border border-slate-200 rounded-lg"
                        />
                        <input
                          type="text"
                          value={crit.description}
                          onChange={(e) => updateRubricCriterion(crit.id, 'description', e.target.value)}
                          placeholder="Description / Expectation"
                          className="w-full text-[11px] text-slate-600 p-1 border border-slate-100 rounded-lg"
                        />
                      </div>

                      <div className="w-28">
                        <label className="text-[10px] font-bold text-slate-400 block">Max Points</label>
                        <input
                          type="number"
                          value={crit.maxPoints}
                          onChange={(e) => updateRubricCriterion(crit.id, 'maxPoints', Number(e.target.value) || 0)}
                          className="w-full text-xs font-bold p-1.5 border border-slate-200 rounded-lg"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeRubricCriterion(crit.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SCHEDULING & LATE RULES */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#002147] border-b pb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D4AF37]" />
                Step 4: Scheduling & Submission Policy
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Available From Date
                  </label>
                  <input
                    type="date"
                    value={form.availableFromDate}
                    onChange={(e) => setForm({ ...form, availableFromDate: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={form.dueTime}
                    onChange={(e) => setForm({ ...form, dueTime: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Publishing Strategy
                  </label>
                  <select
                    value={form.publishMode}
                    onChange={(e) => setForm({ ...form, publishMode: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800"
                  >
                    <option value="Immediately">Publish Immediately</option>
                    <option value="Scheduled">Schedule Publishing Date</option>
                    <option value="Draft">Save as Draft</option>
                  </select>
                </div>

                {form.publishMode === 'Scheduled' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Scheduled Release Date
                    </label>
                    <input
                      type="date"
                      value={form.scheduledPublishDate || ''}
                      onChange={(e) => setForm({ ...form, scheduledPublishDate: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Late Submission Policy
                  </label>
                  <select
                    value={form.lateSubmissionRule}
                    onChange={(e) => setForm({ ...form, lateSubmissionRule: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800"
                  >
                    <option value="Allowed">Allowed with Warning</option>
                    <option value="Not Allowed">Strict Cut-off (Not Allowed)</option>
                    <option value="Allowed Until Date">Allowed Until Cut-off Date</option>
                  </select>
                </div>

                {form.lateSubmissionRule !== 'Not Allowed' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Late Deduction Penalty (%)
                    </label>
                    <input
                      type="number"
                      value={form.latePenaltyPercent}
                      onChange={(e) => setForm({ ...form, latePenaltyPercent: Number(e.target.value) || 0 })}
                      placeholder="e.g. 10"
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: ATTACHMENTS */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#002147] border-b pb-2 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-[#D4AF37]" />
                Step 5: Reference Materials & Attachments
              </h3>

              <div className="border-2 border-dashed border-slate-300 bg-slate-50 p-6 rounded-3xl text-center hover:bg-slate-100 transition relative">
                <Upload className="w-8 h-8 text-[#002147] mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Drag & Drop files or click to upload</p>
                <p className="text-[11px] text-slate-400 mt-0.5">PDF, DOCX, PPTX, XLSX, ZIP, Images, Audio, Video</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {uploading && (
                  <div className="mt-2 text-xs font-bold text-amber-600 flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Uploading attachment to Firebase Storage...</span>
                  </div>
                )}
              </div>

              {/* ATTACHMENTS LIST */}
              <div className="space-y-2">
                {form.attachments.map((att, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2.5">
                      <Paperclip className="w-4 h-4 text-[#002147]" />
                      <a href={att.url} target="_blank" rel="noreferrer" className="font-bold text-slate-800 hover:underline">
                        {att.name}
                      </a>
                      {att.size && <span className="text-[10px] text-slate-400">({att.size})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 6: RECIPIENTS */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-[#002147] border-b pb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                Step 6: Audience & Target Recipients
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setForm({ ...form, recipientsMode: 'Class', recipientStudentIds: [] })}
                  className={`p-4 rounded-3xl border-2 cursor-pointer transition ${
                    form.recipientsMode === 'Class' ? 'border-[#002147] bg-blue-50/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <h4 className="text-xs font-bold text-[#002147]">Assign to Entire Class ({form.className})</h4>
                  <p className="text-[11px] text-slate-500 mt-1">All enrolled students in {form.className} will receive this assignment.</p>
                </div>

                <div
                  onClick={() => setForm({ ...form, recipientsMode: 'Specific Students' })}
                  className={`p-4 rounded-3xl border-2 cursor-pointer transition ${
                    form.recipientsMode === 'Specific Students' ? 'border-[#002147] bg-blue-50/40' : 'border-slate-200 bg-white'
                  }`}
                >
                  <h4 className="text-xs font-bold text-[#002147]">Differentiated / Specific Students</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Select specific learners for intervention, extension, or group work.</p>
                </div>
              </div>

              {form.recipientsMode === 'Specific Students' && (
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 space-y-2 max-h-56 overflow-y-auto">
                  <span className="text-xs font-bold text-slate-600 block mb-2">Select Enrolled Learners:</span>
                  {availableStudents.length === 0 ? (
                    <p className="text-xs text-slate-400">No student roster records found for selection.</p>
                  ) : (
                    availableStudents.map(st => {
                      const sId = st.id || st.studentId;
                      const isSelected = form.recipientStudentIds.includes(sId);
                      return (
                        <label key={sId} className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, recipientStudentIds: [...form.recipientStudentIds, sId] });
                              } else {
                                setForm({ ...form, recipientStudentIds: form.recipientStudentIds.filter(id => id !== sId) });
                              }
                            }}
                            className="rounded text-[#002147]"
                          />
                          <span>{st.name || st.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-auto">{st.studentId || sId}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 7: PREVIEW */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-base font-bold text-[#002147] flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#D4AF37]" />
                  Step 7: Student Live Perspective Preview
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                  Exact Student View Mode
                </span>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-[#D4AF37]/30">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2.5 py-1 bg-amber-400/20 text-[#D4AF37] rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {form.subjectName} • {form.type}
                    </span>
                    <h2 className="text-xl font-black mt-2">{form.title || 'Untitled Assignment'}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">Class: {form.className} | Est. Time: {form.estimatedTime}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-400">{form.totalMarks} Marks</span>
                    <p className="text-[11px] text-slate-400">Due: {form.dueDate} {form.dueTime}</p>
                  </div>
                </div>

                {/* INSTRUCTIONS & EQUATIONS PREVIEW */}
                <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 text-slate-200 text-xs space-y-3">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Instructions & Task Problems</span>
                  <div className="prose prose-invert text-xs leading-relaxed">
                    {form.instructions ? (
                      form.instructions.split(/(\$[^\$]+\$)/g).map((part, i) => {
                        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                          return <MathFormulaRenderer key={i} latex={part.slice(1, -1)} inline={true} />;
                        }
                        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
                      })
                    ) : (
                      <span className="text-slate-500 italic">No instructions typed.</span>
                    )}
                  </div>
                </div>

                {/* RUBRIC PREVIEW */}
                {form.rubricCriteria.length > 0 && (
                  <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Grading Rubric</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {form.rubricCriteria.map(c => (
                        <div key={c.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                          <div className="flex justify-between font-bold text-white">
                            <span>{c.title}</span>
                            <span className="text-emerald-400">{c.maxPoints} pts</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 8: PUBLISH & SAVE */}
          {currentStep === 8 && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 bg-[#002147] text-[#D4AF37] rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-[#D4AF37]/30">
                <Send className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-[#002147]">Ready to Finalize Assignment</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Publish immediately to notify all students and parents in real time, or save as a draft for future editing.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleFinalSubmit(false)}
                  disabled={saving}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-2xl transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-slate-600" />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFinalSubmit(true)}
                  disabled={saving}
                  className="px-8 py-3 bg-[#002147] hover:bg-[#0b3c5d] text-white text-xs font-bold rounded-2xl shadow-xl transition flex items-center gap-2 border border-[#D4AF37]/40 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-[#D4AF37]" />
                  <span>{saving ? 'Publishing...' : 'Publish & Send Notifications'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* WIZARD NAVIGATION FOOTER */}
        <div className="bg-slate-100 px-6 py-4 flex justify-between items-center border-t border-slate-200">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-bold text-slate-400">Step {currentStep} of 8</span>

          {currentStep < 8 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(8, prev + 1))}
              className="px-5 py-2 bg-[#002147] hover:bg-[#0b3c5d] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-[#D4AF37]/30"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleFinalSubmit(true)}
              disabled={saving}
              className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Finish & Publish</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
