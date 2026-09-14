import React from 'react';
import { 
  User, 
  GraduationCap, 
  Calendar, 
  Phone, 
  Mail, 
  ShieldCheck, 
  HeartHandshake 
} from 'lucide-react';

export interface ParentStudentProfilesProps {
  linkedStudents: any[];
  selectedStudent: any | null;
  setSelectedStudent: (student: any) => void;
}

export const ParentStudentProfiles: React.FC<ParentStudentProfilesProps> = ({
  linkedStudents = [],
  selectedStudent,
  setSelectedStudent
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;

  if (!activeStudent) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm space-y-3">
        <User className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-700">No Student Profile Linked</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          There are currently no student records linked to your parent account. Please contact school administration to link your children.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Official Profile</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Read-only verified student records maintained by School Administration.
          </p>
        </div>

        {/* CHILD SWITCHER IF MULTIPLE */}
        {linkedStudents.length > 1 && (
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20">
            <span className="text-[10px] font-bold uppercase text-amber-300 px-2">Select Child:</span>
            <select
              value={activeStudent?.id || activeStudent?.studentId || ''}
              onChange={(e) => {
                const found = linkedStudents.find(s => (s.id === e.target.value || s.studentId === e.target.value));
                if (found) setSelectedStudent(found);
              }}
              className="bg-[#002147] text-white font-bold text-xs p-2 rounded-xl outline-none cursor-pointer"
            >
              {linkedStudents.map(s => (
                <option key={s.id || s.studentId} value={s.id || s.studentId}>
                  {s.fullName || s.name} {s.className ? `(${s.className})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* STUDENT PROFILE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* TOP PROFILE BANNER */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 pb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#002147] to-[#0b3c5d] text-[#D4AF37] font-black flex items-center justify-center text-3xl shadow-lg border-2 border-[#D4AF37]/30 overflow-hidden shrink-0">
            {activeStudent?.photoUrl ? (
              <img src={activeStudent.photoUrl} alt={activeStudent?.fullName || 'Student'} className="w-full h-full object-cover" />
            ) : (
              activeStudent?.fullName?.charAt(0) || activeStudent?.name?.charAt(0) || 'S'
            )}
          </div>

          <div className="text-center sm:text-left space-y-1">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full uppercase tracking-wider">
              {activeStudent?.status || 'Active Enrolled Student'}
            </span>
            <h2 className="text-2xl font-black text-[#002147]">
              {activeStudent?.fullName || activeStudent?.name || 'Student Record'}
            </h2>
            <p className="text-xs text-slate-500 font-mono font-bold">
              Official Student ID: {activeStudent?.studentId || activeStudent?.id || 'N/A'}
            </p>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
              Academic Enrollment
            </h3>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-400">Class & Section:</span>
                <span className="font-black text-[#002147]">{activeStudent?.className || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-400">Academic Year:</span>
                <span className="font-mono font-bold">{activeStudent?.academicYear || 'Current Year'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-400">Class Educator:</span>
                <span className="font-bold text-[#002147]">{activeStudent?.classTeacher || activeStudent?.assignedTeacher || 'Assigned Staff'}</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              Personal & Emergency Details
            </h3>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-400">Date of Birth:</span>
                <span className="font-mono font-bold">{activeStudent?.dateOfBirth || activeStudent?.dob || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-slate-400">Emergency Contact:</span>
                <span className="font-bold text-[#002147]">{activeStudent?.emergencyContact || activeStudent?.parentPhone || 'On File'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-400">Record Status:</span>
                <span className="font-bold text-emerald-700">Verified & Locked</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
