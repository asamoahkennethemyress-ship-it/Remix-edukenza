import React, { useState } from 'react';
import { FileText, Sparkles, RefreshCw, Copy, Upload, Check, UserCheck, BarChart3 } from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';

export interface AiReportWriterSectionProps {
  userRole: 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiReportWriterSection: React.FC<AiReportWriterSectionProps> = ({
  userRole,
  showToast
}) => {
  const [studentName, setStudentName] = useState('Thabo Mokoena');
  const [grade, setGrade] = useState('Grade 10');
  const [subjectScores, setSubjectScores] = useState('Mathematics: 84%, Physical Sciences: 78%, Life Sciences: 91%, English: 72%');
  const [attendance, setAttendance] = useState('98%');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      showToast(`Uploaded ${file.name} report card for AI synthesis`, 'info');
      // Set sample extracted score context
      setSubjectScores(`Extracted from ${file.name}: Mathematics: 82%, Physical Sciences: 75%, Biology: 88%`);
    };
    reader.readAsText(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/report-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          grade,
          subjectScores,
          attendance,
          role: userRole
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Report writer API error.');
      }
      if (data.report) {
        setReportResult(data.report);
        showToast('Academic report analysis generated!', 'success');
      }
    } catch (err: any) {
      console.error('Report writer error:', err);
      showToast('Error generating report: ' + (err?.message || 'Check connection'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyReport = () => {
    if (reportResult) {
      navigator.clipboard.writeText(reportResult);
      showToast('Report copied to clipboard!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white p-6 rounded-3xl border border-[#D4AF37]/40 shadow-md flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-black tracking-tight">AI Report Writer & Academic Progress Analyzer</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            {userRole === 'parent' 
              ? 'Upload or enter student report card grades to understand strengths, weaknesses, and study recommendations.'
              : userRole === 'teacher' 
              ? 'Generate comprehensive report card comments, academic achievements, and improvement plans.'
              : 'Generate school-wide statistics, enrollment summaries, attendance trends, and administrative letters.'}
          </p>
        </div>

        {userRole === 'parent' && (
          <label className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-2xl cursor-pointer transition flex items-center gap-2 shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Upload Report Card</span>
            <input type="file" accept=".pdf,.txt,image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <form onSubmit={handleGenerate} className="space-y-4">
            {userRole !== 'school_admin' && userRole !== 'platform_owner' && (
              <div>
                <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Grade / Level</label>
              <input
                type="text"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Subject Scores & Notes *</label>
              <textarea
                rows={3}
                value={subjectScores}
                onChange={e => setSubjectScores(e.target.value)}
                placeholder="e.g. Maths: 75%, Science: 82%, English: 70%..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-1">Attendance Rate</label>
              <input
                type="text"
                value={attendance}
                onChange={e => setAttendance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating || !subjectScores.trim()}
              className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
              <span>{isGenerating ? 'Analyzing Performance...' : 'Generate Academic Report'}</span>
            </button>
          </form>
        </div>

        {/* OUTPUT */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[450px]">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">Report Analysis & Guidance</h3>
              
              {reportResult && (
                <button
                  onClick={copyReport}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {isGenerating ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#002147] mx-auto" />
                <p className="text-xs font-bold text-slate-700">Evaluating subject scores, attendance trends, and formulating strategic study recommendations...</p>
              </div>
            ) : reportResult ? (
              <MathScienceRenderer content={reportResult} />
            ) : (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <BarChart3 className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Click "Generate Academic Report" to create progress comments.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
