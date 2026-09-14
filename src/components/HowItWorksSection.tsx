import React from 'react';
import { HOW_IT_WORKS_STEPS } from '../data/landingData';
import { useAuth } from '../context/AuthContext';
import { 
  School, 
  Sliders, 
  UserPlus, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

const STEP_ICON_MAP: Record<string, React.ReactNode> = {
  School: <School className="w-8 h-8" />,
  Sliders: <Sliders className="w-8 h-8" />,
  UserPlus: <UserPlus className="w-8 h-8" />,
  CheckCircle2: <CheckCircle2 className="w-8 h-8" />,
};

export const HowItWorksSection: React.FC = () => {
  const { setActiveView, setActiveModal } = useAuth();

  return (
    <section id="how-it-works" className="py-16 bg-slate-100 text-slate-900 relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            Streamlined Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#002147]">
            How EDUkenZA Works
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            From registration to active daily school management, set up your institution in 4 simple steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          {HOW_IT_WORKS_STEPS.map((step, idx) => (
            <div
              key={step.number}
              className="relative group bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#002147]/30 transition-all flex flex-col justify-between"
            >
              
              {/* Step Number Watermark */}
              <div className="absolute top-3 right-3 text-4xl font-black text-slate-200 group-hover:text-[#D4AF37]/30 transition-colors select-none">
                {step.number}
              </div>

              <div className="space-y-4">
                
                {/* Step Badge & Icon */}
                <div className="space-y-3">
                  <span className="inline-block px-2.5 py-0.5 rounded bg-[#002147]/10 text-[#002147] text-[10px] font-extrabold tracking-wider uppercase border border-[#002147]/20">
                    {step.step}
                  </span>
                  
                  <div className="w-12 h-12 rounded-lg bg-[#002147] text-[#D4AF37] flex items-center justify-center font-bold shadow-md">
                    {STEP_ICON_MAP[step.icon]}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-bold text-[#002147] group-hover:text-[#003366] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                    {step.description}
                  </p>
                </div>

              </div>

              {/* Bottom Subtle Bar */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#002147] font-bold uppercase tracking-wider">
                <span>Phase {idx + 1} of 4</span>
                <span className="text-[#D4AF37]">✓ Active</span>
              </div>

            </div>
          ))}

        </div>

        {/* CTA Banner */}
        <div className="mt-12 bg-[#002147] text-white border-2 border-[#D4AF37] rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-xl font-bold uppercase tracking-wider text-white">Ready to transform your school?</h3>
            <p className="text-slate-300 text-xs max-w-xl">
              Contact our team to explore the complete EDUkenZA multi-school management suite for your institution.
            </p>
          </div>
          <button
            onClick={() => setActiveModal('contact')}
            className="px-6 py-3 rounded bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] font-black text-xs uppercase tracking-wider shadow-lg transition whitespace-nowrap flex items-center gap-2 cursor-pointer"
          >
            <span>Contact EdTech Team</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};
