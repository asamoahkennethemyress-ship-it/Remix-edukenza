import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { 
  Copy, 
  Check, 
  Info, 
  CheckCircle2, 
  BookOpen, 
  Lightbulb, 
  HelpCircle, 
  ArrowRight, 
  Target, 
  Wand2, 
  Table, 
  ExternalLink 
} from 'lucide-react';

interface MathScienceRendererProps {
  content: string;
  className?: string;
}

const CodeBlockWithCopy: React.FC<{ lang?: string; code: string }> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 text-slate-100 font-mono text-xs shadow-md">
      <div className="bg-slate-800/90 px-4 py-2 flex justify-between items-center text-[10px] text-slate-300 font-bold uppercase tracking-wider border-b border-slate-700">
        <span className="flex items-center gap-1.5 text-[#D4AF37]">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-sans text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="font-sans text-[10px]">Copy Snippet</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-200 selection:bg-purple-900">{code}</pre>
    </div>
  );
};

/**
 * Preprocesses educational content to ensure LaTeX mathematics, chemical equations,
 * tables, and headers parse reliably in standard CommonMark/GFM.
 */
function preprocessEducationalMarkdown(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Normalize LaTeX display delimiters \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `\n\n$$\n${inner.trim()}\n$$\n\n`);

  // 2. Normalize LaTeX inline delimiters \( ... \) to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner.trim()}$`);

  // 3. Ensure headings have blank lines around them so Markdown does not merge them with paragraphs
  text = text.replace(/([^\n])\n(#{1,4}\s)/g, '$1\n\n$2');
  text = text.replace(/^(#{1,4}\s[^\n]+)\n([^\n#\-\*\d])/gm, '$1\n\n$2');

  // 4. Ensure tables have blank lines before and after
  text = text.replace(/([^\n])\n(\|.+\|)\n/g, '$1\n\n$2\n');

  // 5. Wrap standalone chemical reactions or equations that lack $$ delimiters
  // e.g., lines containing chemical formulas with arrows -> or \rightarrow
  text = text.replace(/^([A-Z][a-z0-9\(\)]*(?:\s*[\+\=]\s*[A-Z0-9\(\)]+)*\s*(?:\\rightarrow|->|→)\s*[A-Z0-9\(\)]+.*)$/gm, (match) => {
    if (match.includes('$')) return match;
    const cleanFormula = match.trim().replace(/->|→/g, '\\rightarrow ');
    return `\n$$\n${cleanFormula}\n$$\n`;
  });

  return text;
}

export const MathScienceRenderer: React.FC<MathScienceRendererProps> = ({ content, className = '' }) => {
  const processedContent = useMemo(() => preprocessEducationalMarkdown(content), [content]);

  return (
    <div className={`edukenza-markdown-body text-slate-800 leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom Code Block & Inline Code Handling
          code({ node, inline, className: codeClass, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClass || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return (
                <CodeBlockWithCopy 
                  lang={match ? match[1] : ''} 
                  code={codeString} 
                />
              );
            }

            return (
              <code 
                className="px-1.5 py-0.5 bg-slate-100 border border-slate-200/80 rounded font-mono text-xs text-rose-700 font-semibold mx-0.5" 
                {...props}
              >
                {children}
              </code>
            );
          },

          // Custom Table Rendering with responsive wrapper and Copy Table button
          table({ children }) {
            const copyTableText = (e: React.MouseEvent) => {
              const tableEl = (e.currentTarget.closest('.edukenza-table-wrapper') as HTMLElement)?.querySelector('table');
              if (tableEl) {
                const text = tableEl.innerText;
                navigator.clipboard.writeText(text);
              }
            };

            return (
              <div className="edukenza-table-wrapper my-4 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                <div className="bg-[#002147] text-white px-3.5 py-2 flex justify-between items-center text-[11px] font-bold border-b border-slate-700">
                  <span className="text-[#D4AF37] font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Educational Data Table
                  </span>
                  <button
                    type="button"
                    onClick={copyTableText}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-semibold transition cursor-pointer flex items-center gap-1"
                    title="Copy Table Text"
                  >
                    <Copy className="w-3 h-3 text-[#D4AF37]" />
                    <span>Copy Table</span>
                  </button>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  {children}
                </table>
              </div>
            );
          },

          thead({ children }) {
            return (
              <thead className="bg-[#001529] text-white font-bold border-b border-slate-700">
                {children}
              </thead>
            );
          },

          tbody({ children }) {
            return (
              <tbody className="divide-y divide-slate-100 bg-white">
                {children}
              </tbody>
            );
          },

          tr({ children }) {
            return (
              <tr className="hover:bg-slate-50 transition-colors">
                {children}
              </tr>
            );
          },

          th({ children }) {
            return (
              <th className="px-4 py-2.5 text-slate-100 font-bold border-b border-slate-700 text-left">
                {children}
              </th>
            );
          },

          td({ children }) {
            return (
              <td className="px-4 py-2.5 text-slate-700 text-xs leading-normal">
                {children}
              </td>
            );
          },

          // Distinctive Typography Hierarchy
          h1({ children }) {
            return (
              <h2 className="text-lg md:text-xl font-black text-[#002147] mt-5 mb-2.5 pb-1.5 border-b-2 border-[#D4AF37]/50 flex items-center gap-2 tracking-tight">
                <Target className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <span>{children}</span>
              </h2>
            );
          },

          h2({ children }) {
            return (
              <h3 className="text-base md:text-lg font-black text-[#002147] mt-4 mb-2 pb-1 border-b border-slate-200 flex items-center gap-2 tracking-tight">
                <span className="w-2 h-2 rounded-full bg-[#002147] shrink-0" />
                <span>{children}</span>
              </h3>
            );
          },

          h3({ children }) {
            const titleStr = typeof children === 'string' ? children.toLowerCase() : '';
            let icon = <BookOpen className="w-4 h-4 text-sky-600 shrink-0" />;
            if (titleStr.includes('example') || titleStr.includes('hint')) icon = <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />;
            if (titleStr.includes('solution') || titleStr.includes('working')) icon = <Wand2 className="w-4 h-4 text-indigo-600 shrink-0" />;
            if (titleStr.includes('answer') || titleStr.includes('takeaway')) icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
            if (titleStr.includes('question') || titleStr.includes('practice')) icon = <HelpCircle className="w-4 h-4 text-purple-600 shrink-0" />;

            return (
              <h4 className="text-sm md:text-base font-extrabold text-[#002147] mt-3.5 mb-1.5 flex items-center gap-2">
                {icon}
                <span>{children}</span>
              </h4>
            );
          },

          h4({ children }) {
            return (
              <h5 className="text-xs md:text-sm font-bold text-[#002147] mt-3 mb-1">
                {children}
              </h5>
            );
          },

          // Blockquotes as Educational Callout Notes
          blockquote({ children }) {
            return (
              <div className="my-3 p-3.5 bg-slate-50 border-l-4 border-[#002147] rounded-r-2xl shadow-xs text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#002147]">
                  <Info className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Key Educational Note</span>
                </div>
                <div className="text-xs leading-relaxed italic text-slate-700">
                  {children}
                </div>
              </div>
            );
          },

          // Educational Lists
          ul({ children }) {
            return (
              <ul className="my-2 space-y-1.5 text-xs md:text-sm leading-relaxed text-slate-800 list-disc list-inside">
                {children}
              </ul>
            );
          },

          ol({ children }) {
            return (
              <ol className="my-2 space-y-1.5 text-xs md:text-sm leading-relaxed text-slate-800 list-decimal list-inside font-medium">
                {children}
              </ol>
            );
          },

          li({ children }) {
            return (
              <li className="text-xs md:text-sm text-slate-800 leading-relaxed">
                {children}
              </li>
            );
          },

          // Special Educational Paragraph Callouts
          p({ children }) {
            const firstChild = Array.isArray(children) ? children[0] : children;
            const textContent = typeof firstChild === 'string' ? firstChild.trim() : '';
            const lower = textContent.toLowerCase();

            // Given / Knowns card
            if (lower.startsWith('given:') || lower.startsWith('knowns:')) {
              return (
                <div className="my-2 p-3 bg-blue-50/80 border border-blue-200 rounded-2xl shadow-xs space-y-1">
                  <span className="inline-block px-2 py-0.5 bg-blue-600 text-white font-extrabold text-[10px] rounded-md tracking-wider uppercase">
                    Given / Knowns
                  </span>
                  <div className="text-xs text-slate-800 font-medium">
                    {children}
                  </div>
                </div>
              );
            }

            // Formula / Principle card
            if (lower.startsWith('formula:') || lower.startsWith('principle:') || lower.startsWith('theorem:')) {
              return (
                <div className="my-2 p-3 bg-purple-50/80 border border-purple-200 rounded-2xl shadow-xs space-y-1">
                  <span className="inline-block px-2 py-0.5 bg-purple-600 text-white font-extrabold text-[10px] rounded-md tracking-wider uppercase">
                    Formula / Principle
                  </span>
                  <div className="text-xs text-slate-800 font-medium">
                    {children}
                  </div>
                </div>
              );
            }

            // Step-by-step Working card
            if (lower.startsWith('working:') || lower.startsWith('step-by-step:')) {
              return (
                <div className="my-2 p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl shadow-xs space-y-1">
                  <span className="inline-block px-2 py-0.5 bg-indigo-600 text-white font-extrabold text-[10px] rounded-md tracking-wider uppercase">
                    Step-by-Step Working
                  </span>
                  <div className="text-xs text-slate-800 font-medium">
                    {children}
                  </div>
                </div>
              );
            }

            // Final Answer / Solution card
            if (lower.startsWith('final answer:') || lower.startsWith('solution:') || lower.startsWith('answer:')) {
              return (
                <div className="my-3 p-3.5 bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black text-[11px] uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Final Solution & Answer</span>
                  </div>
                  <div className="text-xs md:text-sm font-bold text-slate-900">
                    {children}
                  </div>
                </div>
              );
            }

            // Definition card
            if (lower.startsWith('definition:')) {
              return (
                <div className="my-2 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl shadow-xs space-y-1">
                  <span className="inline-block px-2 py-0.5 bg-amber-600 text-white font-extrabold text-[10px] rounded-md tracking-wider uppercase">
                    Definition
                  </span>
                  <div className="text-xs text-slate-800 font-medium">
                    {children}
                  </div>
                </div>
              );
            }

            return (
              <p className="my-2 text-xs md:text-sm leading-relaxed text-slate-800 break-words">
                {children}
              </p>
            );
          },

          a({ href, children }) {
            return (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-purple-600 hover:text-purple-700 underline font-medium inline-flex items-center gap-0.5"
              >
                <span>{children}</span>
                <ExternalLink className="w-3 h-3 inline" />
              </a>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};


