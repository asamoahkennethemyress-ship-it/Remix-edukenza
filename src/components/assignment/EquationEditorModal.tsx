import React, { useState } from 'react';
import { X, Check, Code, Sparkles, BookOpen, Atom, Cpu, Dna, Calculator } from 'lucide-react';
import { MathFormulaRenderer } from './MathFormulaRenderer';

interface EquationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latexCode: string) => void;
  initialLatex?: string;
}

export const EquationEditorModal: React.FC<EquationEditorModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialLatex = ''
}) => {
  const [latexInput, setLatexInput] = useState(initialLatex || 'E = mc^2');
  const [activeTab, setActiveTab] = useState<'math' | 'chemistry' | 'physics' | 'biology'>('math');

  if (!isOpen) return null;

  const presets = {
    math: [
      { label: 'Einstein Formula', code: 'E = mc^2' },
      { label: 'Quadratic Formula', code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
      { label: 'Definite Integral', code: '\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}' },
      { label: 'Fraction', code: '\\frac{a}{b}' },
      { label: 'Square Root', code: '\\sqrt{x}' },
      { label: 'Summation', code: '\\sum_{i=1}^{n} x_i' },
      { label: 'Matrix (2x2)', code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
      { label: 'Pythagoras', code: 'a^2 + b^2 = c^2' },
      { label: 'Limit', code: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
      { label: 'Greek Symbols', code: '\\alpha + \\beta = \\theta \\quad (\\pi, \\Delta, \\sigma, \\omega)' }
    ],
    chemistry: [
      { label: 'Water', code: '\\text{H}_2\\text{O}' },
      { label: 'Carbon Dioxide', code: '\\text{CO}_2' },
      { label: 'Sulfuric Acid', code: '\\text{H}_2\\text{SO}_4' },
      { label: 'Water Synthesis', code: '2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}' },
      { label: 'Calcium Decomposition', code: '\\text{CaCO}_3 \\longrightarrow \\text{CaO} + \\text{CO}_2' },
      { label: 'Equilibrium Reaction', code: '\\text{N}_2 + 3\\text{H}_2 \\rightleftharpoons 2\\text{NH}_3' },
      { label: 'Photosynthesis', code: '6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2' },
      { label: 'Ionic Dissociation', code: '\\text{NaCl} \\longrightarrow \\text{Na}^+ + \\text{Cl}^-' }
    ],
    physics: [
      { label: 'Newton Second Law', code: '\\vec{F} = m \\vec{a}' },
      { label: 'Ohm Law', code: 'V = I R \\quad (\\Omega)' },
      { label: 'Speed of Light', code: 'c = 3.00 \\times 10^8 \\text{ m/s}' },
      { label: 'Kinetic Energy', code: 'E_k = \\frac{1}{2} m v^2' },
      { label: 'Gravitational Force', code: 'F = G \\frac{m_1 m_2}{r^2}' },
      { label: 'Wave Equation', code: 'v = f \\lambda' },
      { label: 'Power Formula', code: 'P = \\frac{W}{t} = V I' }
    ],
    biology: [
      { label: 'Human Species', code: '\\textit{Homo sapiens}' },
      { label: 'E. Coli Bacterium', code: '\\textit{Escherichia coli}' },
      { label: 'Monohybrid Cross', code: 'Aa \\times Aa \\longrightarrow 1 \\text{AA} : 2 \\text{Aa} : 1 \\text{aa}' },
      { label: 'Dihybrid Ratio', code: '9 : 3 : 3 : 1' },
      { label: 'Respiration Equation', code: '\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\longrightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{ATP}' },
      { label: 'DNA Base Pairing', code: '\\text{A} \\equiv \\text{T}, \\quad \\text{C} \\equiv \\text{G}' }
    ]
  };

  const handleInsertPreset = (code: string) => {
    setLatexInput(code);
  };

  const handleSave = () => {
    if (latexInput.trim()) {
      onInsert(latexInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-[#002147] to-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b border-[#D4AF37]/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg font-bold">STEM Equation & Symbol Editor</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DOMAIN CATEGORY TABS */}
        <div className="flex bg-slate-100 border-b border-slate-200 p-1.5 gap-1 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('math')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === 'math' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4 text-[#D4AF37]" />
            <span>Mathematics</span>
          </button>
          <button
            onClick={() => setActiveTab('chemistry')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === 'chemistry' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Atom className="w-4 h-4 text-emerald-400" />
            <span>Chemistry</span>
          </button>
          <button
            onClick={() => setActiveTab('physics')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === 'physics' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Physics</span>
          </button>
          <button
            onClick={() => setActiveTab('biology')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition ${
              activeTab === 'biology' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Dna className="w-4 h-4 text-rose-400" />
            <span>Biology</span>
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* PRESETS LIST */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Quick Preset / Template:
            </label>
            <div className="flex flex-wrap gap-2">
              {presets[activeTab].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleInsertPreset(p.code)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-medium transition border border-slate-200 flex items-center gap-1.5"
                >
                  <Code className="w-3.5 h-3.5 text-slate-400" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* LATEX INPUT */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              LaTeX Code:
            </label>
            <textarea
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              rows={3}
              placeholder="e.g. x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
              className="w-full font-mono text-sm p-3 bg-slate-900 text-emerald-300 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
            />
          </div>

          {/* LIVE KA TEX RENDER PREVIEW */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Rendered Preview:
            </span>
            <div className="min-h-[60px] flex items-center justify-center bg-white p-4 rounded-xl border border-slate-200 shadow-inner">
              <MathFormulaRenderer latex={latexInput} inline={false} />
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-[#002147] hover:bg-[#0b3c5d] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 border border-[#D4AF37]/40"
          >
            <Check className="w-4 h-4 text-[#D4AF37]" />
            <span>Insert Equation</span>
          </button>
        </div>
      </div>
    </div>
  );
};
