import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Edit, 
  Trash2, 
  X, 
  Eye, 
  Printer, 
  Download, 
  Save, 
  RefreshCw 
} from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherLessonPlansProps {
  schoolId: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface LessonPlanDoc {
  id?: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  className: string;
  subjectName: string;
  topic: string;
  planType: 'Weekly Lesson Plan' | 'Daily Lesson Note';
  startDate: string;
  endDate: string;
  objectives: string;
  activities: string;
  assessment: string;
  homework: string;
  status: 'Draft' | 'Submitted for Review' | 'Approved';
  createdAt?: any;
  updatedAt?: any;
}

export const TeacherLessonPlans: React.FC<TeacherLessonPlansProps> = ({
  schoolId,
  assignedClasses,
  assignedSubjects,
  currentUser,
  showToast
}) => {
  const [plans, setPlans] = useState<LessonPlanDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlanDoc | null>(null);
  const [viewingPlan, setViewingPlan] = useState<LessonPlanDoc | null>(null);

  // Form State
  const [form, setForm] = useState<Partial<LessonPlanDoc>>({
    className: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
    subjectName: assignedSubjects[0]?.name || assignedSubjects[0]?.subjectName || assignedSubjects[0] || '',
    topic: '',
    planType: 'Weekly Lesson Plan',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    objectives: '',
    activities: '',
    assessment: '',
    homework: '',
    status: 'Submitted for Review'
  });

  // Fetch Lesson Plans from Firestore
  const fetchLessonPlans = async () => {
    if (!schoolId || !currentUser?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'lessonPlans'),
        where('schoolId', '==', schoolId),
        where('teacherId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      const list: LessonPlanDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LessonPlanDoc));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setPlans(list);
    } catch (err) {
      console.error("Error fetching lesson plans:", err);
      showToast("Failed to load lesson plans", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessonPlans();
  }, [schoolId, currentUser]);

  // Submit / Save Lesson Plan
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic || !form.objectives || !form.className || !form.subjectName) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        schoolId,
        teacherId: currentUser.uid,
        teacherName: currentUser.fullName || currentUser.name || 'Teacher',
        className: form.className,
        subjectName: form.subjectName,
        topic: form.topic,
        planType: form.planType || 'Weekly Lesson Plan',
        startDate: form.startDate,
        endDate: form.endDate,
        objectives: form.objectives,
        activities: form.activities,
        assessment: form.assessment,
        homework: form.homework,
        status: form.status || 'Submitted for Review',
        updatedAt: serverTimestamp()
      };

      if (editingPlan?.id) {
        await updateDoc(doc(db, 'lessonPlans', editingPlan.id), payload);
        showToast("Lesson plan updated successfully!", "success");
      } else {
        await addDoc(collection(db, 'lessonPlans'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        showToast("New lesson plan saved!", "success");
      }

      setIsModalOpen(false);
      setEditingPlan(null);
      fetchLessonPlans();
    } catch (err) {
      console.error("Save plan error:", err);
      showToast("Failed to save lesson plan", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Lesson Plan
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this lesson plan?")) return;
    try {
      await deleteDoc(doc(db, 'lessonPlans', id));
      showToast("Lesson plan deleted", "info");
      fetchLessonPlans();
    } catch (err) {
      showToast("Failed to delete lesson plan", "error");
    }
  };

  // Filtered List
  const filteredPlans = plans.filter(p => {
    const matchSearch = p.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.objectives.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === 'All' || p.className === selectedClass;
    const matchSubject = selectedSubject === 'All' || p.subjectName === selectedSubject;
    return matchSearch && matchClass && matchSubject;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Lesson Plans & Daily Notes</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Create weekly lesson plans, daily lesson notes, objectives, teaching activities and homework assignments.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPlan(null);
            setForm({
              className: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
              subjectName: assignedSubjects[0]?.name || assignedSubjects[0]?.subjectName || assignedSubjects[0] || '',
              topic: '',
              planType: 'Weekly Lesson Plan',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date().toISOString().split('T')[0],
              objectives: '',
              activities: '',
              assessment: '',
              homework: '',
              status: 'Submitted for Review'
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Lesson Plan</span>
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search topic or objectives..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Classes</option>
            {assignedClasses.map((c, i) => (
              <option key={i} value={c.name || c.className || c}>
                {c.name || c.className || c}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Subjects</option>
            {assignedSubjects.map((s, i) => (
              <option key={i} value={s.name || s.subjectName || s}>
                {s.name || s.subjectName || s}
              </option>
            ))}
          </select>

          <button
            onClick={fetchLessonPlans}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* LESSON PLANS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading lesson plans...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            No lesson plans found. Click "Create Lesson Plan" to add one.
          </div>
        ) : (
          filteredPlans.map(plan => (
            <div key={plan.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#002147] border border-blue-200 text-[10px] font-black uppercase">
                    {plan.planType}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {plan.startDate} to {plan.endDate}
                  </span>
                </div>

                <h3 className="text-sm font-black text-[#002147] line-clamp-1">{plan.topic}</h3>
                
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <span>Class: {plan.className}</span>
                  <span>•</span>
                  <span>Subject: {plan.subjectName}</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 italic">
                  "{plan.objectives}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setViewingPlan(plan)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setForm(plan);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-[#002147] hover:bg-slate-100 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => plan.id && handleDelete(plan.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                {editingPlan ? 'Edit Lesson Plan' : 'Create Lesson Plan / Notes'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Class *</label>
                  <select
                    required
                    value={form.className}
                    onChange={e => setForm({ ...form, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {assignedClasses.map((c, i) => (
                      <option key={i} value={c.name || c.className || c}>
                        {c.name || c.className || c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                  <select
                    required
                    value={form.subjectName}
                    onChange={e => setForm({ ...form, subjectName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {assignedSubjects.map((s, i) => (
                      <option key={i} value={s.name || s.subjectName || s}>
                        {s.name || s.subjectName || s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Type</label>
                  <select
                    value={form.planType}
                    onChange={e => setForm({ ...form, planType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Weekly Lesson Plan">Weekly Lesson Plan</option>
                    <option value="Daily Lesson Note">Daily Lesson Note</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lesson Topic *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quadratic Equations & Graphs"
                    value={form.topic}
                    onChange={e => setForm({ ...form, topic: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Learning Objectives *</label>
                  <VoiceDictationButton
                    size="sm"
                    variant="ghost"
                    buttonText="Dictate Objectives"
                    onTranscript={(text, isFinal) => {
                      if (isFinal) {
                        setForm(prev => ({
                          ...prev,
                          objectives: prev.objectives ? `${prev.objectives} ${text}` : text
                        }));
                      }
                    }}
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Students will be able to solve quadratic equations using factoring..."
                  value={form.objectives}
                  onChange={e => setForm({ ...form, objectives: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Classroom Activities & Teaching Steps</label>
                  <VoiceDictationButton
                    size="sm"
                    variant="ghost"
                    buttonText="Dictate Activities"
                    onTranscript={(text, isFinal) => {
                      if (isFinal) {
                        setForm(prev => ({
                          ...prev,
                          activities: prev.activities ? `${prev.activities} ${text}` : text
                        }));
                      }
                    }}
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="1. Introduction (10 mins). 2. Worked Examples (20 mins)..."
                  value={form.activities}
                  onChange={e => setForm({ ...form, activities: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assessment Strategy</label>
                  <textarea
                    rows={2}
                    placeholder="In-class quiz & oral Q&A..."
                    value={form.assessment}
                    onChange={e => setForm({ ...form, assessment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Homework Assigned</label>
                  <textarea
                    rows={2}
                    placeholder="Exercise 4B Questions 1 - 10 on page 84..."
                    value={form.homework}
                    onChange={e => setForm({ ...form, homework: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#002147] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {saving ? 'Saving...' : 'Save Lesson Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingPlan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#D4AF37]">{viewingPlan.planType}</span>
                <h3 className="text-lg font-black text-[#002147]">{viewingPlan.topic}</h3>
              </div>
              <button
                onClick={() => setViewingPlan(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-slate-400 font-bold">Class:</span>
                  <p className="font-bold text-[#002147]">{viewingPlan.className}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Subject:</span>
                  <p className="font-bold text-[#002147]">{viewingPlan.subjectName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Duration:</span>
                  <p className="font-bold text-slate-700">{viewingPlan.startDate} to {viewingPlan.endDate}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold">Status:</span>
                  <p className="font-bold text-emerald-700">{viewingPlan.status}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#002147] mb-1">Learning Objectives</h4>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">{viewingPlan.objectives}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#002147] mb-1">Activities & Teaching Steps</h4>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">{viewingPlan.activities || 'N/A'}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#002147] mb-1">Assessment Strategy</h4>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">{viewingPlan.assessment || 'N/A'}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#002147] mb-1">Homework Assigned</h4>
                <p className="p-3 bg-amber-50/50 rounded-xl text-amber-900 leading-relaxed">{viewingPlan.homework || 'N/A'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setViewingPlan(null)}
                className="px-5 py-2 bg-[#002147] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
