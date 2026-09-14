import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  User, 
  Calendar, 
  Clock, 
  Award, 
  Download, 
  Eye, 
  FileText, 
  Paperclip, 
  CheckCircle2, 
  HelpCircle,
  FileCheck,
  Send,
  ExternalLink
} from 'lucide-react';
import { KaTeXRenderer } from './KaTeXRenderer';
import { TimeRemainingTicker } from './TimeRemainingTicker';
import { AssignmentStatusBadge } from './AssignmentStatusBadge';

interface AssignmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  submission: any;
  onSubmitWork: (assignment: any) => void;
}

export const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({
  isOpen,
  onClose,
  assignment,
  submission,
  onSubmitWork
}) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'rubric' | 'attachments'>('instructions');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [filePreviewName, setFilePreviewName] = useState<string>('');

  if (!isOpen || !assignment) return null;

  const isSubmitted = !!submission;
  const isGraded = submission?.grade !== undefined && submission?.grade !== null && submission?.grade !== '';

  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewFile = (fileUrl: string, fileName: string) => {
    setFilePreviewUrl(fileUrl);
    setFilePreviewName(fileName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      
      {/* PREVIEW MODAL IF OPEN */}
      {filePreviewUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 flex flex-col p-4 md:p-8">
          <div className="flex justify-between items-center text-white pb-3 border-b border-white/20">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#D4AF37]" />
              <span>Preview: {filePreviewName}</span>
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownloadFile(filePreviewUrl, filePreviewName)}
                className="px-3 py-1 bg-[#D4AF37] text-[#002147] rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                onClick={() => setFilePreviewUrl(null)}
                className="p-1 text-slate-300 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 mt-4 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
            {filePreviewUrl.match(/\.(jpeg|jpg|png|gif|webp|svg)/i) ? (
              <img src={filePreviewUrl} alt={filePreviewName} className="max-h-full max-w-full object-contain" />
            ) : (
              <iframe src={filePreviewUrl} title={filePreviewName} className="w-full h-full border-0" />
            )}
          </div>
        </div>
      )}

      {/* MAIN DETAILS PANEL */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="bg-[#002147] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-2 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-[#D4AF37] bg-[#D4AF37]/15 px-2.5 py-1 rounded-md border border-[#D4AF37]/30">
                {assignment.subjectName || assignment.subjectId || 'Subject'}
              </span>
              <span className="text-[10px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                Class: {assignment.className || assignment.targetClass || 'All'}
              </span>
              <AssignmentStatusBadge status={isGraded ? 'Graded' : isSubmitted ? 'Submitted' : 'New'} />
            </div>

            <h2 className="text-xl font-black text-white leading-tight">
              {assignment.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 font-mono">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                {assignment.teacherName || 'Instructor'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Due: {assignment.dueDate || 'No Date'} ({assignment.dueTime || '23:59'})
              </span>
              <TimeRemainingTicker dueDate={assignment.dueDate} dueTime={assignment.dueTime} isSubmitted={isSubmitted} />
            </div>
          </div>
        </div>

        {/* METRICS & QUICK SUMMARY RIBBON */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Marks</span>
            <span className="font-black text-[#002147] font-mono text-sm">{assignment.totalMarks || 100}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Passing Marks</span>
            <span className="font-black text-emerald-700 font-mono text-sm">{assignment.passingMarks || 50}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Time</span>
            <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
              {assignment.estimatedTime || '45 mins'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Type / Category</span>
            <span className="font-bold text-[#002147] mt-0.5 block">{assignment.type || 'Homework'}</span>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200 px-6 bg-white text-xs font-bold">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'instructions' 
                ? 'border-[#002147] text-[#002147] font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>Instructions & Objectives</span>
          </button>
          
          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'attachments' 
                ? 'border-[#002147] text-[#002147] font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Paperclip className="w-4 h-4 text-[#D4AF37]" />
            <span>Attachments ({assignment.attachments?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('rubric')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'rubric' 
                ? 'border-[#002147] text-[#002147] font-black' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-[#D4AF37]" />
            <span>Grading Rubric</span>
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {activeTab === 'instructions' && (
            <div className="space-y-6">
              
              {/* LEARNING OBJECTIVES */}
              {assignment.learningObjectives && (
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Learning Objectives
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {assignment.learningObjectives}
                  </p>
                </div>
              )}

              {/* INSTRUCTIONS WITH KATEX FORMULAS & CHEMICAL EQUATIONS SUPPORT */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider">
                  Detailed Assignment Instructions
                </h4>
                
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 leading-relaxed text-xs">
                  <KaTeXRenderer content={assignment.instructions || assignment.description || 'No instructions provided.'} />
                </div>
              </div>

              {/* VIDEO EMBED IF AVAILABLE */}
              {assignment.videoUrl && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-[#D4AF37]" />
                    Reference Video Material
                  </h4>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 bg-black">
                    <iframe 
                      src={assignment.videoUrl} 
                      title="Assignment Video" 
                      className="w-full h-full border-0" 
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider">
                Teacher Files & Learning Materials
              </h4>

              {(!assignment.attachments || assignment.attachments.length === 0) ? (
                <div className="text-center p-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No reference attachments uploaded for this assignment.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignment.attachments.map((att: any, idx: number) => {
                    const name = att.fileName || att.name || `Attachment #${idx + 1}`;
                    const url = att.fileUrl || att.url || att;
                    return (
                      <div 
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-2 bg-white rounded-xl border border-slate-200 text-[#002147] font-black shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-[#002147] truncate">{name}</p>
                            <p className="text-[10px] text-slate-400">{att.fileSize || 'File attachment'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handlePreviewFile(url, name)}
                            className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200"
                            title="Preview File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadFile(url, name)}
                            className="p-1.5 bg-[#002147] hover:bg-[#00152e] text-white rounded-lg"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rubric' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-[#D4AF37]" />
                Grading Rubric & Scoring Criteria
              </h4>

              {(!assignment.rubric || assignment.rubric.length === 0) ? (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <p className="font-bold text-[#002147]">Standard Point Allocation</p>
                  <p>Evaluation based on clarity, mathematical correctness, research depth, and total accuracy out of {assignment.totalMarks || 100} maximum marks.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#002147] text-white font-bold">
                        <th className="p-3">Criterion</th>
                        <th className="p-3">Max Score</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignment.rubric.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-[#002147]">{r.title || r.criterion}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">{r.points || r.maxScore} pts</td>
                          <td className="p-3 text-slate-600">{r.description || 'Full points awarded for comprehensive answer.'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500 font-mono">
            Published: {assignment.availableFromDate || assignment.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || 'Recently'}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex-1 sm:flex-initial"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onSubmitWork(assignment);
              }}
              className="px-5 py-2.5 bg-[#002147] hover:bg-[#00152e] text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial"
            >
              <Send className="w-4 h-4 text-[#D4AF37]" />
              <span>{isSubmitted ? 'View / Edit Submission' : 'Submit Assignment'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
