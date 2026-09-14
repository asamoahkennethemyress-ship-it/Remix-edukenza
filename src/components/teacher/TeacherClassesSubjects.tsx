import React, { useState } from 'react';
import { 
  BookOpen, 
  Users, 
  Award, 
  Search, 
  ChevronRight, 
  User, 
  GraduationCap, 
  CheckCircle2, 
  Calendar,
  Layers
} from 'lucide-react';

export interface TeacherClassesSubjectsProps {
  assignedClasses: any[];
  assignedSubjects: any[];
  students: any[];
}

export const TeacherClassesSubjects: React.FC<TeacherClassesSubjectsProps> = ({
  assignedClasses,
  assignedSubjects,
  students
}) => {
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects'>('classes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<any | null>(null);

  // Filter classes
  const filteredClasses = assignedClasses.filter(c => {
    const className = c.name || c.className || c;
    return className.toString().toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Filter subjects
  const filteredSubjects = assignedSubjects.filter(s => {
    const subjectName = s.name || s.subjectName || s;
    return subjectName.toString().toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Assigned Classes & Subjects</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            View student rosters and curriculum details for your assigned classes and subjects.
          </p>
        </div>

        {/* TAB TOGGLE */}
        <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-700">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'classes' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>My Classes ({assignedClasses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'subjects' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>My Subjects ({assignedSubjects.length})</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'classes' ? "Search assigned classes..." : "Search assigned subjects..."}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
          />
        </div>
      </div>

      {/* 1. MY CLASSES TAB */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          {filteredClasses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-sm">No Assigned Classes Found</p>
              <p className="text-xs text-slate-400">Classes are assigned to you by the School Administrator.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls, idx) => {
                const className = cls.name || cls.className || cls;
                // Count students belonging to this class
                const classStudents = students.filter(s => 
                  s.className === className || s.classId === cls.id || s.gradeLevel === className
                );

                return (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#002147] border border-blue-200 text-[10px] font-black uppercase">
                          Assigned Class
                        </span>
                        <h3 className="text-lg font-black text-[#002147] mt-1">{className}</h3>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-[#002147] text-white flex items-center justify-center font-bold text-xs">
                        {classStudents.length}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 border-t border-b border-slate-100 py-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">Enrolled Students:</span>
                        <span className="font-bold text-[#002147]">{classStudents.length} Students</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">Class Teacher:</span>
                        <span className="font-bold text-emerald-700">Assigned</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedClassForRoster(cls)}
                      className="w-full py-2 bg-slate-100 hover:bg-[#002147] hover:text-white text-[#002147] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View Class Roster</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. MY SUBJECTS TAB */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {filteredSubjects.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
              <Award className="w-12 h-12 mx-auto text-slate-300" />
              <p className="font-bold text-sm">No Assigned Subjects Found</p>
              <p className="text-xs text-slate-400">Subjects are assigned by the School Administrator.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((sbj, idx) => {
                const subjectName = sbj.name || sbj.subjectName || sbj;
                const code = sbj.code || `SUBJ-${idx + 1}`;

                return (
                  <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black uppercase">
                          {code}
                        </span>
                        <h3 className="text-lg font-black text-[#002147] mt-1">{subjectName}</h3>
                      </div>
                      <Award className="w-8 h-8 text-[#D4AF37]" />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-700">
                      <p className="font-bold text-[#002147]">Curriculum Overview:</p>
                      <p className="text-[11px] text-slate-500">
                        {sbj.description || 'Full curriculum syllabus assigned for the academic term.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CLASS ROSTER MODAL */}
      {selectedClassForRoster && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                  Class Roster: {selectedClassForRoster.name || selectedClassForRoster.className || selectedClassForRoster}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClassForRoster(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {students.filter(s => 
                s.className === (selectedClassForRoster.name || selectedClassForRoster.className || selectedClassForRoster) ||
                s.classId === selectedClassForRoster.id
              ).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No enrolled students recorded for this class yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[#002147] font-bold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Student ID</th>
                      <th className="p-3">Gender</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.filter(s => 
                      s.className === (selectedClassForRoster.name || selectedClassForRoster.className || selectedClassForRoster) ||
                      s.classId === selectedClassForRoster.id
                    ).map((st, i) => (
                      <tr key={st.id || i} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                        <td className="p-3 font-bold text-[#002147]">{st.name || st.fullName}</td>
                        <td className="p-3 font-mono text-slate-600">{st.studentId || st.id || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{st.gender || 'Unspecified'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedClassForRoster(null)}
                className="px-5 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl cursor-pointer"
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
