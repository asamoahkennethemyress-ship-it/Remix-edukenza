import React from 'react';
import { 
  X, 
  Award, 
  MessageSquare, 
  Paperclip, 
  Download, 
  RotateCcw, 
  FileCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { KaTeXRenderer } from './KaTeXRenderer';

interface AssignmentGradesViewProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  submission: any;
  onResubmit: (assignment: any) => void;
}

export const AssignmentGradesView: React.FC<AssignmentGradesViewProps> = ({
  isOpen,
  onClose,
  assignment,
  submission,
  onResubmit
}) => {
  if (!isOpen || !assignment || !submission) return null;

  const score = submission.grade ?? submission.score ?? 0;
  const maxScore = assignment.totalMarks || submission.totalMarks || 100;
  const percentage = Math.round((Number(score) / Number(maxScore)) * 100) || 0;

  // Grade badge color
  const gradeColor = 
    percentage >= 80 ? 'bg-emerald-600 text-white' :
    percentage >= 60 ? 'bg-blue-600 text-white' :
    percentage >= 50 ? 'bg-amber-600 text-white' :
    'bg-red-600 text-white';

  const letterGrade = 
    percentage >= 90 ? 'A+' :
    percentage >= 80 ? 'A' :
    percentage >= 70 ? 'B' :
    percentage >= 60 ? 'C' :
    percentage >= 50 ? 'D' : 'F';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="bg-[#002147] text-white p-6 relative flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-[#D4AF37] bg-[#D4AF37]/15 px-2.5 py-1 rounded-md">
              {assignment.subjectName || assignment.subjectId || 'Grade Report'}
            </span>
            <h2 className="text-xl font-black text-white mt-1">
              Grade & Feedback: {assignment.title}
            </h2>
            <p className="text-xs text-slate-300">
              Instructor: {assignment.teacherName || 'Teacher'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SCORE HIGHLIGHT BANNER */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${gradeColor} flex items-center justify-center font-black text-xl shadow-lg font-mono`}>
              {letterGrade}
            </div>
            <div>
              <div className="text-2xl font-black font-mono text-white">
                {score} <span className="text-slate-400 text-base">/ {maxScore} pts</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Overall Percentage: <span className="text-[#D4AF37] font-bold">{percentage}%</span>
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-slate-400">
            <p>Graded On: {submission.gradedAtStr || submission.gradedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
            <p className="text-emerald-400 font-bold mt-0.5">Status: {percentage >= 50 ? 'PASSED' : 'NEEDS REVISION'}</p>
          </div>
        </div>

        {/* BODY FEEDBACK CONTENT */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* TEACHER COMMENTS & FEEDBACK */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 space-y-2">
            <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-700" />
              Teacher Comments & Overall Feedback
            </h4>
            <div className="text-xs text-slate-800 leading-relaxed font-medium">
              <KaTeXRenderer content={submission.teacherComments || submission.feedback || 'Excellent work! Detailed research and clear mathematical steps.'} />
            </div>
          </div>

          {/* RUBRIC SCORE BREAKDOWN IF AVAILABLE */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37]" />
              Rubric Evaluation Breakdown
            </h4>

            {(!submission.rubricScores && (!assignment.rubric || assignment.rubric.length === 0)) ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
                Graded based on standard criteria: Clarity, Accuracy, and Submission Timeliness.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#002147] text-white font-bold">
                      <th className="p-3">Criterion</th>
                      <th className="p-3">Awarded Score</th>
                      <th className="p-3">Teacher Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(assignment.rubric || [
                      { criterion: 'Content Accuracy', maxScore: 40 },
                      { criterion: 'Structure & Formatting', maxScore: 30 },
                      { criterion: 'Research & Depth', maxScore: 30 }
                    ]).map((r: any, idx: number) => {
                      const scored = submission.rubricScores?.[r.criterion || r.title] ?? (r.maxScore || 30);
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-[#002147]">{r.criterion || r.title}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{scored} / {r.maxScore || r.points || 30} pts</td>
                          <td className="p-3 text-slate-600">{r.feedback || 'Criteria met with high accuracy.'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ANNOTATED FILES / FEEDBACK ATTACHMENTS */}
          {submission.annotatedFiles && submission.annotatedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#D4AF37]" />
                Annotated Files & Teacher Corrected Work
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {submission.annotatedFiles.map((file: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#002147] truncate">{file.name || `Feedback Doc #${idx+1}`}</span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-[#002147] text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl"
          >
            Close
          </button>

          {(submission.allowResubmission || submission.status === 'Returned') && (
            <button
              onClick={() => {
                onClose();
                onResubmit(assignment);
              }}
              className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-950 text-white font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-4 h-4 text-[#D4AF37]" />
              <span>Resubmit Work for Higher Grade</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
