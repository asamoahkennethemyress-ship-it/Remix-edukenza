import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Search, 
  Award, 
  User, 
  CheckCircle2, 
  BarChart2, 
  Printer, 
  Download,
  Users,
  RefreshCw
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherStudentPerformanceProps {
  assignedClasses: any[];
  assignedSubjects: any[];
  students: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TeacherStudentPerformance: React.FC<TeacherStudentPerformanceProps> = ({
  assignedClasses,
  assignedSubjects,
  students,
  showToast
}) => {
  const [selectedClass, setSelectedClass] = useState<string>(
    assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || 'All'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Real metrics calculated from Firestore
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { total: number; present: number }>>({});
  const [scoresMap, setScoresMap] = useState<Record<string, { count: number; totalScore: number }>>({});

  const fetchRealPerformanceData = async () => {
    if (students.length === 0) return;
    setLoading(true);
    try {
      const firstSchoolId = students[0]?.schoolId;
      if (!firstSchoolId) {
        setLoading(false);
        return;
      }

      // 1. Fetch Student Attendance
      const attQ = query(
        collection(db, 'studentAttendance'),
        where('schoolId', '==', firstSchoolId)
      );
      const attSnap = await getDocs(attQ);
      const attData: Record<string, { total: number; present: number }> = {};
      attSnap.forEach(d => {
        const data = d.data();
        const sId = data.studentId;
        if (sId) {
          if (!attData[sId]) attData[sId] = { total: 0, present: 0 };
          attData[sId].total += 1;
          if (data.status === 'present' || data.status === 'Present' || data.status === 'late' || data.status === 'Late') {
            attData[sId].present += 1;
          }
        }
      });
      setAttendanceMap(attData);

      // 2. Fetch Subject Results
      const resQ = query(
        collection(db, 'subjectResults'),
        where('schoolId', '==', firstSchoolId)
      );
      const resSnap = await getDocs(resQ);
      const scData: Record<string, { count: number; totalScore: number }> = {};
      resSnap.forEach(d => {
        const data = d.data();
        if (Array.isArray(data.scores)) {
          data.scores.forEach((s: any) => {
            if (s.studentId) {
              if (!scData[s.studentId]) scData[s.studentId] = { count: 0, totalScore: 0 };
              scData[s.studentId].count += 1;
              scData[s.studentId].totalScore += Number(s.totalScore) || 0;
            }
          });
        }
      });
      setScoresMap(scData);
    } catch (err) {
      console.error("Error fetching performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealPerformanceData();
  }, [students]);

  // Class students
  const filteredStudents = students.filter(s => {
    const matchClass = selectedClass === 'All' || s.className === selectedClass || s.gradeLevel === selectedClass;
    const matchSearch = (s.name || s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchClass && matchSearch;
  });

  // Calculate overall class summary stats
  let sumAvgScore = 0;
  let studentsWithScoresCount = 0;
  let sumAttRate = 0;
  let studentsWithAttCount = 0;
  let distinctionCount = 0;

  filteredStudents.forEach(st => {
    const sId = st.id || st.studentId;
    const scRec = scoresMap[sId];
    if (scRec && scRec.count > 0) {
      const avg = scRec.totalScore / scRec.count;
      sumAvgScore += avg;
      studentsWithScoresCount++;
      if (avg >= 75) distinctionCount++;
    }
    const attRec = attendanceMap[sId];
    if (attRec && attRec.total > 0) {
      const rate = (attRec.present / attRec.total) * 100;
      sumAttRate += rate;
      studentsWithAttCount++;
    }
  });

  const overallClassAvgScore = studentsWithScoresCount > 0 ? (sumAvgScore / studentsWithScoresCount).toFixed(1) : 'N/A';
  const overallClassAttRate = studentsWithAttCount > 0 ? (sumAttRate / studentsWithAttCount).toFixed(1) + '%' : 'N/A';
  const overallDistinctionRate = filteredStudents.length > 0 ? ((distinctionCount / filteredStudents.length) * 100).toFixed(1) + '%' : '0%';

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Academic Performance & Progress</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Track student GPA averages, attendance records, grade trends, and print progress summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRealPerformanceData}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Print Class Report</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>

        <div className="w-full md:w-auto">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
          >
            <option value="All">All Assigned Classes</option>
            {assignedClasses.map((c, i) => (
              <option key={i} value={c.name || c.className || c}>
                Class: {c.name || c.className || c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Tracked Students</span>
          <p className="text-2xl font-black text-[#002147]">{filteredStudents.length}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">Class Average Score</span>
          <p className="text-2xl font-black text-emerald-700">{overallClassAvgScore}{overallClassAvgScore !== 'N/A' ? '%' : ''}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">Avg Attendance Rate</span>
          <p className="text-2xl font-black text-blue-700">{overallClassAttRate}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase">Top Distinction Pass Rate</span>
          <p className="text-2xl font-black text-amber-600">{overallDistinctionRate}</p>
        </div>
      </div>

      {/* STUDENT PERFORMANCE TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#002147] mb-2" />
            <p className="text-xs">Calculating performance data...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No student records found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[#002147] font-black border-b border-slate-200">
                <tr>
                  <th className="p-4">#</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Academic Score Avg</th>
                  <th className="p-4">Attendance Rate</th>
                  <th className="p-4">Overall Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, i) => {
                  const sId = st.id || st.studentId;
                  const scRec = scoresMap[sId];
                  const attRec = attendanceMap[sId];

                  const avgScore = (scRec && scRec.count > 0) ? (scRec.totalScore / scRec.count) : null;
                  const attRate = (attRec && attRec.total > 0) ? Math.round((attRec.present / attRec.total) * 100) : null;

                  return (
                    <tr key={st.id || i} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-slate-400">{i + 1}</td>
                      <td className="p-4 font-bold text-[#002147]">
                        {st.name || st.fullName}
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {st.studentId || st.id || 'N/A'}
                      </td>
                      <td className="p-4 font-medium text-slate-600">
                        {st.className || selectedClass}
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-700">
                        {avgScore !== null ? `${avgScore.toFixed(1)}%` : 'No Scores Yet'}
                      </td>
                      <td className="p-4 font-mono font-bold text-blue-700">
                        {attRate !== null ? `${attRate}%` : 'No Records'}
                      </td>
                      <td className="p-4 font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] ${
                          avgScore === null ? 'bg-slate-100 text-slate-600' :
                          avgScore >= 75 ? 'bg-emerald-100 text-emerald-800' :
                          avgScore >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {avgScore === null ? 'Pending Evaluation' : avgScore >= 75 ? 'Distinction' : avgScore >= 50 ? 'Good Standing' : 'Needs Support'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

