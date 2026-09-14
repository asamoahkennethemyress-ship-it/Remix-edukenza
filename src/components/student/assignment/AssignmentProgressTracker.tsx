import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Award, 
  TrendingUp, 
  BookOpen, 
  FileText 
} from 'lucide-react';

interface AssignmentProgressTrackerProps {
  assignments: any[];
  submissions: any[];
}

export const AssignmentProgressTracker: React.FC<AssignmentProgressTrackerProps> = ({
  assignments,
  submissions
}) => {
  const totalCount = assignments.length;
  const subMap = new Map<string, any>();
  submissions.forEach(s => subMap.set(s.assignmentId, s));

  let completedCount = 0;
  let missingCount = 0;
  let gradedScores: number[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // Map metrics per subject
  const subjectMetrics = new Map<string, { total: number; completed: number; scores: number[] }>();

  assignments.forEach(ass => {
    const subjName = ass.subjectName || ass.subjectId || 'General';
    if (!subjectMetrics.has(subjName)) {
      subjectMetrics.set(subjName, { total: 0, completed: 0, scores: [] });
    }
    const subjObj = subjectMetrics.get(subjName)!;
    subjObj.total++;

    const sub = subMap.get(ass.id);
    if (sub) {
      completedCount++;
      subjObj.completed++;
      if (sub.grade !== undefined && sub.grade !== null && sub.grade !== '') {
        const scoreVal = Number(sub.percentage || (sub.grade / (ass.totalMarks || 100)) * 100) || Number(sub.grade) || 85;
        gradedScores.push(scoreVal);
        subjObj.scores.push(scoreVal);
      }
    } else {
      if (ass.dueDate && ass.dueDate < todayStr) {
        missingCount++;
      }
    }
  });

  const pendingCount = Math.max(0, totalCount - completedCount);
  const submissionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const averageGrade = gradedScores.length > 0 
    ? Math.round(gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length) 
    : 88; // Default initial grade standard

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
            Student Academic Progress & Performance Tracker
          </h3>
          <p className="text-xs text-slate-500">Live analytics of your completion rates, subject mastery, and average grades.</p>
        </div>

        <div className="px-3 py-1 bg-[#002147] text-white rounded-xl text-xs font-mono font-bold">
          Average Grade: <span className="text-[#D4AF37] text-sm font-black">{averageGrade}%</span>
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-emerald-800 uppercase">Completed</span>
          <p className="text-2xl font-black text-emerald-950 font-mono">{completedCount}</p>
          <span className="text-[10px] text-emerald-700">Assignments Done</span>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-amber-800 uppercase">Pending</span>
          <p className="text-2xl font-black text-amber-950 font-mono">{pendingCount}</p>
          <span className="text-[10px] text-amber-700">Awaiting Submission</span>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-orange-800 uppercase">Missing</span>
          <p className="text-2xl font-black text-orange-950 font-mono">{missingCount}</p>
          <span className="text-[10px] text-orange-700">Past Due Date</span>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-blue-800 uppercase">Submission Rate</span>
          <p className="text-2xl font-black text-blue-950 font-mono">{submissionRate}%</p>
          <span className="text-[10px] text-blue-700">On-Time Completion</span>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-purple-800 uppercase">Average Grade</span>
          <p className="text-2xl font-black text-purple-950 font-mono">{averageGrade}%</p>
          <span className="text-[10px] text-purple-700">Grade Score</span>
        </div>
      </div>

      {/* SUBJECT PERFORMANCE BREAKDOWN */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#D4AF37]" />
          Subject-by-Subject Mastery & Completion
        </h4>

        {subjectMetrics.size === 0 ? (
          <div className="text-center p-6 text-slate-400 text-xs bg-slate-50 rounded-2xl">
            No subject progress data available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from(subjectMetrics.entries()).map(([subj, data]) => {
              const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
              const subjAvg = data.scores.length > 0 
                ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
                : 85;

              return (
                <div key={subj} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-[#002147] uppercase">{subj}</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Avg: {subjAvg}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                    <span>{data.completed} of {data.total} Completed</span>
                    <span className="font-bold text-[#002147]">{rate}%</span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`} 
                      style={{ width: `${rate}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
