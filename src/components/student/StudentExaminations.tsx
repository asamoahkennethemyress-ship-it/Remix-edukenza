import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Printer,
  BrainCircuit,
  BookOpen
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CbtMainDashboard } from '../cbt/CbtMainDashboard';

export interface StudentExaminationsProps {
  currentUser: any;
  studentRecord: any;
}

export const StudentExaminations: React.FC<StudentExaminationsProps> = ({
  currentUser,
  studentRecord
}) => {
  const [viewMode, setViewMode] = useState<'cbt' | 'timetable'>('cbt');
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const className = studentRecord?.className || currentUser?.className || '';

  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      if (!schoolId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'examinations'),
          where('schoolId', '==', schoolId)
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          if (data.className === className || data.targetClass === className || !data.className) {
            list.push({ id: d.id, ...data });
          }
        });
        setExams(list);
      } catch (err) {
        console.error("Error fetching examinations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [schoolId, className]);

  const examListToDisplay = exams;

  return (
    <div className="space-y-6">
      {/* Subtab Navigation */}
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
          Take Online CBT Exams
        </button>

        <button
          onClick={() => setViewMode('timetable')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            viewMode === 'timetable'
              ? 'bg-[#002147] text-[#D4AF37] shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Exam Hall Timetable
        </button>
      </div>

      {viewMode === 'cbt' ? (
        <CbtMainDashboard
          schoolId={schoolId}
          userRole="student"
          userId={currentUser?.uid || currentUser?.id || ''}
          userName={currentUser?.displayName || currentUser?.name || 'Student'}
          userClassName={className}
          showToast={(msg, type) => console.log(msg, type)}
        />
      ) : (
        <div className="space-y-6">
          {/* HEADER BANNER */}
          <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-8 h-8 text-[#D4AF37]" />
                <h1 className="text-2xl font-black tracking-tight">Examinations Portal</h1>
              </div>
              <p className="text-slate-300 text-xs mt-1">
                Exam schedules, official instructions, venue details, and assessment guidelines for <span className="font-bold text-white">{className}</span>
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" /> Print Timetable
            </button>
          </div>

      {/* EXAM INSTRUCTIONS CALLOUT */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl text-amber-900 space-y-2 text-xs">
        <h2 className="font-black text-[#002147] flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> Official Examination Rules
        </h2>
        <ul className="list-disc list-inside space-y-1 text-slate-700">
          <li>Arrive at the examination venue at least 30 minutes before commencement.</li>
          <li>Bring your Student Identification Card and required writing instruments.</li>
          <li>Mobile phones and unauthorized digital devices are strictly forbidden inside the exam hall.</li>
        </ul>
      </div>

      {/* EXAM TIMETABLE TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h2 className="text-base font-black text-[#002147]">Upcoming Assessment Timetable</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#002147] text-white uppercase text-[10px] font-black tracking-wider">
                <th className="p-3.5 rounded-l-xl">Subject</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Time</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5 rounded-r-xl">Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {examListToDisplay.length > 0 ? (
                examListToDisplay.map((ex, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-bold text-[#002147]">{ex.subject || ex.examName}</td>
                    <td className="p-3.5 font-mono text-slate-600">{ex.date || ex.examDate}</td>
                    <td className="p-3.5">{ex.time || '09:00 AM'}</td>
                    <td className="p-3.5 font-mono">{ex.duration || '2 Hours'}</td>
                    <td className="p-3.5 font-bold text-slate-800">{ex.venue || 'Main Hall'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                    No scheduled examinations found for your class. Timetables will appear here once published by school administration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}
</div>
  );
};
