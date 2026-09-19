import React from 'react';
import { useMarketing } from '../context/MarketingContext';
import { 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  ShieldCheck, 
  FileCheck,
  CheckCircle,
  Zap,
  Award,
  Sparkles
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Clock: <Clock className="w-5 h-5 text-amber-400" />,
  MessageSquare: <MessageSquare className="w-5 h-5 text-amber-400" />,
  TrendingUp: <TrendingUp className="w-5 h-5 text-amber-400" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-amber-400" />,
  FileCheck: <FileCheck className="w-5 h-5 text-amber-400" />,
  Zap: <Zap className="w-5 h-5 text-amber-400" />,
  Award: <Award className="w-5 h-5 text-amber-400" />,
  Sparkles: <Sparkles className="w-5 h-5 text-amber-400" />,
};

export const BenefitsSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const { benefits } = marketingContent;

  if (benefits?.enabled === false) return null;

  const items = benefits?.items || [];

  return (
    <section id="benefits" className="py-16 bg-slate-50 text-slate-900 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="scroll-reveal text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            {benefits?.badgeText || 'Institutional Growth & Efficiency'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#002147]">
            {benefits?.title || 'Why Schools Choose EDUkenZA'}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            {benefits?.subtitle || 'Engineered to remove operational bottlenecks, improve parent trust, and boost student academic outcomes.'}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((benefit, idx) => {
            const staggerDelay = idx % 3 === 0 ? '' : idx % 3 === 1 ? 'delay-100' : 'delay-200';
            return (
              <div
                key={benefit.id || benefit.title || idx}
                className={`scroll-reveal ${staggerDelay} card-hover-lift bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-[#002147]/30 flex flex-col justify-between group cursor-default`}
              >
                <div className="space-y-4">
                  
                  {/* Top Icon & Metric Pill */}
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#002147] text-[#D4AF37] flex items-center justify-center font-bold shadow-sm transition-transform duration-200 group-hover:scale-105">
                      {benefit.iconName && ICON_MAP[benefit.iconName] 
                        ? ICON_MAP[benefit.iconName] 
                        : <CheckCircle className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-[#002147]">{benefit.metric}</span>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{benefit.metricLabel}</p>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-[#002147] group-hover:text-amber-600 transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
