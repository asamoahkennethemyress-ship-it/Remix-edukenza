import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathFormulaRendererProps {
  latex: string;
  inline?: boolean;
  className?: string;
}

export const MathFormulaRenderer: React.FC<MathFormulaRendererProps> = ({
  latex,
  inline = false,
  className = ''
}) => {
  const renderedHtml = useMemo(() => {
    if (!latex || !latex.trim()) return '';
    try {
      return katex.renderToString(latex, {
        displayMode: !inline,
        throwOnError: false
      });
    } catch (err) {
      console.warn("KaTeX rendering error:", err);
      return `<span class="text-red-500 font-mono text-xs">${latex}</span>`;
    }
  }, [latex, inline]);

  if (!renderedHtml) return null;

  return (
    <span
      className={`katex-rendered-wrapper ${inline ? 'inline-block' : 'block my-2 text-center overflow-x-auto py-1'} ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
