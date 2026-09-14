import React from 'react';
import { 
  BookOpen, 
  User, 
  Calendar, 
  Award, 
  Send, 
  Eye, 
  Paperclip,
  CheckCircle2
} from 'lucide-react';
import { AssignmentStatusBadge, LMSAssignmentStatus } from './AssignmentStatusBadge';
import { TimeRemainingTicker } from './TimeRemainingTicker';

interface AssignmentCardViewProps {
  assignments: any[];
  submissions: any[];
  onOpenDetails: (assignment: any) => void;
  onSubmitWork: (assignment: any) => void;
  onViewGrades: (assignment: any, submission: any) => void;
}

export const AssignmentCardView: React.FC<AssignmentCardViewProps> = ({
  assignments,
  submissions,
  onOpenDetails,
  onSubmitWork,
  onViewGrades
}) => {
  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
          <BookOpen className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black text-[#002147]">No Assignments Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          There are currently no assignments matching your search criteria or filter selection.
        </p>
      </div>
    );
  }

  // Create submission mapping
  const subMap = new Map<string, any>();
  submissions.forEach(s => subMap.set(s.assignmentId, s));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {assignments.map(ass => {
        const sub = subMap.get(ass.id);

        // Determine priority
        const priority = ass.priority || 'Medium';
        const priorityColor = 
          priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
          priority === 'Low' ? 'bg-slate-100 text-slate-600 border-slate-200' :
          'bg-amber-50 text-amber-800 border-amber-200';

        // Compute status badge
        const todayStr = new Date().toISOString().split('T')[0];
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
          // Check draft saved in local storage or status
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
          <div
            key={ass.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-[#002147]/50 transition duration-200 flex flex-col justify-between space-y-4 group relative"
          >
            {/* TOP BAR: SUBJECT & STATUS BADGE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase text-[#002147] bg-[#002147]/5 px-2.5 py-1 rounded-lg border border-[#002147]/10">
                  {ass.subjectName || ass.subjectId || 'Subject'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${priorityColor}`}>
                    {priority} Priority
                  </span>
                  <AssignmentStatusBadge status={statusBadge} />
                </div>
              </div>

              {/* TITLE */}
              <h3 
                onClick={() => onOpenDetails(ass)}
                className="text-sm font-black text-[#002147] group-hover:text-blue-900 transition line-clamp-2 cursor-pointer leading-snug"
              >
                {ass.title}
              </h3>
            </div>

            {/* DETAILS BLOCK */}
            <div className="space-y-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-500">
                  <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="truncate max-w-[140px]">{ass.teacherName || 'Teacher'}</span>
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {ass.className || ass.targetClass || 'Class'}
                </span>
              </div>

              {/* DATES & TIME REMAINING */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Due: {ass.dueDate || 'No Date'}
                </span>

                <TimeRemainingTicker 
                  dueDate={ass.dueDate} 
                  dueTime={ass.dueTime} 
                  isSubmitted={isSubmitted} 
                />
              </div>

              {/* MARKS & ATTACHMENTS COUNT */}
              <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <span className="flex items-center gap-1 font-mono font-bold text-[#002147]">
                  <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {ass.totalMarks || 100} Marks (Pass: {ass.passingMarks || 50})
                </span>

                {ass.attachments && ass.attachments.length > 0 && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Paperclip className="w-3.5 h-3.5" />
                    {ass.attachments.length} files
                  </span>
                )}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <button
                onClick={() => onOpenDetails(ass)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-[#002147] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>

              {isGraded ? (
                <button
                  onClick={() => onViewGrades(ass, sub)}
                  className="flex-1 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>View Grade ({sub?.grade ?? 'A'})</span>
                </button>
              ) : (
                <button
                  onClick={() => onSubmitWork(ass)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                    isSubmitted 
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white' 
                      : 'bg-[#002147] hover:bg-[#00152e] text-white'
                  }`}
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>{sub?.allowResubmission ? 'Resubmit' : 'View Submission'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Submit Work</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        );
      })}
    </div>
  );
};
