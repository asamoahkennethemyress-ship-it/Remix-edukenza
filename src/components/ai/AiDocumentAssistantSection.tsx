import React, { useState } from 'react';
import { FileText, Sparkles, Upload, RefreshCw, Download, Check, HelpCircle, BookOpen, Globe, FileSpreadsheet, Copy } from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';

export interface AiDocumentAssistantSectionProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiDocumentAssistantSection: React.FC<AiDocumentAssistantSectionProps> = ({ showToast }) => {
  const [fileName, setFileName] = useState<string>('Biology_Grade10_Textbook_Chapter3.pdf');
  const [fileContent, setFileContent] = useState<string>(
    `CHAPTER 3: CELLULAR RESPIRATION & PHOTOSYNTHESIS
Photosynthesis is the process used by plants, algae, and certain bacteria to harness energy from sunlight and turn it into chemical energy.
Equation: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

Cellular respiration is a set of metabolic reactions and processes that take place in the cells of organisms to convert biochemical energy from nutrients into adenosine triphosphate (ATP), and then release waste products.
Equation: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP (Energy)`
  );
  const [mimeType, setMimeType] = useState<string>('text/plain');
  const [task, setTask] = useState<string>('summarize');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMimeType(file.type || 'text/plain');

    const reader = new FileReader();
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      reader.onload = () => {
        setFileContent(reader.result as string);
        showToast(`Loaded ${file.name} for AI analysis`, 'info');
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        setFileContent(reader.result as string);
        showToast(`Loaded ${file.name} text content`, 'info');
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    if (!fileContent || isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/document-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent,
          fileName,
          mimeType,
          task,
          customPrompt
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Document AI API failed.');
      }
      if (data.analysis) {
        setAnalysisResult(data.analysis);
        showToast('Document analysis complete!', 'success');
      }
    } catch (err: any) {
      console.error('Doc AI error:', err);
      showToast('Document error: ' + (err?.message || 'Check server connection'), 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyResult = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      showToast('Analysis copied to clipboard!', 'success');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#002147] to-[#003366] text-white p-6 rounded-3xl border border-[#D4AF37]/40 shadow-md flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-black tracking-tight">AI Multimodal Document Assistant</h2>
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Upload PDFs, Word docs, Excel sheets, PowerPoint outlines, or textbook images to summarize, generate flashcards & quizzes.
          </p>
        </div>

        <label className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-2xl cursor-pointer transition flex items-center gap-2 shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
          <input type="file" accept=".pdf,.docx,.pptx,.xlsx,.txt,image/*" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INPUT FORM & TASK SELECTOR */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-[#002147] text-[#D4AF37] rounded-xl font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate min-w-0">
              <div className="text-xs font-bold text-[#002147] truncate">{fileName}</div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">{mimeType}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-[#002147] uppercase tracking-wider mb-2">Select Document AI Task</label>
            <select
              value={task}
              onChange={e => setTask(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none"
            >
              <option value="summarize">Executive Summary & Key Takeaways</option>
              <option value="generate_quiz">Generate Practice Quiz (5 Questions)</option>
              <option value="generate_flashcards">Generate Concept Flashcards</option>
              <option value="extract_key_points">Extract Key Definitions & Equations</option>
              <option value="explain">Explain for Students (Simple Analogies)</option>
              <option value="translate">Translate Key Sections</option>
            </select>
          </div>

          {task === 'translate' && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Target Language</label>
              <input
                type="text"
                placeholder="e.g. isiZulu, Afrikaans, Sepedi, French..."
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" /> : <Sparkles className="w-4 h-4 text-[#D4AF37]" />}
            <span>{isAnalyzing ? 'Analyzing Document...' : 'Analyze Document with AI'}</span>
          </button>
        </div>

        {/* ANALYSIS OUTPUT */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[450px]">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-black text-[#002147] uppercase tracking-wider">Document AI Output & Insights</h3>
              {analysisResult && (
                <button
                  onClick={copyResult}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {isAnalyzing ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#002147] mx-auto" />
                <p className="text-xs font-bold text-slate-700">Reading, parsing, and synthesizing document contents...</p>
              </div>
            ) : analysisResult ? (
              <MathScienceRenderer content={analysisResult} />
            ) : (
              <div className="py-20 text-center text-slate-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Click "Analyze Document with AI" to generate summaries and flashcards.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
