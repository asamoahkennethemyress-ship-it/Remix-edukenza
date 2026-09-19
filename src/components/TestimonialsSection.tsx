import React from 'react';
import { useMarketing } from '../context/MarketingContext';
import { Star, Quote } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const { testimonials } = marketingContent;

  if (testimonials?.enabled === false || !testimonials || !testimonials.items || testimonials.items.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white text-slate-900 border-t border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="scroll-reveal text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            {testimonials.badgeText || 'Institutional Testimonials'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#002147]">
            {testimonials.title || 'Trusted By Leading School Leaders'}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            {testimonials.subtitle || 'Hear from principals, administrators, and teachers who transformed their educational institutions with EDUkenZA.'}
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.items.map((item, idx) => {
            const stagger = idx % 3 === 0 ? '' : idx % 3 === 1 ? 'delay-100' : 'delay-200';
            return (
              <div
                key={item.id || idx}
                className={`scroll-reveal ${stagger} card-hover-lift bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-[#002147]/20 flex flex-col justify-between relative group`}
              >
                <Quote className="w-10 h-10 text-[#D4AF37]/20 absolute top-4 right-4 group-hover:text-[#D4AF37]/40 transition-colors duration-200" />

                <div className="space-y-4">
                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-[#D4AF37]">
                    {Array.from({ length: item.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>

                  {/* Content Quote */}
                  <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed font-medium">
                    "{item.content}"
                  </p>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3 pt-6 mt-4 border-t border-slate-200">
                  <img
                    src={item.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={item.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#D4AF37] shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#002147]">{item.name}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold">{item.role} • <span className="text-[#002147] font-bold">{item.schoolName}</span></p>
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
