import React from 'react';
import { useMarketing } from '../context/MarketingContext';
import { CheckCircle2, ShieldCheck, Sparkles, School } from 'lucide-react';

export const AboutSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const { about } = marketingContent;

  if (about?.enabled === false) return null;

  const highlights = about?.highlights || [
    'Engineered for single-campus schools & multi-campus institutional boards',
    'Strict multi-tenant security partition ensuring zero cross-school data leaks',
    'Unified cloud ecosystem uniting students, teachers, parents, and admins',
    'Offline-first synchronization layer resilient to internet interruptions'
  ];

  return (
    <section id="about" className="py-16 bg-white text-slate-900 relative border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Content */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
              {about?.badgeText || 'About EDUkenZA'}
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#002147] leading-tight">
              {about?.title || 'Next-Gen Multi-School SaaS Architecture'}
            </h2>

            {about?.subtitle && (
              <p className="text-base font-semibold text-amber-600">
                {about.subtitle}
              </p>
            )}

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {about?.description}
            </p>

            {/* Highlights bullet points */}
            <div className="space-y-3 pt-2">
              {highlights.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#002147]/10 text-[#002147] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#002147]" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Imagery */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-[#002147]/10 group">
              <img
                src={about?.imageUrl || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=80'}
                alt={about?.title || 'About EDUkenZA'}
                className="w-full h-80 sm:h-96 object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002147]/80 via-transparent to-transparent flex items-end p-6">
                <div className="text-white space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                    Enterprise-Grade Platform
                  </div>
                  <div className="text-base font-black">
                    Scalable, Multi-Tenant Cloud Architecture
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
