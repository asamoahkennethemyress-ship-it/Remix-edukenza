import React, { useState } from 'react';
import { useMarketing } from '../context/MarketingContext';
import { FeatureItem } from '../types';
import { 
  GraduationCap, 
  UserCheck, 
  Users, 
  CalendarCheck, 
  Award, 
  CreditCard, 
  Clock, 
  FileText, 
  BarChart3, 
  Sparkles,
  Check,
  Search,
  Filter,
  BookOpen,
  ShieldCheck,
  School,
  TrendingUp,
  BellRing
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap className="w-6 h-6" />,
  UserCheck: <UserCheck className="w-6 h-6" />,
  Users: <Users className="w-6 h-6" />,
  CalendarCheck: <CalendarCheck className="w-6 h-6" />,
  Award: <Award className="w-6 h-6" />,
  CreditCard: <CreditCard className="w-6 h-6" />,
  Clock: <Clock className="w-6 h-6" />,
  FileText: <FileText className="w-6 h-6" />,
  BarChart3: <BarChart3 className="w-6 h-6" />,
  Sparkles: <Sparkles className="w-6 h-6" />,
  BookOpen: <BookOpen className="w-6 h-6" />,
  ShieldCheck: <ShieldCheck className="w-6 h-6" />,
  School: <School className="w-6 h-6" />,
  TrendingUp: <TrendingUp className="w-6 h-6" />,
  BellRing: <BellRing className="w-6 h-6" />,
  Check: <Check className="w-6 h-6" />,
};

export const FeaturesSection: React.FC = () => {
  const { marketingContent } = useMarketing();
  const { features } = marketingContent;
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFeatureModal, setActiveFeatureModal] = useState<FeatureItem | null>(null);

  if (features?.enabled === false) return null;

  const categories = ['All', 'Administration', 'Academics', 'Portals', 'Analytics', 'AI Technology'];

  const featuresList = features?.items || [];

  const filteredFeatures = featuresList.filter((feature) => {
    const matchesCategory = selectedCategory === 'All' || feature.category === selectedCategory;
    const matchesSearch = feature.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          feature.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="features" className="py-16 bg-slate-50 text-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded bg-[#002147]/5 border border-[#002147]/15 text-[#002147] text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
            {features.badgeText || 'Complete Educational Ecosystem'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#002147]">
            {features.title}
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
            {features.subtitle}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#002147] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#002147] hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147]"
            />
          </div>

        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFeatures.map((feature) => (
            <div
              key={feature.id}
              className="group bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#002147]/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                
                {/* Header & Icon */}
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#002147] text-[#D4AF37] flex items-center justify-center font-bold shadow-sm">
                    {ICON_MAP[feature.iconName] || <Check className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-slate-100 text-[#002147] uppercase tracking-wider border border-slate-200">
                    {feature.category}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-lg font-bold text-[#002147] group-hover:text-[#003366] transition-colors flex items-center gap-1.5">
                    <span className="text-[#D4AF37] font-black">✓</span> {feature.title}
                  </h3>
                  <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Benefit Bullets */}
                <ul className="space-y-1.5 pt-3 border-t border-slate-100">
                  {feature.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

              </div>

              {/* Action */}
              <div className="pt-4 mt-2">
                <button
                  onClick={() => setActiveFeatureModal(feature)}
                  className="w-full text-center text-xs font-bold text-[#002147] hover:text-white py-2 rounded-lg bg-slate-100 hover:bg-[#002147] border border-slate-200 transition cursor-pointer uppercase tracking-wider"
                >
                  Explore Capabilities &rarr;
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* Feature Detail Modal */}
      {activeFeatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white border-2 border-[#002147] rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#002147] text-[#D4AF37] flex items-center justify-center font-bold">
                  {ICON_MAP[activeFeatureModal.iconName]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#002147]">{activeFeatureModal.title}</h3>
                  <p className="text-xs text-[#D4AF37] font-bold uppercase">{activeFeatureModal.category} Module</p>
                </div>
              </div>
              <button
                onClick={() => setActiveFeatureModal(null)}
                className="text-slate-500 hover:text-[#002147] p-1.5 rounded bg-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {activeFeatureModal.description}
            </p>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#002147] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                Key Module Benefits:
              </h4>
              <ul className="space-y-1.5">
                {activeFeatureModal.benefits.map((b, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-800 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveFeatureModal(null)}
                className="px-5 py-2 rounded-lg bg-[#002147] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#003366] cursor-pointer"
              >
                Got It
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
};
