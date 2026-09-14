import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Search, 
  Calendar, 
  Clock, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  MapPin, 
  RefreshCw,
  BrainCircuit,
  BookOpen
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CbtMainDashboard } from '../cbt/CbtMainDashboard';

export interface TeacherExaminationsProps {
  schoolId: string;
  assignedClasses: any[];
  assignedSubjects: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  setActiveTab?: (tab: string) => void;
  userId?: string;
  userName?: string;
}

export interface ExaminationDoc {
  id?: string;
  schoolId: string;
  title: string;
  term: string;
  academicYear: string;
  className: string;
  subjectName: string;
  examDate: string;
  startTime: string;
  duration: string;
  totalMarks: number;
  roomVenue?: string;
  instructions?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
}

export const TeacherExaminations: React.FC<TeacherExaminationsProps> = ({
  schoolId,
  assignedClasses,
  assignedSubjects,
  showToast,
  setActiveTab,
  userId = 'teacher_default',
  userName = 'Teacher'
}) => {
  const [viewMode, setViewMode] = useState<'cbt' | 'schedules'>('cbt');
  const [exams, setExams] = useState<ExaminationDoc[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Fetch Examinations
  const fetchExaminations = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'examinations'),
        where('schoolId', '==', schoolId)
      );
      const snap = await getDocs(q);
      const list: ExaminationDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ExaminationDoc));
      setExams(list);
    } catch (err) {
      console.warn("Notice fetching exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExaminations();
  }, [schoolId]);

  // Filtered List for teacher's assigned classes/subjects
  const filteredExams = exams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === 'All' || e.className === selectedClass;
    const matchSubject = selectedSubject === 'All' || e.subjectName === selectedSubject;
    return matchSearch && matchClass && matchSubject;
  });

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setViewMode('cbt')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            viewMode === 'cbt'
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BrainCircuit className="w-4 h-4 text-[#D4AF37]" />
          Enterprise CBT Engine & Question Bank
        </button>

        <button
          onClick={() => setViewMode('schedules')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            viewMode === 'schedules'
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Traditional Exam Timetables
        </button>
      </div>

      {viewMode === 'cbt' ? (
        <CbtMainDashboard
          schoolId={schoolId}
          userRole="teacher"
          userId={userId}
          userName={userName}
          subjects={assignedSubjects}
          classes={assignedClasses}
          showToast={showToast}
        />
      ) : (
        <div className="space-y-6">
          {/* HEADER BANNER */}
          <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-8 h-8 text-[#D4AF37]" />
                <h1 className="text-2xl font-black tracking-tight">Examinations & Schedules</h1>
              </div>
              <p className="text-slate-300 text-xs mt-1">
                Official school examinations created and scheduled by the School Administration.
              </p>
            </div>
          </div>

      {/* SECURITY NOTICE BANNER */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Administrative Permission Policy:</p>
          <p className="text-slate-700">
            Teachers cannot create or modify official examination schedules. Examination timetables are managed centrally by the School Admin. You can enter scores for your assigned classes under the <strong className="text-[#002147]">Score Entry</strong> tab.
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search exam title..."
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
            onClick={fetchExaminations}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* EXAMINATIONS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Loading examinations...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
            No examinations scheduled for your assigned classes/subjects yet.
          </div>
        ) : (
          filteredExams.map(ex => (
            <div key={ex.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#002147] text-white text-[10px] font-black uppercase">
                    {ex.term || 'Term Exam'}
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    Max: {ex.totalMarks || 100} pts
                  </span>
                </div>

                <h3 className="text-sm font-black text-[#002147]">{ex.title}</h3>

                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <span>Class: {ex.className}</span>
                  <span>•</span>
                  <span>Subject: {ex.subjectName}</span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#002147]" />
                    <span>Date: {ex.examDate || 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Time: {ex.startTime || '09:00 AM'} ({ex.duration || '2 hours'})</span>
                  </div>
                  {ex.roomVenue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Venue: {ex.roomVenue}</span>
                    </div>
                  )}
                </div>

                {ex.instructions && (
                  <p className="text-[11px] text-slate-500 italic">
                    Note: {ex.instructions}
                  </p>
                )}
              </div>

              {setActiveTab && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab('score-entry')}
                    className="w-full py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Enter Exam Scores</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )}
</div>
  );
};
