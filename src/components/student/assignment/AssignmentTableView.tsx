import React from 'react';
import { 
  Eye, 
  Send, 
  Award, 
  CheckCircle2, 
  FileText 
} from 'lucide-react';
import { AssignmentStatusBadge, LMSAssignmentStatus } from './AssignmentStatusBadge';
import { TimeRemainingTicker } from './TimeRemainingTicker';

interface AssignmentTableViewProps {
  assignments: any[];
  submissions: any[];
  onOpenDetails: (assignment: any) => void;
  onSubmitWork: (assignment: any) => void;
  onViewGrades: (assignment: any, submission: any) => void;
}

export const AssignmentTableView: React.FC<AssignmentTableViewProps> = ({
  assignments,
  submissions,
  onOpenDetails,
  onSubmitWork,
  onViewGrades
}) => {
  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
        <FileText className="w-8 h-8 text-slate-300 mx-auto" />
        <h3 className="text-sm font-black text-[#002147]">No Assignments Available</h3>
        <p className="text-xs text-slate-500">No matching assignment records found.</p>
      </div>
    );
  }

  const subMap = new Map<string, any>();
  submissions.forEach(s => subMap.set(s.assignmentId, s));
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#002147] text-white text-[11px] font-black uppercase tracking-wider border-b border-[#00152e]">
              <th className="py-3.5 px-4">Title & Subject</th>
              <th className="py-3.5 px-4">Teacher & Class</th>
              <th className="py-3.5 px-4">Published</th>
              <th className="py-3.5 px-4">Due Date & Time Left</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Marks</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {assignments.map(ass => {
              const sub = subMap.get(ass.id);
              
              let statusBadge: LMSAssignmentStatus = 'New';
              if (sub) {
                if (sub.grade !== undefined && sub.grade !== null && sub.grade !== '' || sub.status === 'Graded') {
                  statusBadge = 'Graded';
                } else if (sub.status === 'Returned') {
                  statusBadge = 'Returned';
                } else {
                  statusBadge = 'Submitted';
                }
              } else {
                const hasDraft = localStorage.getItem(`assignment_draft_${ass.id}`) !== null;
                if (hasDraft) {
                  statusBadge = 'In Progress';
                } else if (ass.dueDate && ass.dueDate < todayStr) {
                  statusBadge = 'Overdue';
                } else {
                  statusBadge = 'New';
                }
              }

              const isGraded = statusBadge === 'Graded';
              const isSubmitted = statusBadge === 'Submitted' || statusBadge === 'Graded';

              return (
                <tr key={ass.id} className="hover:bg-slate-50/80 transition">
                  {/* TITLE & SUBJECT */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-[#002147] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {ass.subjectName || ass.subjectId || 'General'}
                      </span>
                      <h4 
                        onClick={() => onOpenDetails(ass)}
                        className="font-bold text-[#002147] hover:underline cursor-pointer line-clamp-1"
                      >
                        {ass.title}
                      </h4>
                    </div>
                  </td>

                  {/* TEACHER & CLASS */}
                  <td className="py-3 px-4 font-medium text-slate-700">
                    <p className="font-bold text-[#002147]">{ass.teacherName || 'Instructor'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{ass.className || ass.targetClass || 'Grade'}</p>
                  </td>

                  {/* PUBLISHED DATE */}
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {ass.availableFromDate || ass.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || 'N/A'}
                  </td>

                  {/* DUE DATE & COUNTDOWN */}
                  <td className="py-3 px-4 space-y-1">
                    <div className="font-mono text-[11px] font-bold text-slate-800">
                      {ass.dueDate || 'No Date'}
                    </div>
                    <TimeRemainingTicker 
                      dueDate={ass.dueDate} 
                      dueTime={ass.dueTime} 
                      isSubmitted={isSubmitted} 
                    />
                  </td>

                  {/* STATUS */}
                  <td className="py-3 px-4">
                    <AssignmentStatusBadge status={statusBadge} />
                  </td>

                  {/* MARKS */}
                  <td className="py-3 px-4 font-mono font-bold text-[#002147]">
                    {ass.totalMarks || 100} pts
                  </td>

                  {/* ACTIONS */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onOpenDetails(ass)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-[#002147] rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isGraded ? (
                        <button
                          onClick={() => onViewGrades(ass, sub)}
                          className="px-2.5 py-1 bg-purple-900 hover:bg-purple-950 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="View Grade"
                        >
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>Grade</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSubmitWork(ass)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                            isSubmitted ? 'bg-emerald-800 text-white' : 'bg-[#002147] text-white hover:bg-[#00152e]'
                          }`}
                        >
                          {isSubmitted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Send className="w-3.5 h-3.5 text-[#D4AF37]" />}
                          <span>{isSubmitted ? 'Submitted' : 'Submit'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
