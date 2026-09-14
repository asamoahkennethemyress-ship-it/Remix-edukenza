import React from 'react';

interface CbtMathRendererProps {
  content: string;
  className?: string;
}

/**
 * Enhanced Math & Science Formula Renderer
 * Renders LaTeX inline ($...$), block ($$...$$), chemical formulas, matrices, and clean HTML/text formatting.
 */
export const CbtMathRenderer: React.FC<CbtMathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Render inline LaTeX formatting helper
  const formatTextWithMath = (text: string) => {
    if (!text.includes('$') && !text.includes('\\') && !text.includes('^') && !text.includes('_')) {
      return <span>{text}</span>;
    }

    // Split by block math $$...$$ first, then inline $...$
    const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);

    return (
      <>
        {parts.map((part, idx) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            const formula = part.slice(2, -2).trim();
            return (
              <div key={idx} className="my-2 p-3 bg-slate-900 text-amber-300 font-mono rounded-xl border border-slate-700 overflow-x-auto text-center font-bold">
                {formatFormula(formula)}
              </div>
            );
          } else if (part.startsWith('$') && part.endsWith('$')) {
            const formula = part.slice(1, -1).trim();
            return (
              <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-amber-300 font-mono rounded border border-slate-700 font-bold inline-block mx-0.5">
                {formatFormula(formula)}
              </span>
            );
          } else {
            return <span key={idx}>{part}</span>;
          }
        })}
      </>
    );
  };

  const formatFormula = (formula: string) => {
    // Replace common LaTeX symbols with UTF-8 or styled representations
    let formatted = formula
      .replace(/\\pm/g, '±')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\neq/g, '≠')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\theta/g, 'θ')
      .replace(/\\pi/g, 'π')
      .replace(/\\infty/g, '∞')
      .replace(/\\implies/g, '⟹')
      .replace(/\\to/g, '→')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

    return formatted;
  };

  return (
    <div className={`cbt-math-content ${className}`}>
      {formatTextWithMath(content)}
    </div>
  );
};
