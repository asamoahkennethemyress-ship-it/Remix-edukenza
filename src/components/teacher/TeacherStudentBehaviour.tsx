import React, { useState, useEffect } from 'react';
import { 
  Award, 
  AlertTriangle, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  User, 
  Trash2, 
  X, 
  RefreshCw 
} from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherStudentBehaviourProps {
  schoolId: string;
  assignedClasses: any[];
  students: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface BehaviourDoc {
  id?: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  className: string;
  date: string;
  category: 'Positive Achievement' | 'Disciplinary Warning' | 'Merit Award' | 'Class Incident';
  title: string;
  description: string;
  actionTaken?: string;
  createdAt?: any;
}

export const TeacherStudentBehaviour: React.FC<TeacherStudentBehaviourProps> = ({
  schoolId,
  assignedClasses,
  students,
  currentUser,
  showToast
}) => {
  const [records, setRecords] = useState<BehaviourDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<{
    studentId: string;
    studentName: string;
    className: string;
    category: 'Positive Achievement' | 'Disciplinary Warning' | 'Merit Award' | 'Class Incident';
    title: string;
    description: string;
    actionTaken: string;
    date: string;
  }>({
    studentId: '',
    studentName: '',
    className: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
    category: 'Positive Achievement',
    title: '',
    description: '',
    actionTaken: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filter students by selected class in modal
  const modalClassStudents = students.filter(s => 
    s.className === form.className || s.classId === form.className || s.gradeLevel === form.className
  );

  // Fetch records
  const fetchRecords = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'studentBehaviour'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const list: BehaviourDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as BehaviourDoc));
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setRecords(list);
    } catch (err) {
      console.error("Error fetching behaviour logs:", err);
      showToast("Failed to load behaviour logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [schoolId]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.title || !form.description) {
      showToast("Please select a student and fill in required details", "error");
      return;
    }

    setSaving(true);
    try {
      const selectedStudent = students.find(s => (s.id || s.studentId) === form.studentId);
      const studentName = selectedStudent?.name || selectedStudent?.fullName || form.studentName || 'Student';

      const payload: BehaviourDoc = {
        schoolId,
        teacherId: currentUser?.uid || '',
        teacherName: currentUser?.fullName || currentUser?.name || 'Teacher',
        studentId: form.studentId,
        studentName,
        className: form.className,
        date: form.date,
        category: form.category,
        title: form.title,
        description: form.description,
        actionTaken: form.actionTaken,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'studentBehaviour'), payload);
      showToast("Behaviour record logged successfully!", "success");

      setIsModalOpen(false);
      setForm({
        studentId: '',
        studentName: '',
        className: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
        category: 'Positive Achievement',
        title: '',
        description: '',
        actionTaken: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchRecords();
    } catch (err) {
      console.error("Save behaviour error:", err);
      showToast("Failed to log record", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this log?")) return;
    try {
      await deleteDoc(doc(db, 'studentBehaviour', id));
      showToast("Log deleted", "info");
      fetchRecords();
    } catch (err) {
      showToast("Failed to delete log", "error");
    }
  };

  // Filtered
  const filteredRecords = records.filter(r => {
    const matchSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'All' || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Conduct & Behaviour Logs</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Log positive student achievements, academic merit awards, or classroom disciplinary warnings.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Student Conduct</span>
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or title..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Positive Achievement">Positive Achievement</option>
            <option value="Merit Award">Merit Award</option>
            <option value="Disciplinary Warning">Disciplinary Warning</option>
            <option value="Class Incident">Class Incident</option>
          </select>

          <button
            onClick={fetchRecords}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* RECORDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading conduct logs...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            No conduct records logged yet. Click "Log Student Conduct" to record an entry.
          </div>
        ) : (
          filteredRecords.map(r => (
            <div key={r.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    r.category.includes('Positive') || r.category.includes('Merit')
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    {r.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {r.date}
                  </span>
                </div>

                <h3 className="text-base font-black text-[#002147]">{r.studentName}</h3>
                <p className="text-xs font-bold text-slate-500">Class: {r.className}</p>

                <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                  <p className="font-bold text-[#002147]">{r.title}</p>
                  <p className="text-slate-600">{r.description}</p>
                  {r.actionTaken && (
                    <p className="text-emerald-700 font-semibold pt-1">
                      Action Taken: {r.actionTaken}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => r.id && handleDelete(r.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition"
                  title="Delete Log"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* LOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#D4AF37]" />
                Log Student Conduct / Achievement
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Class *</label>
                  <select
                    required
                    value={form.className}
                    onChange={e => setForm({ ...form, className: e.target.value, studentId: '' })}
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
                  <label className="block font-bold text-slate-700 mb-1">Select Student *</label>
                  <select
                    required
                    value={form.studentId}
                    onChange={e => setForm({ ...form, studentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="">Select Student...</option>
                    {modalClassStudents.map((st, i) => (
                      <option key={st.id || i} value={st.id || st.studentId}>
                        {st.name || st.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Positive Achievement">Positive Achievement</option>
                    <option value="Merit Award">Merit Award</option>
                    <option value="Disciplinary Warning">Disciplinary Warning</option>
                    <option value="Class Incident">Class Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Incident / Award Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Title / Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outstanding Mathematics Science Fair Project"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Detailed Description *</label>
                  <VoiceDictationButton
                    size="sm"
                    variant="ghost"
                    buttonText="Dictate"
                    onTranscript={(text, isFinal) => {
                      if (isFinal) {
                        setForm(prev => ({
                          ...prev,
                          description: prev.description ? `${prev.description} ${text}` : text
                        }));
                      }
                    }}
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe the achievement or incident in detail (or click Dictate)..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Taken / Reward</label>
                <input
                  type="text"
                  placeholder="e.g. Awarded Certificate of Merit / Parent Notified"
                  value={form.actionTaken}
                  onChange={e => setForm({ ...form, actionTaken: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#002147] text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {saving ? 'Saving...' : 'Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
