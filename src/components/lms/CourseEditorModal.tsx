import React, { useState } from 'react';
import { X, BookOpen, Image, Save } from 'lucide-react';
import { LmsCourse, CourseStatus } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface CourseEditorModalProps {
  course?: LmsCourse | null;
  schoolId: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onSaved: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CourseEditorModal: React.FC<CourseEditorModalProps> = ({
  course,
  schoolId,
  currentUserId,
  currentUserName,
  onClose,
  onSaved,
  showToast
}) => {
  const [courseCode, setCourseCode] = useState(course?.courseCode || '');
  const [courseName, setCourseName] = useState(course?.courseName || '');
  const [subject, setSubject] = useState(course?.subject || '');
  const [description, setDescription] = useState(course?.description || '');
  const [className, setClassName] = useState(course?.className || '');
  const [teacherName, setTeacherName] = useState(course?.teacherName || currentUserName);
  const [term, setTerm] = useState(course?.term || 'Term 1');
  const [academicYear, setAcademicYear] = useState(course?.academicYear || '2026');
  const [coverImage, setCoverImage] = useState(
    course?.coverImage || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80'
  );
  const [status, setStatus] = useState<CourseStatus>(course?.status || 'active');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    setLoading(true);

    if (course) {
      await LmsService.updateCourse(course.id, {
        courseCode,
        courseName,
        subject,
        description,
        className,
        teacherName,
        term,
        academicYear,
        coverImage,
        status
      });
      showToast?.('Course updated successfully!', 'success');
    } else {
      await LmsService.createCourse({
        schoolId,
        courseCode,
        courseName,
        subject,
        description,
        teacherId: currentUserId,
        teacherName,
        classId: `class_${className.toLowerCase().replace(/\s+/g, '_')}`,
        className,
        academicYear,
        term,
        coverImage,
        status
      });
      showToast?.('Course created successfully!', 'success');
    }

    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {course ? 'Edit Course Settings' : 'Create New Course'}
            </h3>
            <p className="text-xs text-slate-500">
              Set course metadata, assigned class, teacher, and academic term.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Course Code</label>
              <input
                type="text"
                required
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase">Course Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Grade 10 Pure Mathematics"
              value={courseName}
              onChange={e => setCourseName(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase">Description</label>
            <textarea
              rows={3}
              placeholder="Brief course summary..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Class</label>
              <input
                type="text"
                required
                value={className}
                onChange={e => setClassName(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Term</label>
              <select
                value={term}
                onChange={e => setTerm(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Term 4">Term 4</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as CourseStatus)}
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase">Cover Image URL</label>
            <input
              type="url"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
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
              {loading ? 'Saving...' : 'Save Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
