import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { handleFirestoreError, OperationType } from '../../utils/firestoreError';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  AlertTriangle, 
  Search, 
  School, 
  Users, 
  BookOpen, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { StudentRecord, TeacherRecord, ClassRecord, SubjectRecord, SchoolProfileData } from '../SchoolAdminDashboard';

export interface TimetableEntry {
  id: string;
  timetableId: string;
  schoolId: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  academicYear: string;
  term: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  startTime: string; // "08:00"
  endTime: string;   // "08:50"
  room?: string;
  status: 'Draft' | 'Published';
  createdAt: string;
  updatedAt?: string;
}

interface TimetableManagementProps {
  schoolId: string;
  schoolProfile: SchoolProfileData;
  students: StudentRecord[];
  teachers: TeacherRecord[];
  classes: ClassRecord[];
  subjects: SubjectRecord[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

export const TimetableManagement: React.FC<TimetableManagementProps> = ({
  schoolId,
  schoolProfile,
  teachers,
  classes,
  subjects,
  showToast
}) => {
  const [timetables, setTimetables] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>(schoolProfile.academicTerm || 'Term 1, 2026');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<TimetableEntry> | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Print view state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Delete modal
  const [itemToDelete, setItemToDelete] = useState<TimetableEntry | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(collection(db, 'timetables'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TimetableEntry[];
      setTimetables(data);

      if (classes.length > 0 && !selectedClassId) {
        setSelectedClassId(classes[0].id);
      }
      if (teachers.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(teachers[0].teacherId || teachers[0].id);
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching timetables:', err);
      handleFirestoreError(err, OperationType.GET, 'timetables');
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, classes, teachers]);

  // Conflict validation rule
  const validateTimetableConflict = (
    entry: Partial<TimetableEntry>,
    existingEntries: TimetableEntry[]
  ): string | null => {
    if (!entry.classId || !entry.teacherId || !entry.day || !entry.startTime || !entry.endTime) {
      return 'Please complete all required fields (Class, Teacher, Day, Start Time, End Time).';
    }

    if (entry.startTime >= entry.endTime) {
      return 'Start Time must be strictly earlier than End Time.';
    }

    // Check overlaps
    for (const item of existingEntries) {
      // Ignore if editing self
      if (entry.id && item.id === entry.id) continue;

      // Same term/year and same day
      if (
        item.day === entry.day &&
        (item.term === (entry.term || selectedTerm)) &&
        (item.academicYear === (entry.academicYear || selectedYear))
      ) {
        const hasTimeOverlap =
          (entry.startTime! < item.endTime && entry.endTime! > item.startTime);

        if (hasTimeOverlap) {
          // 1. Same class conflict
          if (item.classId === entry.classId) {
            return `Conflict: Class "${item.className}" already has a lesson (${item.subjectName}) scheduled from ${item.startTime} to ${item.endTime} on ${item.day}.`;
          }
          // 2. Same teacher conflict
          if (item.teacherId === entry.teacherId) {
            return `Conflict: Teacher "${item.teacherName}" is already assigned to Class "${item.className}" (${item.subjectName}) from ${item.startTime} to ${item.endTime} on ${item.day}.`;
          }
        }
      }
    }

    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!editingItem) return;

    const selectedClass = classes.find(c => c.id === editingItem.classId);
    const selectedTeacher = teachers.find(t => t.id === editingItem.teacherId || t.teacherId === editingItem.teacherId);
    const selectedSubject = subjects.find(s => s.id === editingItem.subjectId || s.subjectId === editingItem.subjectId);

    const payload: Partial<TimetableEntry> = {
      ...editingItem,
      schoolId,
      className: selectedClass?.className || editingItem.className || 'Class',
      teacherId: selectedTeacher?.teacherId || selectedTeacher?.id || editingItem.teacherId,
      teacherName: selectedTeacher?.fullName || editingItem.teacherName || 'Teacher',
      subjectId: selectedSubject?.subjectId || selectedSubject?.id || editingItem.subjectId,
      subjectName: selectedSubject?.subjectName || editingItem.subjectName || 'Subject',
      academicYear: editingItem.academicYear || selectedYear,
      term: editingItem.term || selectedTerm,
      status: editingItem.status || 'Draft',
    };

    const conflictMsg = validateTimetableConflict(payload, timetables);
    if (conflictMsg) {
      setValidationError(conflictMsg);
      return;
    }

    try {
      if (editingItem.id) {
        await updateDoc(doc(db, 'timetables', editingItem.id), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
        showToast('Timetable lesson updated successfully!', 'success');
      } else {
        const newRef = doc(collection(db, 'timetables'));
        const customId = `TT-${Math.floor(10000 + Math.random() * 90000)}`;
        await setDoc(newRef, {
          ...payload,
          timetableId: customId,
          createdAt: new Date().toISOString()
        });
        showToast('Timetable lesson added!', 'success');
      }

      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'timetables');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'timetables', itemToDelete.id));
      showToast('Timetable lesson deleted.', 'success');
      setItemToDelete(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `timetables/${itemToDelete.id}`);
    }
  };

  const togglePublishStatus = async (item: TimetableEntry) => {
    const nextStatus = item.status === 'Published' ? 'Draft' : 'Published';
    try {
      await updateDoc(doc(db, 'timetables', item.id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      showToast(`Timetable lesson is now ${nextStatus}`, 'success');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `timetables/${item.id}`);
    }
  };

  const publishAllForClass = async (cId: string, publish: boolean) => {
    const classLessons = timetables.filter(t => t.classId === cId);
    if (classLessons.length === 0) {
      showToast('No timetable entries found for this class.', 'info');
      return;
    }

    try {
      const targetStatus = publish ? 'Published' : 'Draft';
      await Promise.all(classLessons.map(l => 
        updateDoc(doc(db, 'timetables', l.id), { status: targetStatus, updatedAt: new Date().toISOString() })
      ));
      showToast(`All lessons for this class set to ${targetStatus}!`, 'success');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'timetables');
    }
  };

  // Filtered timetable entries for weekly view
  const activeClassObj = classes.find(c => c.id === selectedClassId);
  const activeTeacherObj = teachers.find(t => t.teacherId === selectedTeacherId || t.id === selectedTeacherId);

  const displayedTimetables = timetables.filter(t => {
    if (viewMode === 'class') {
      return t.classId === selectedClassId;
    } else {
      return t.teacherId === selectedTeacherId;
    }
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#002147]" />
            <h2 className="text-xl font-black text-[#002147] tracking-wide uppercase">Timetable Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create, publish, and view conflict-free weekly schedules for classes and teachers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingItem({
                classId: selectedClassId || (classes[0]?.id || ''),
                teacherId: teachers[0]?.teacherId || teachers[0]?.id || '',
                subjectId: subjects[0]?.subjectId || subjects[0]?.id || '',
                day: 'Monday',
                startTime: '08:00',
                endTime: '08:50',
                academicYear: selectedYear,
                term: selectedTerm,
                status: 'Draft'
              });
              setValidationError(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-[#002147] hover:bg-[#003366] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>Add Lesson</span>
          </button>

          {viewMode === 'class' && selectedClassId && (
            <>
              <button
                onClick={() => publishAllForClass(selectedClassId, true)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Class</span>
              </button>
              <button
                onClick={() => publishAllForClass(selectedClassId, false)}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <XCircle className="w-4 h-4" />
                <span>Unpublish</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Print Timetable</span>
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Toggle Mode */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('class')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
              viewMode === 'class' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Class Timetable</span>
          </button>
          <button
            onClick={() => setViewMode('teacher')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 ${
              viewMode === 'teacher' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teacher Timetable</span>
          </button>
        </div>

        {/* Select Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'class' ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Class:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.className} ({c.classLevel})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Teacher:</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.teacherId || t.id}>
                    {t.fullName} ({t.subject})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700">Term:</label>
            <input
              type="text"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg w-28 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Weekly Timetable Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              {viewMode === 'class'
                ? `Weekly Schedule — ${activeClassObj?.className || 'Selected Class'}`
                : `Teaching Schedule — ${activeTeacherObj?.fullName || 'Selected Teacher'}`}
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{displayedTimetables.length} Lessons Scheduled</span>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[700px]">
            {DAYS_OF_WEEK.map((day) => {
              const dayLessons = displayedTimetables
                .filter((t) => t.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div key={day} className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-3">
                  <div className="bg-[#002147] text-white py-1.5 px-3 rounded-lg text-center font-black text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>{day}</span>
                    <span className="bg-[#D4AF37] text-[#002147] text-[10px] px-1.5 py-0.2 rounded font-black">
                      {dayLessons.length}
                    </span>
                  </div>

                  {dayLessons.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-lg">
                      No lessons
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dayLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`p-3 rounded-xl border transition shadow-sm relative group bg-white ${
                            lesson.status === 'Published'
                              ? 'border-emerald-300 ring-1 ring-emerald-500/20'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pb-1 border-b border-slate-100">
                            <span className="flex items-center gap-1 text-[#002147]">
                              <Clock className="w-3 h-3 text-[#D4AF37]" />
                              {lesson.startTime} - {lesson.endTime}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-extrabold uppercase text-[9px] ${
                                lesson.status === 'Published'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {lesson.status}
                            </span>
                          </div>

                          <div className="mt-2 space-y-0.5">
                            <h4 className="text-xs font-black text-slate-900 leading-tight">
                              {lesson.subjectName}
                            </h4>
                            <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {viewMode === 'class' ? lesson.teacherName : lesson.className}
                            </p>
                            {lesson.room && (
                              <p className="text-[10px] text-slate-400 font-mono">Room: {lesson.room}</p>
                            )}
                          </div>

                          {/* Quick Actions Hover */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => togglePublishStatus(lesson)}
                              className="p-1 text-slate-500 hover:text-emerald-600 transition"
                              title={lesson.status === 'Published' ? 'Unpublish' : 'Publish'}
                            >
                              {lesson.status === 'Published' ? (
                                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingItem(lesson);
                                setValidationError(null);
                                setIsModalOpen(true);
                              }}
                              className="p-1 text-slate-500 hover:text-blue-600 transition"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setItemToDelete(lesson)}
                              className="p-1 text-slate-500 hover:text-red-600 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add / Edit Lesson Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-[#002147] p-5 text-white flex items-center justify-between border-b border-[#00152e]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {editingItem.id ? 'Edit Lesson Schedule' : 'Add New Lesson to Timetable'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block">Validation Conflict</span>
                    <span className="text-[11px] leading-relaxed">{validationError}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Class *</label>
                  <select
                    required
                    value={editingItem.classId || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, classId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.className} ({c.classLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Subject *</label>
                  <select
                    required
                    value={editingItem.subjectId || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, subjectId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.subjectId || s.id}>
                        {s.subjectName} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Teacher *</label>
                  <select
                    required
                    value={editingItem.teacherId || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, teacherId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.teacherId || t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Day *</label>
                  <select
                    required
                    value={editingItem.day || 'Monday'}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        day: e.target.value as any
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={editingItem.startTime || '08:00'}
                    onChange={(e) => setEditingItem({ ...editingItem, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={editingItem.endTime || '08:50'}
                    onChange={(e) => setEditingItem({ ...editingItem, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Room / Lab (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Science Lab 2"
                    value={editingItem.room || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status</label>
                  <select
                    value={editingItem.status || 'Draft'}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, status: e.target.value as 'Draft' | 'Published' })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#002147]"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-black uppercase tracking-wider shadow cursor-pointer transition"
                >
                  {editingItem.id ? 'Update Schedule' : 'Add to Timetable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Delete Lesson Entry</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove {itemToDelete.subjectName} ({itemToDelete.day} {itemToDelete.startTime} - {itemToDelete.endTime})?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Timetable Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-8 border border-slate-200 space-y-6 text-slate-900 my-8">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={schoolProfile.logoUrl}
                  alt={schoolProfile.schoolName}
                  className="w-12 h-12 rounded-xl object-cover border"
                />
                <div>
                  <h2 className="text-base font-black text-[#002147] uppercase">{schoolProfile.schoolName}</h2>
                  <p className="text-xs text-slate-500">{schoolProfile.address} • {schoolProfile.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-[#002147] text-[#D4AF37] text-xs font-black uppercase rounded-lg">
                  Official Timetable
                </span>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">{selectedTerm} ({selectedYear})</p>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-[#002147] uppercase">
                {viewMode === 'class'
                  ? `Class Schedule — ${activeClassObj?.className || 'Class'}`
                  : `Faculty Schedule — ${activeTeacherObj?.fullName || 'Teacher'}`}
              </h3>
              <p className="text-xs text-slate-500 font-medium">EDUkenZA Academic Management Platform</p>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#002147] text-white">
                    <th className="p-2 border border-slate-700 font-black uppercase text-left w-24">Day</th>
                    <th className="p-2 border border-slate-700 font-black uppercase text-left">Lessons & Time Slots</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS_OF_WEEK.map((day) => {
                    const lessons = displayedTimetables
                      .filter((t) => t.day === day)
                      .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    return (
                      <tr key={day} className="border-b border-slate-200">
                        <td className="p-3 font-bold text-[#002147] bg-slate-50 border-r border-slate-200 align-top">
                          {day}
                        </td>
                        <td className="p-3 space-y-2">
                          {lessons.length === 0 ? (
                            <span className="text-slate-400 italic">No scheduled lessons</span>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {lessons.map((l) => (
                                <div key={l.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                                  <div className="text-[10px] font-bold text-blue-900">
                                    {l.startTime} - {l.endTime}
                                  </div>
                                  <div className="font-extrabold text-slate-900">{l.subjectName}</div>
                                  <div className="text-[10px] text-slate-600">
                                    {viewMode === 'class' ? l.teacherName : l.className}
                                    {l.room ? ` (${l.room})` : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t text-xs">
              <span className="text-slate-400 italic">Generated on {new Date().toLocaleDateString()}</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-[#002147] text-white font-black uppercase tracking-wider hover:bg-[#003366] cursor-pointer shadow flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-[#D4AF37]" />
                  <span>Print / Download PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
