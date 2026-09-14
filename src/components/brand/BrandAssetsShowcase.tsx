import React, { useState } from 'react';
import { BrandLogo, LogoVariant } from './BrandLogo';
import { 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Palette, 
  Layout, 
  Smartphone,
  Eye,
  FileCode2,
  X
} from 'lucide-react';

interface BrandAssetsShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const BrandAssetsShowcase: React.FC<BrandAssetsShowcaseProps> = ({ isOpen, onClose, showToast }) => {
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'vector' | 'guidelines'>('all');

  if (!isOpen) return null;

  const logoVariants: {
    id: LogoVariant;
    title: string;
    description: string;
    bgClass: string;
    showcaseProps: any;
    recommendedUse: string;
  }[] = [
    {
      id: 'full-light',
      title: '1. Full Logo with Text (Light Canvas)',
      description: 'Primary master logo for light backgrounds, website headers, email footers, and official correspondence.',
      bgClass: 'bg-white border-slate-200 text-slate-900',
      showcaseProps: { variant: 'full-light', size: 'lg', showTagline: true },
      recommendedUse: 'Websites, Reports, Invoices, Certificates'
    },
    {
      id: 'app-icon',
      title: '2. App Icon Only',
      description: 'Square standalone emblem representation for mobile home screens, favicons, app store listings, and avatar badges.',
      bgClass: 'bg-slate-50 border-slate-200 text-slate-900',
      showcaseProps: { variant: 'app-icon', size: 'xl' },
      recommendedUse: 'Mobile App Icon, Favicon, Social Avatars'
    },
    {
      id: 'full-dark',
      title: '3. Dark Background Version',
      description: 'High-contrast enterprise dark variant designed specifically for dark-mode interfaces, navigation banners, and video overlays.',
      bgClass: 'bg-[#002147] border-[#00152e] text-white',
      showcaseProps: { variant: 'full-dark', size: 'lg', showTagline: true },
      recommendedUse: 'Dark Mode UI, Header Navigation, Video Intros'
    },
    {
      id: 'monochrome-light',
      title: '4. Light Monochrome Version',
      description: 'Single-color solid black/navy vector rendering for single-color print, stamps, watermark overlays, and physical signage.',
      bgClass: 'bg-slate-100 border-slate-300 text-slate-900',
      showcaseProps: { variant: 'monochrome-light', size: 'lg', showTagline: true },
      recommendedUse: 'Paper Print, Thermal Printing, Stamps, Watermarks'
    },
    {
      id: 'monochrome-dark',
      title: '5. Dark Monochrome Version',
      description: 'Pure white silhouette vector rendering for dark single-color prints, embroidered apparel, and laser engraving.',
      bgClass: 'bg-slate-950 border-slate-800 text-white',
      showcaseProps: { variant: 'monochrome-dark', size: 'lg', showTagline: true },
      recommendedUse: 'Dark Apparel, Laser Engraving, Embossing'
    }
  ];

  const handleCopySvg = (variantId: string) => {
    // Generate clean SVG markup for copy
    const svgContent = `<svg width="240" height="60" viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg">
  <!-- EDUkenZA Brand Logo Vector Asset (${variantId}) -->
  <rect width="240" height="60" fill="${variantId.includes('dark') ? '#002147' : '#FFFFFF'}" rx="8"/>
  <text x="70" y="38" font-family="Inter, sans-serif" font-weight="900" font-size="24" fill="${variantId.includes('dark') ? '#FFFFFF' : '#0B1F3A'}">EDU<tspan fill="#2563EB">kenZA</tspan></text>
  <circle cx="188" cy="22" r="3.5" fill="#FBBF24"/>
</svg>`;

    navigator.clipboard.writeText(svgContent);
    setCopiedVariant(variantId);
    if (showToast) showToast(`Copied ${variantId} SVG markup to clipboard!`, 'success');

    setTimeout(() => {
      setCopiedVariant(null);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#002147] text-white p-6 border-b-4 border-[#D4AF37] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#D4AF37] text-[#002147] rounded-xl font-black">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black tracking-tight">EDUkenZA Commercial Brand & Logo Assets</h2>
            </div>
            <p className="text-xs text-slate-300">
              Official vector technology brand mark, color palette specifications, and multi-variant production assets.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          
          {/* Brand Philosophy Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-[#002147] text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h3 className="text-sm font-extrabold text-[#D4AF37] uppercase tracking-wider">Logo Concept & Symbolism</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The EDUkenZA mark combines an abstract geometric letter <strong className="text-white">"E"</strong> with interconnected network nodes and an open book silhouette — reflecting digital intelligence, continuous learning pathways, and connected educational communities across Africa.
              </p>
            </div>
            
            {/* Color Palette Pill */}
            <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl border border-white/10 shrink-0">
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-[#0B1F3A] border border-white/20 shadow-sm" />
                <span className="text-[9px] font-mono text-slate-300 mt-1">#0B1F3A</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-[#2563EB] border border-white/20 shadow-sm" />
                <span className="text-[9px] font-mono text-slate-300 mt-1">#2563EB</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-[#FBBF24] border border-white/20 shadow-sm" />
                <span className="text-[9px] font-mono text-slate-300 mt-1">#FBBF24</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="w-6 h-6 rounded-full bg-white border border-slate-300 shadow-sm" />
                <span className="text-[9px] font-mono text-slate-300 mt-1">#FFFFFF</span>
              </div>
            </div>
          </div>

          {/* 5 Required Logo Versions Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Official 5 Brand Logo Specifications</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {logoVariants.map((item) => (
                <div 
                  key={item.id}
                  className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between gap-4 transition hover:shadow-md ${item.bgClass}`}
                >
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                      {item.title}
                    </div>
                    
                    {/* Visual Preview */}
                    <div className="py-6 flex items-center justify-center border border-dashed border-current/20 rounded-xl bg-black/5 dark:bg-white/5">
                      <BrandLogo {...item.showcaseProps} />
                    </div>

                    <p className="text-xs opacity-90 leading-relaxed pt-1">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-current/10 space-y-2">
                    <div className="text-[10px] font-mono opacity-75">
                      <strong>Best Use:</strong> {item.recommendedUse}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopySvg(item.id)}
                      className="w-full py-2 bg-current/10 hover:bg-current/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-current/20"
                    >
                      {copiedVariant === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Markup Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Vector SVG</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Trademark & Brand Identity Reserved by EDUkenZA SaaS Platform</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#002147] hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow"
          >
            Close Brand Guidelines
          </button>
        </div>

      </div>
    </div>
  );
};
