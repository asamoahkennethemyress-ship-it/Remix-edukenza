import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Search, 
  Users, 
  Award, 
  CheckCircle2, 
  BarChart2, 
  Layers,
  RefreshCw 
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherReportsViewProps {
  assignedClasses: any[];
  assignedSubjects: any[];
  students: any[];
  schoolName: string;
  teacherName: string;
}

export const TeacherReportsView: React.FC<TeacherReportsViewProps> = ({
  assignedClasses,
  assignedSubjects,
  students,
  schoolName,
  teacherName
}) => {
  const [selectedReportType, setSelectedReportType] = useState<'class-performance' | 'attendance-summary' | 'subject-analysis'>('class-performance');
  const [selectedClass, setSelectedClass] = useState<string>(
    assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || 'All'
  );
  const [loading, setLoading] = useState(false);

  // Real data maps
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { total: number; present: number }>>({});
  const [scoresMap, setScoresMap] = useState<Record<string, { count: number; totalScore: number; grade?: string }>>({});

  const fetchReportData = async () => {
    if (students.length === 0) return;
    setLoading(true);
    try {
      const schoolId = students[0]?.schoolId;
      if (!schoolId) {
        setLoading(false);
        return;
      }

      // Fetch Attendance
      const attQ = query(collection(db, 'studentAttendance'), where('schoolId', '==', schoolId));
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

      // Fetch Subject Results
      const resQ = query(collection(db, 'subjectResults'), where('schoolId', '==', schoolId));
      const resSnap = await getDocs(resQ);
      const scData: Record<string, { count: number; totalScore: number; grade?: string }> = {};
      resSnap.forEach(d => {
        const data = d.data();
        if (Array.isArray(data.scores)) {
          data.scores.forEach((s: any) => {
            if (s.studentId) {
              if (!scData[s.studentId]) scData[s.studentId] = { count: 0, totalScore: 0, grade: s.grade };
              scData[s.studentId].count += 1;
              scData[s.studentId].totalScore += Number(s.totalScore) || 0;
              if (s.grade) scData[s.studentId].grade = s.grade;
            }
          });
        }
      });
      setScoresMap(scData);
    } catch (err) {
      console.error("Error fetching report metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [students]);

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // CSV Export
  const handleExportCSV = () => {
    const classStudents = students.filter(s => 
      selectedClass === 'All' || s.className === selectedClass || s.gradeLevel === selectedClass
    );

    const headers = ['#', 'Student Name', 'Student ID', 'Class', 'Overall Score Avg', 'Attendance Rate'];
    const rows = classStudents.map((st, i) => {
      const sId = st.id || st.studentId;
      const scRec = scoresMap[sId];
      const attRec = attendanceMap[sId];

      const avgScoreStr = scRec && scRec.count > 0 ? `${(scRec.totalScore / scRec.count).toFixed(1)}%` : 'N/A';
      const attRateStr = attRec && attRec.total > 0 ? `${Math.round((attRec.present / attRec.total) * 100)}%` : 'N/A';

      return [
        i + 1,
        st.name || st.fullName,
        st.studentId || st.id || 'N/A',
        st.className || selectedClass,
        avgScoreStr,
        attRateStr
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${teacherName.replace(/\s+/g, '_')}_Academic_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => selectedClass === 'All' || s.className === selectedClass || s.gradeLevel === selectedClass);

  return (
    <div className="space-y-6 print:p-0 print:bg-white">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Class Academic Reports & Export</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Generate and export class performance reports, subject analysis sheets, and attendance summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportData}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition border border-white/20 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D4AF37]" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* PRINT PAPER HEADER */}
      <div className="hidden print:block text-center space-y-1 mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-xl font-bold text-[#002147]">{schoolName}</h1>
        <h2 className="text-sm font-semibold">Class Academic Performance Summary - Educator: {teacherName}</h2>
        <p className="text-xs text-slate-500">Date Generated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center print:hidden">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedReportType('class-performance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedReportType === 'class-performance' ? 'bg-[#002147] text-white' : 'text-slate-600'
            }`}
          >
            Class Performance
          </button>
          <button
            onClick={() => setSelectedReportType('attendance-summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedReportType === 'attendance-summary' ? 'bg-[#002147] text-white' : 'text-slate-600'
            }`}
          >
            Attendance Summary
          </button>
          <button
            onClick={() => setSelectedReportType('subject-analysis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              selectedReportType === 'subject-analysis' ? 'bg-[#002147] text-white' : 'text-slate-600'
            }`}
          >
            Subject Analysis
          </button>
        </div>

        <div>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
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

      {/* REPORT CONTENT DISPLAY */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-[#002147]">
              {selectedReportType === 'class-performance' ? 'Class Performance Report' :
               selectedReportType === 'attendance-summary' ? 'Attendance Summary Report' :
               'Subject Syllabus & Score Analysis'}
            </h3>
            <p className="text-xs text-slate-500">Target Class: {selectedClass}</p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            Verified Record
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#002147] mb-2" />
              <p className="text-xs">Loading report data...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No students found for class {selectedClass}.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[#002147] font-black border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Student ID</th>
                  <th className="p-3">Assigned Class</th>
                  <th className="p-3">Performance Grade</th>
                  <th className="p-3">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, i) => {
                  const sId = st.id || st.studentId;
                  const scRec = scoresMap[sId];
                  const attRec = attendanceMap[sId];

                  const avgScore = scRec && scRec.count > 0 ? (scRec.totalScore / scRec.count) : null;
                  const gradeStr = scRec?.grade || (avgScore !== null ? (avgScore >= 80 ? 'A (Distinction)' : avgScore >= 70 ? 'B (Merit)' : avgScore >= 60 ? 'C (Credit)' : avgScore >= 50 ? 'D (Pass)' : 'F (Fail)') : 'Pending Evaluation');
                  const attRateStr = attRec && attRec.total > 0 ? `${Math.round((attRec.present / attRec.total) * 100)}%` : 'No Records';

                  return (
                    <tr key={st.id || i} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="p-3 font-bold text-[#002147]">{st.name || st.fullName}</td>
                      <td className="p-3 font-mono text-slate-500">{st.studentId || st.id || 'N/A'}</td>
                      <td className="p-3 font-medium text-slate-600">{st.className || selectedClass}</td>
                      <td className="p-3 font-bold text-emerald-700">{gradeStr}</td>
                      <td className="p-3 font-mono text-blue-700 font-bold">{attRateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

