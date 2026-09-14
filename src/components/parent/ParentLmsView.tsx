import React, { useState } from 'react';
import { LmsMainView } from '../lms/LmsMainView';
import { UserCheck } from 'lucide-react';

interface ParentLmsViewProps {
  schoolId: string;
  linkedStudents?: any[];
  selectedStudent?: any;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ParentLmsView: React.FC<ParentLmsViewProps> = ({
  schoolId,
  linkedStudents = [],
  selectedStudent,
  showToast
}) => {
  const [activeStudent, setActiveStudent] = useState<any>(
    selectedStudent || linkedStudents[0] || null
  );

  if (!activeStudent && linkedStudents.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
        <UserCheck className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No Student Linked</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          No student profiles are currently linked to this parent account. Please contact your school administrator to link your child's student profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Selector Bar for Parent */}
      {linkedStudents.length > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700 uppercase">Monitoring Learning Progress For:</span>
          <div className="flex gap-2">
            {linkedStudents.map(st => (
              <button
                key={st.id || st.uid}
                onClick={() => setActiveStudent(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeStudent?.id === st.id || activeStudent?.uid === st.uid
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st.fullName || st.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <LmsMainView
        schoolId={schoolId}
        currentUserId={activeStudent?.uid || activeStudent?.id || ''}
        currentUserName={activeStudent?.fullName || activeStudent?.name || 'Student'}
        currentUserRole="parent"
        studentName={activeStudent?.fullName || activeStudent?.name || 'Student'}
        showToast={showToast}
      />
    </div>
  );
};
