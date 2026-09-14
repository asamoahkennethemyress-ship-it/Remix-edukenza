import React from 'react';
import katex from 'katex';

interface KaTeXRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses text containing inline math `$ ... $` or block math `$$ ... $$` or KaTeX math strings
 * and renders LaTeX formulas cleanly. Also formatted chemical formulas like H2O -> H₂O or \ce{H2O}.
 */
export const KaTeXRenderer: React.FC<KaTeXRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Function to render math string via KaTeX
  const renderMath = (math: string, displayMode: boolean) => {
    try {
      return katex.renderToString(math, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      return math;
    }
  };

  // Process text for $$ ... $$ and $ ... $
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;

  // Regex for block math $$...$$ or inline math $...$
  const mathRegex = /\$\$(.*?)\$\$|\$(.*?)\$/gs;
  let match: RegExpExecArray | null;

  let keyIndex = 0;
  while ((match = mathRegex.exec(content)) !== null) {
    // Push preceding text
    if (match.index > lastIdx) {
      const text = content.substring(lastIdx, match.index);
      parts.push(
        <span key={`text-${keyIndex++}`} dangerouslySetInnerHTML={{ __html: formatChemicalAndRichText(text) }} />
      );
    }

    if (match[1] !== undefined) {
      // Block Math
      const html = renderMath(match[1], true);
      parts.push(
        <div 
          key={`math-block-${keyIndex++}`} 
          className="my-2 py-1 overflow-x-auto text-center font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg"
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      );
    } else if (match[2] !== undefined) {
      // Inline Math
      const html = renderMath(match[2], false);
      parts.push(
        <span 
          key={`math-inline-${keyIndex++}`} 
          className="px-1 font-mono text-slate-900"
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      );
    }

    lastIdx = mathRegex.lastIndex;
  }

  if (lastIdx < content.length) {
    const text = content.substring(lastIdx);
    parts.push(
      <span key={`text-${keyIndex++}`} dangerouslySetInnerHTML={{ __html: formatChemicalAndRichText(text) }} />
    );
  }

  return <div className={`prose prose-slate max-w-none text-xs leading-relaxed ${className}`}>{parts}</div>;
};

// Simple helper to format chemical formulas and line breaks if raw string
function formatChemicalAndRichText(str: string): string {
  if (!str) return '';
  // Convert standard newlines to <br/> if not HTML
  let formatted = str;
  if (!formatted.includes('<p>') && !formatted.includes('<br>')) {
    formatted = formatted.replace(/\n/g, '<br/>');
  }
  // Replace simple chemical formulas like H2O -> H₂O, CO2 -> CO₂
  formatted = formatted
    .replace(/\bH2O\b/g, 'H₂O')
    .replace(/\bCO2\b/g, 'CO₂')
    .replace(/\bCH4\b/g, 'CH₄')
    .replace(/\bNaCl\b/g, 'NaCl')
    .replace(/\bH2SO4\b/g, 'H₂SO₄')
    .replace(/\bO2\b/g, 'O₂')
    .replace(/\bNH3\b/g, 'NH₃');

  return formatted;
}
