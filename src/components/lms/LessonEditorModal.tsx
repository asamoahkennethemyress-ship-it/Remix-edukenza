import React, { useState } from 'react';
import { X, FileText, Video, Code, Save, Plus, Trash2 } from 'lucide-react';
import { LmsLesson, LessonStatus } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface LessonEditorModalProps {
  lesson?: LmsLesson | null;
  courseId: string;
  schoolId: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onSaved: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LessonEditorModal: React.FC<LessonEditorModalProps> = ({
  lesson,
  courseId,
  schoolId,
  currentUserId,
  currentUserName,
  onClose,
  onSaved,
  showToast
}) => {
  const [title, setTitle] = useState(lesson?.title || '');
  const [summary, setSummary] = useState(lesson?.summary || '');
  const [content, setContent] = useState(lesson?.content || '');
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '');
  const [order, setOrder] = useState(lesson?.order || 1);
  const [durationMinutes, setDurationMinutes] = useState(lesson?.durationMinutes || 45);
  const [status, setStatus] = useState<LessonStatus>(lesson?.status || 'published');
  const [mathInputs, setMathInputs] = useState<string[]>(lesson?.mathExpressions || []);
  const [newMath, setNewMath] = useState('');
  const [chemInputs, setChemInputs] = useState<string[]>(lesson?.chemicalFormulas || []);
  const [newChem, setNewChem] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMath = () => {
    if (newMath.trim()) {
      setMathInputs(prev => [...prev, newMath.trim()]);
      setNewMath('');
    }
  };

  const handleAddChem = () => {
    if (newChem.trim()) {
      setChemInputs(prev => [...prev, newChem.trim()]);
      setNewChem('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);

    await LmsService.saveLesson({
      id: lesson?.id,
      courseId,
      schoolId,
      title,
      summary,
      content,
      order: Number(order),
      durationMinutes: Number(durationMinutes),
      status,
      authorId: currentUserId,
      authorName: currentUserName,
      videoUrl: videoUrl.trim() || undefined,
      videoType: videoUrl.includes('youtube') ? 'youtube' : 'mp4',
      mathExpressions: mathInputs,
      chemicalFormulas: chemInputs,
      attachments: lesson?.attachments || []
    });

    setLoading(false);
    showToast?.('Lesson saved successfully!', 'success');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {lesson ? 'Edit Lesson Content' : 'Create New Lesson'}
            </h3>
            <p className="text-xs text-slate-500">
              Rich markdown notes, video lectures, and STEM formula editor.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase">Lesson Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Lesson 1: Quadratic Equations"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LessonStatus)}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase">Summary / Abstract</label>
            <input
              type="text"
              placeholder="Short overview for lesson card..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase">Rich Lesson Content (Markdown Supported)</label>
            <textarea
              rows={8}
              required
              placeholder="Write detailed lesson content. Use ## for headings and $$ for equations..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Video Lecture URL</label>
              <input
                type="url"
                placeholder="YouTube or MP4 link..."
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Estimated Duration (Mins)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* STEM Formulas */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase">Math & Science Formulas</h4>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Math LaTeX e.g. x = (-b +- sqrt(b^2-4ac))/2a"
                value={newMath}
                onChange={e => setNewMath(e.target.value)}
                className="flex-1 p-2 rounded-xl border border-slate-200 text-xs"
              />
              <button
                type="button"
                onClick={handleAddMath}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Add Math
              </button>
            </div>

            {mathInputs.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {mathInputs.map((m, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-indigo-100 text-indigo-900 rounded-lg text-xs font-mono flex items-center gap-1">
                    {m}
                    <button type="button" onClick={() => setMathInputs(prev => prev.filter((_, i) => i !== idx))}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              {loading ? 'Saving...' : 'Save Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
