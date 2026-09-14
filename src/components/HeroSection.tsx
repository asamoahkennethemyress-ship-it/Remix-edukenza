import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMarketing } from '../context/MarketingContext';
import { 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Sparkles, 
  BarChart2, 
  CheckCircle,
  School,
  TrendingUp,
  Award,
  BellRing
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const { setActiveView } = useAuth();
  const { marketingContent } = useMarketing();
  const { hero } = marketingContent;
  const [activeTabPreview, setActiveTabPreview] = useState<'academics' | 'finance' | 'ai'>('academics');

  if (hero?.enabled === false) return null;

  return (
    <section className="relative overflow-hidden bg-slate-50 text-slate-900 pt-10 pb-16 lg:pt-14 lg:pb-20">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Headline, Subtitle & Core Cards */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Headline */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-extrabold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                {hero.badgeText || 'Next-Gen Multi-School SaaS Architecture'}
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-black text-[#002147] leading-tight tracking-tight">
                {hero.headline}
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl font-normal leading-relaxed">
                {hero.subtitle}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-1">
              <button
                onClick={() => setActiveView('features')}
                className="px-8 py-3.5 bg-[#002147] hover:bg-[#003366] text-white font-bold rounded-lg shadow-xl transition-all flex items-center gap-2 cursor-pointer text-sm uppercase tracking-wider"
              >
                <span>{hero.primaryCtaText === 'Start Free Trial' ? 'Explore Features' : (hero.primaryCtaText || 'Explore Features')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveView('login')}
                className="px-8 py-3.5 border-2 border-[#002147] text-[#002147] hover:bg-[#002147] hover:text-white font-bold rounded-lg transition-all text-sm uppercase tracking-wider cursor-pointer"
              >
                {hero.secondaryCtaText || 'Login Portal'}
              </button>
            </div>

            {/* High Density Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              
              {/* Card 1: Core Modules */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-[#002147] font-bold text-xs uppercase mb-3 border-b border-slate-100 pb-2 flex items-center gap-2 tracking-wider">
                  <span className="w-2 h-2 bg-[#D4AF37] rounded-full"></span> Core SaaS Modules
                </h3>
                <ul className="grid grid-cols-2 gap-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-center gap-1.5 text-[#002147]">✓ Student Records</li>
                  <li className="flex items-center gap-1.5 text-[#002147]">✓ Educator Portal</li>
                  <li className="flex items-center gap-1.5 text-[#002147]">✓ Parent Network</li>
                  <li className="flex items-center gap-1.5 text-[#002147]">✓ Live Attendance</li>
                  <li className="flex items-center gap-1.5 text-[#002147]">✓ Fee Collection</li>
                  <li className="flex items-center gap-1.5 text-[#002147]">✓ Gemini AI Tutor</li>
                </ul>
              </div>

              {/* Card 2: How It Works Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-[#002147] font-bold text-xs uppercase mb-3 border-b border-slate-100 pb-2 flex items-center gap-2 tracking-wider">
                  <span className="w-2 h-2 bg-[#D4AF37] rounded-full"></span> 3-Step Setup
                </h3>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-black italic text-xs">01.</span>
                    <p className="text-xs font-medium text-slate-600">Register institution & cloud tenant</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-black italic text-xs">02.</span>
                    <p className="text-xs font-medium text-slate-600">Configure grade levels & departments</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-black italic text-xs">03.</span>
                    <p className="text-xs font-medium text-slate-600">Invite teachers, students & parents</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Metrics Footer Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs text-slate-700">
              <div>
                <span className="text-[#002147] font-black text-lg">250+</span>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Schools</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[#002147] font-black text-lg">120k+</span>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Users Connected</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[#D4AF37] font-black text-lg">99.9%</span>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">System Uptime</p>
              </div>
            </div>

          </div>

          {/* Right Column: Live Interactive Preview Box in High Density Theme */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Live Interactive Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
              
              <div className="bg-[#002147] p-4 text-white flex items-center justify-between border-b-2 border-[#D4AF37]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#D4AF37] text-[#002147] font-extrabold flex items-center justify-center text-xs">
                    S
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">ARISING START Academy</h3>
                    <p className="text-[10px] text-[#D4AF37] font-semibold">Active SaaS Tenant ID: #4802</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-500/20 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cloud Active</span>
                </div>
              </div>

              <div className="p-5 space-y-4 bg-slate-50">
                
                {/* Tab Switcher inside Illustration */}
                <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setActiveTabPreview('academics')}
                    className={`py-1.5 rounded font-bold uppercase text-[11px] transition ${
                      activeTabPreview === 'academics'
                        ? 'bg-[#002147] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Academics
                  </button>
                  <button
                    onClick={() => setActiveTabPreview('finance')}
                    className={`py-1.5 rounded font-bold uppercase text-[11px] transition ${
                      activeTabPreview === 'finance'
                        ? 'bg-[#002147] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Finance
                  </button>
                  <button
                    onClick={() => setActiveTabPreview('ai')}
                    className={`py-1.5 rounded font-bold uppercase text-[11px] transition ${
                      activeTabPreview === 'ai'
                        ? 'bg-[#002147] text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    AI Tutor
                  </button>
                </div>

                {/* Tab Content Display */}
                {activeTabPreview === 'academics' && (
                  <div className="space-y-3">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-[#002147]/10 text-[#002147]">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 uppercase font-bold">Daily Attendance</p>
                          <p className="text-base font-black text-[#002147]">96.4% <span className="text-xs text-emerald-600 font-bold">+2.1%</span></p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-[#D4AF37] text-[#002147] px-2 py-0.5 rounded uppercase">Grades 10-12</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700 font-bold">Mathematics Exam Pass Rate</span>
                        <span className="text-[#002147] font-black">88.5%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#002147] h-full w-[88.5%]" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTabPreview === 'finance' && (
                  <div className="space-y-3">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase font-bold">Term 2 Fee Collection</p>
                        <p className="text-lg font-black text-[#002147]">$84,250 <span className="text-xs text-slate-400 font-semibold">/ $92k</span></p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-semibold">Automated Parent Statements</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">142 Sent</span>
                    </div>
                  </div>
                )}

                {activeTabPreview === 'ai' && (
                  <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#002147] uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>Gemini AI Tutor Integration</span>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 italic leading-relaxed">
                      "Generated 24 physics quiz questions and assisted 42 students with step-by-step math solutions today."
                    </p>
                  </div>
                )}

              </div>

              {/* Card Footer Banner */}
              <div className="bg-[#002147] p-3 text-white text-xs flex items-center justify-between border-t border-slate-800">
                <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Enterprise End-To-End Encryption</span>
                <span className="text-[10px] text-[#D4AF37] font-bold uppercase">POPIA & GDPR Certified</span>
              </div>

            </div>

            {/* Side Highlights Box */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white border border-[#D4AF37]/40 rounded-lg shadow-sm">
                <p className="text-[10px] uppercase font-bold text-[#002147] mb-0.5 italic">Secure Cloud</p>
                <p className="text-[11px] text-slate-600 font-medium">100% data encryption for all academic records.</p>
              </div>
              <div className="p-3 bg-white border border-[#D4AF37]/40 rounded-lg shadow-sm">
                <p className="text-[10px] uppercase font-bold text-[#002147] mb-0.5 italic">Instant Reporting</p>
                <p className="text-[11px] text-slate-600 font-medium">Generate term report cards and analytics in seconds.</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
