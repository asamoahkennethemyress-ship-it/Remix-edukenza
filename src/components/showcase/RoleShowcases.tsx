import React from 'react';
import { useMarketing } from '../../context/MarketingContext';
import { useAuth } from '../../context/AuthContext';
import { 
  GraduationCap, 
  Users, 
  UserCheck, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Cpu 
} from 'lucide-react';

/* ==========================================================
   1. TEACHER SECTION SHOWCASE
   ========================================================== */
export const TeacherShowcaseSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const { setActiveView } = useAuth();
  const content = marketingContent.teacherSection;

  if (content?.enabled === false) return null;

  return (
    <section className="py-16 bg-slate-50 text-slate-900 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="scroll-reveal lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs font-extrabold uppercase tracking-widest">
              <GraduationCap className="w-3.5 h-3.5 text-blue-700" />
              <span>{content?.badgeText || 'Teacher Portal Showcase'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#002147] tracking-tight leading-tight">
              {content?.title}
            </h2>

            {content?.subtitle && (
              <p className="text-sm sm:text-base font-semibold text-blue-800">
                {content.subtitle}
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {content?.description}
            </p>

            <div className="space-y-2.5 pt-2">
              {(content?.highlights || []).map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-blue-700" />
                  </div>
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveView('login')}
                className="btn-interactive px-6 py-2.5 bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Access Teacher Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="scroll-reveal delay-100 lg:col-span-6">
            <div className="card-hover-lift rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl border-4 border-white bg-slate-900 group">
              <img
                src={content?.imageUrl || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1000&auto=format&fit=crop&q=80'}
                alt="Teacher Portal"
                className="w-full h-72 sm:h-84 object-cover group-hover:scale-103 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

/* ==========================================================
   2. STUDENT SECTION SHOWCASE
   ========================================================== */
export const StudentShowcaseSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const { setActiveView } = useAuth();
  const content = marketingContent.studentSection;

  if (content?.enabled === false) return null;

  return (
    <section className="py-16 bg-white text-slate-900 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="scroll-reveal lg:col-span-6 order-2 lg:order-1">
            <div className="card-hover-lift rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl border-4 border-white bg-slate-900 group">
              <img
                src={content?.imageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1000&auto=format&fit=crop&q=80'}
                alt="Student Portal"
                className="w-full h-72 sm:h-84 object-cover group-hover:scale-103 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="scroll-reveal delay-100 lg:col-span-6 space-y-5 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold uppercase tracking-widest">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>{content?.badgeText || 'Student Portal Showcase'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#002147] tracking-tight leading-tight">
              {content?.title}
            </h2>

            {content?.subtitle && (
              <p className="text-sm sm:text-base font-semibold text-emerald-800">
                {content.subtitle}
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {content?.description}
            </p>

            <div className="space-y-2.5 pt-2">
              {(content?.highlights || []).map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  </div>
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveView('login')}
                className="btn-interactive px-6 py-2.5 bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Access Student Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

/* ==========================================================
   3. PARENT SECTION SHOWCASE
   ========================================================== */
export const ParentShowcaseSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const { setActiveView } = useAuth();
  const content = marketingContent.parentSection;

  if (content?.enabled === false) return null;

  return (
    <section className="py-16 bg-slate-50 text-slate-900 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="scroll-reveal lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold uppercase tracking-widest">
              <UserCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>{content?.badgeText || 'Parent Network Showcase'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#002147] tracking-tight leading-tight">
              {content?.title}
            </h2>

            {content?.subtitle && (
              <p className="text-sm sm:text-base font-semibold text-amber-800">
                {content.subtitle}
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {content?.description}
            </p>

            <div className="space-y-2.5 pt-2">
              {(content?.highlights || []).map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-amber-700" />
                  </div>
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveView('login')}
                className="btn-interactive px-6 py-2.5 bg-[#002147] hover:bg-[#003366] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Access Parent Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="scroll-reveal delay-100 lg:col-span-6">
            <div className="card-hover-lift rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl border-4 border-white bg-slate-900 group">
              <img
                src={content?.imageUrl || 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1000&auto=format&fit=crop&q=80'}
                alt="Parent Portal"
                className="w-full h-72 sm:h-84 object-cover group-hover:scale-103 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

/* ==========================================================
   4. AI INTELLIGENCE SHOWCASE
   ========================================================== */
export const AiShowcaseSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const content = marketingContent.aiSection;

  if (content?.enabled === false) return null;

  return (
    <section className="py-16 bg-[#001733] text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div 
        aria-hidden="true"
        className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" 
      />
      <div 
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow delay-200" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="scroll-reveal lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-amber-300 text-xs font-extrabold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{content?.badgeText || 'AI-Powered Education'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              {content?.title}
            </h2>

            {content?.subtitle && (
              <p className="text-sm sm:text-base font-medium text-slate-300">
                {content.subtitle}
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {content?.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {(content?.highlights || []).map((cap, i) => (
                <div 
                  key={i} 
                  className="card-hover-lift bg-white/5 hover:bg-white/10 border border-white/10 p-3.5 rounded-xl flex items-start gap-2.5 transition-colors"
                >
                  <Cpu className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-slate-200">{cap}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="scroll-reveal delay-100 lg:col-span-5">
            <div className="card-hover-lift bg-slate-900/90 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-4 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-slate-400 ml-auto">Gemini 2.5 Flash Engine</span>
              </div>
              
              <div className="space-y-3 font-mono text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300">
                  <span className="text-amber-400 font-bold">Teacher:</span> "Generate a Form 3 Chemistry lesson plan for Periodic Trends."
                </div>
                <div className="bg-blue-950/40 p-3 rounded-lg border border-blue-900/50 text-blue-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gemini AI Tutor:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Lesson objective created: Students will predict atomic radii & ionization energy trends with 3 practice rubrics.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

/* ==========================================================
   5. REAL-TIME OPERATIONS SHOWCASE
   ========================================================== */
export const RealtimeShowcaseSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const content = marketingContent.realtimeSection;

  if (content?.enabled === false) return null;

  const metrics = content?.metrics || [];

  return (
    <section className="py-16 bg-slate-900 text-white border-b border-slate-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="scroll-reveal text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5" />
            <span>{content?.badgeText || 'Real-Time Operations'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {content?.title}
          </h2>

          <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            {content?.subtitle || content?.description}
          </p>
        </div>

        {/* Metrics 4-Col Grid with hover elevation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((m, idx) => {
            const stagger = idx % 4 === 0 ? '' : idx % 4 === 1 ? 'delay-75' : idx % 4 === 2 ? 'delay-150' : 'delay-200';
            return (
              <div 
                key={idx} 
                className={`scroll-reveal ${stagger} card-hover-lift bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-5 rounded-xl text-center space-y-2 transition-colors duration-200`}
              >
                <div className="text-2xl sm:text-3xl font-black text-[#D4AF37] tracking-tight">
                  {m.value}
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-white">
                  {m.label}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {m.desc}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

/* ==========================================================
   6. SECURITY & MULTI-TENANT ISOLATION SHOWCASE
   ========================================================== */
export const SecurityShowcaseSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const content = marketingContent.securitySection;

  if (content?.enabled === false) return null;

  const badges = content?.badges || [];

  return (
    <section className="py-16 bg-white text-slate-900 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="scroll-reveal lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>{content?.badgeText || 'Security Architecture'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#002147] tracking-tight leading-tight">
              {content?.title}
            </h2>

            {content?.subtitle && (
              <p className="text-sm sm:text-base font-semibold text-emerald-800">
                {content.subtitle}
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {content?.description}
            </p>

            <div className="space-y-3 pt-2">
              {badges.map((b, idx) => (
                <div 
                  key={idx} 
                  className="card-hover-lift flex items-start gap-3 bg-slate-50 hover:bg-slate-100 p-3 rounded-lg border border-slate-200 transition-colors"
                >
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800">{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="scroll-reveal delay-100 lg:col-span-5">
            <div className="card-hover-lift bg-[#002147] text-white p-8 rounded-2xl shadow-xl space-y-6 border-4 border-slate-100 hover:shadow-2xl transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow-md">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Hardened Rules</h3>
                  <p className="text-xs text-slate-300">Firebase Firestore & Storage</p>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 border-t border-white/10 pt-4">
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  School A records partitioned from School B
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Students cannot read grades across classes
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  All administrative mutations logged with audit trail
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
