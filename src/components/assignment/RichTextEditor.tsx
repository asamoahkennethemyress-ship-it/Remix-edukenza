import React, { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Table, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Code, 
  Minus, 
  Undo, 
  Redo, 
  Sigma,
  Paperclip,
  Sparkles
} from 'lucide-react';
import { EquationEditorModal } from './EquationEditorModal';
import { MathFormulaRenderer } from './MathFormulaRenderer';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onUploadFile?: (file: File) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write assignment instructions, question sets, or detailed guides here...',
  onUploadFile
}) => {
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const updateContent = (newText: string) => {
    onChange(newText);
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(newText);
    setHistory(newHist);
    setHistoryIndex(newHist.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  };

  // Formatting helpers for text insertion
  const applyFormat = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('assignment-rich-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = value.substring(0, start) + replacement + value.substring(end);
    updateContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const handleInsertEquation = (latexCode: string) => {
    applyFormat(`$${latexCode}$`, '');
  };

  const handleInsertTable = () => {
    const tableMarkdown = `\n| Item | Description | Points |\n|---|---|---|\n| Task 1 | Solve algebraic steps | 10 |\n| Task 2 | Graph the quadratic function | 10 |\n`;
    updateContent(value + tableMarkdown);
  };

  const handleInsertLink = () => {
    const url = prompt("Enter hyperlink URL:", "https://");
    if (url) {
      applyFormat(`[Reference Link](${url})`, '');
    }
  };

  // Helper renderer to split text into markdown lines and LaTeX formulas
  const renderFormattedPreview = (rawText: string) => {
    if (!rawText) return null;

    // Split by single dollar sign inline LaTeX $...$
    const parts = rawText.split(/(\$[^\$]+\$)/g);

    return (
      <div className="prose prose-slate max-w-none text-xs leading-relaxed space-y-2">
        {parts.map((part, idx) => {
          if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
            const latex = part.slice(1, -1);
            return <MathFormulaRenderer key={idx} latex={latex} inline={true} />;
          }
          return <span key={idx} className="whitespace-pre-wrap">{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="border border-slate-300 rounded-3xl overflow-hidden bg-white shadow-sm flex flex-col">
      {/* TOOLBAR */}
      <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap items-center gap-1 text-slate-700">
        <button
          type="button"
          onClick={() => applyFormat('**', '**')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('*', '*')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('<u>', '</u>')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('~~', '~~')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => applyFormat('\n# ', '\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n## ', '\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n### ', '\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={() => applyFormat('\n- ', '\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n1. ', '\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n- [ ] ', '\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Checklist"
        >
          <CheckSquare className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n> ', '\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        <button
          type="button"
          onClick={handleInsertTable}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Insert Table"
        >
          <Table className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleInsertLink}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Insert Hyperlink"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n```\n', '\n```\n')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('\n---\n', '')}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition"
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 mx-1" />

        {/* STEM EQUATION INSERT BUTTON */}
        <button
          type="button"
          onClick={() => setIsEquationModalOpen(true)}
          className="px-2.5 py-1 bg-[#002147] hover:bg-[#0b3c5d] text-white rounded-lg transition text-xs font-bold flex items-center gap-1 border border-[#D4AF37]/30 shadow-sm"
          title="Insert Math/Science Equation"
        >
          <Sigma className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>STEM Equation</span>
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleUndo}
          disabled={historyIndex === 0}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-30 rounded-lg transition"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={historyIndex === history.length - 1}
          className="p-1.5 hover:bg-slate-200 disabled:opacity-30 rounded-lg transition"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* TEXT AREA */}
      <textarea
        id="assignment-rich-textarea"
        value={value}
        onChange={(e) => updateContent(e.target.value)}
        placeholder={placeholder}
        rows={10}
        className="w-full p-4 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none resize-y"
      />

      {/* RENDER PREVIEW BOX */}
      {value && value.trim() && (
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Live Instructions & LaTeX Equation Preview</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            {renderFormattedPreview(value)}
          </div>
        </div>
      )}

      {/* STEM EQUATION MODAL */}
      <EquationEditorModal
        isOpen={isEquationModalOpen}
        onClose={() => setIsEquationModalOpen(false)}
        onInsert={handleInsertEquation}
      />
    </div>
  );
};
