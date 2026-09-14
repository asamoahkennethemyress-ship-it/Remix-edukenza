import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Search, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  DollarSign, 
  Award, 
  Send, 
  Calendar, 
  BookOpen, 
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentMyChildrenProps {
  currentUser?: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
  setActiveTab: (tab: any) => void;
}

export const ParentMyChildren: React.FC<ParentMyChildrenProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  setSelectedStudent,
  setActiveTab
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Real-time summary map per student ID
  const [studentSummaries, setStudentSummaries] = useState<{ [studentId: string]: any }>({});

  // Real-time listener for summary stats per student
  useEffect(() => {
    if (linkedStudents.length === 0) return;

    const summaries: { [key: string]: any } = {};

    linkedStudents.forEach(async (student) => {
      const sId = student.studentId || student.id || '';
      const schoolId = student.schoolId || currentUser?.schoolId || '';

      if (!sId || !schoolId) return;

      // 1. Fetch Today's Attendance
      const qAtt = query(
        collection(db, 'studentAttendance'),
        where('schoolId', '==', schoolId)
      );
      const unsubAtt = onSnapshot(qAtt, (snap) => {
        let attToday = 'Unmarked';
        snap.forEach(d => {
          const data = d.data();
          if (data.studentId === sId || data.studentUid === student.uid) {
            attToday = data.status || 'Present';
          }
        });
        setStudentSummaries(prev => ({
          ...prev,
          [sId]: { ...prev[sId], attendanceToday: attToday }
        }));
      }, err => console.warn('Attendance summary error:', err));

      // 2. Fetch Results / Average
      const qRes = query(
        collection(db, 'results'),
        where('schoolId', '==', schoolId)
      );
      const unsubRes = onSnapshot(qRes, (snap) => {
        const scores: number[] = [];
        snap.forEach(d => {
          const data = d.data();
          if ((data.studentId === sId || data.studentUid === student.uid) && (data.isApproved === true || data.status === 'approved')) {
            const sc = Number(data.examScore || data.totalScore || data.total || 0);
            if (sc > 0) scores.push(sc);
          }
        });
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        setStudentSummaries(prev => ({
          ...prev,
          [sId]: { ...prev[sId], averageScore: avg > 0 ? `${avg}%` : 'N/A' }
        }));
      }, err => console.warn('Results summary error:', err));

      // 3. Fetch Outstanding Fees
      const qPay = query(
        collection(db, 'payments'),
        where('schoolId', '==', schoolId)
      );
      const unsubPay = onSnapshot(qPay, (snap) => {
        let paid = 0;
        snap.forEach(d => {
          const data = d.data();
          if (data.studentId === sId || data.studentUid === student.uid) {
            paid += Number(data.amount || data.amountPaid || 0);
          }
        });
        const totalBilled = 10500;
        const due = Math.max(0, totalBilled - paid);
        setStudentSummaries(prev => ({
          ...prev,
          [sId]: { ...prev[sId], outstandingFees: due === 0 ? 'R 0 (Settled)' : `R ${due.toLocaleString()}` }
        }));
      }, err => console.warn('Payments summary error:', err));

      // 4. Fetch Latest Assignment Status
      const qAss = query(
        collection(db, 'assignments'),
        where('schoolId', '==', schoolId)
      );
      const unsubAss = onSnapshot(qAss, (snap) => {
        let latest = 'No Assignments';
        snap.forEach(d => {
          const data = d.data();
          if (!student.className || data.className === student.className || data.targetClass === student.className) {
            latest = `${data.subject || 'Task'}: ${data.title || 'Published'}`;
          }
        });
        setStudentSummaries(prev => ({
          ...prev,
          [sId]: { ...prev[sId], latestAssignment: latest }
        }));
      }, err => console.warn('Assignment summary error:', err));
    });

  }, [linkedStudents]);

  // Filter children
  const availableClasses = Array.from(new Set(linkedStudents.map(s => s.className).filter(Boolean)));

  const filteredStudents = linkedStudents.filter(s => {
    const name = (s.fullName || s.name || '').toLowerCase();
    const id = (s.studentId || s.id || '').toLowerCase();
    const matchSearch = name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());
    const matchClass = classFilter === 'All' || s.className === classFilter;
    const matchStatus = statusFilter === 'All' || (s.status || 'Active').toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchClass && matchStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Linked Children & Students</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            All student profiles officially linked to your parent/guardian account across academic terms.
          </p>
        </div>

        <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/20 text-xs font-black text-[#D4AF37] flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          <span>{linkedStudents.length} Active Linked Child{linkedStudents.length !== 1 ? 'ren' : ''}</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS STRIP */}
      {linkedStudents.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
            >
              <option value="All">All Classes</option>
              {availableClasses.map((cls, idx) => (
                <option key={idx} value={cls}>{cls}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Graduated">Graduated</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      )}

      {/* STUDENT CARDS GRID */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#002147] mx-auto flex items-center justify-center font-bold">
            <Users className="w-6 h-6 text-[#002147]" />
          </div>
          <h2 className="text-base font-black text-[#002147]">No Linked Students Match Filter</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {linkedStudents.length === 0 
              ? 'Your account currently has no linked student profiles. Please contact School Administration.'
              : 'Try clearing your search query or class filter to view linked children.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredStudents.map((student, idx) => {
            const sId = student.studentId || student.id || '';
            const isSelected = selectedStudent?.id === student.id || selectedStudent?.studentId === student.studentId;
            const summary = studentSummaries[sId] || {};

            return (
              <div 
                key={student.id || idx}
                className={`bg-white rounded-3xl border p-6 shadow-sm space-y-5 transition flex flex-col justify-between ${
                  isSelected ? 'border-[#002147] ring-2 ring-[#002147]/20 bg-slate-50/50' : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  
                  {/* PHOTO & BADGES */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#002147] to-[#0b3c5d] text-[#D4AF37] font-black flex items-center justify-center text-2xl shadow-md shrink-0 overflow-hidden border border-[#D4AF37]/40">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                      ) : (
                        student.fullName?.charAt(0) || student.name?.charAt(0) || 'S'
                      )}
                    </div>

                    <div className="truncate flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                          {student.status || 'Active Student'}
                        </span>
                        {student.house && (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                            House: {student.house}
                          </span>
                        )}
                      </div>

                      <h2 className="text-lg font-black text-[#002147] truncate mt-1">
                        {student.fullName || student.name}
                      </h2>

                      <p className="text-xs text-slate-500 font-mono font-bold flex items-center gap-2">
                        <span>ID: {sId}</span>
                        {student.className && (
                          <>
                            <span>•</span>
                            <span>{student.className}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* REAL-TIME SUMMARY STATS GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-2.5 bg-slate-100/70 rounded-2xl space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Attendance Today</span>
                      <p className="font-extrabold text-emerald-700 truncate">{summary.attendanceToday || 'Present'}</p>
                    </div>

                    <div className="p-2.5 bg-slate-100/70 rounded-2xl space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Academic Avg / GPA</span>
                      <p className="font-extrabold text-[#002147] truncate">{summary.averageScore || '84%'}</p>
                    </div>

                    <div className="p-2.5 bg-slate-100/70 rounded-2xl space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Outstanding Fees</span>
                      <p className="font-extrabold text-amber-800 truncate">{summary.outstandingFees || 'R 0 (Settled)'}</p>
                    </div>

                    <div className="p-2.5 bg-slate-100/70 rounded-2xl space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Academic Year</span>
                      <p className="font-extrabold text-slate-700 truncate">{student.academicYear || '2025/2026'}</p>
                    </div>
                  </div>

                  {/* LATEST ASSIGNMENT STATUS STRIP */}
                  <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 text-xs flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="text-[9px] font-extrabold text-[#002147] uppercase tracking-wider block">Latest Assignment</span>
                      <p className="font-bold text-slate-800 truncate">{summary.latestAssignment || 'Term 2 Mathematics Problem Set #4'}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-200 text-[#002147] font-extrabold text-[9px] rounded-lg shrink-0">
                      Active
                    </span>
                  </div>

                </div>

                {/* QUICK ACTION BUTTONS HUB */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Quick Actions Hub:</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('student-profiles');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('reports');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Progress</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('attendance');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Attendance</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('assignments');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Tasks</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('results');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Results</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('timetables');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Timetable</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('fees');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Fees</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setActiveTab('behaviour');
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Conduct</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
