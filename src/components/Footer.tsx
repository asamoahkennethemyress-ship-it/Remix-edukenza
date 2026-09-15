import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useMarketing } from '../context/MarketingContext';
import { ActiveView } from '../types';
import { 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  ShieldCheck,
  Heart
} from 'lucide-react';
import { BrandLogo } from './brand/BrandLogo';

export const Footer: React.FC = () => {
  const { setActiveView, setActiveModal } = useAuth();
  const { marketingContent } = useMarketing();
  const { contactInfo, footer, branding } = marketingContent;

  const handleNav = (view: ActiveView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#002147] text-slate-300 border-t-4 border-[#D4AF37] pt-12 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-3">
            <div 
              onClick={() => handleNav('home')}
              className="inline-flex items-center gap-2 cursor-pointer group"
            >
              <BrandLogo variant="full-dark" size="lg" showTagline={true} />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Empowering schools with smarter management. The all-in-one cloud platform for students, teachers, parents, and school administrators across Africa and worldwide.
            </p>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{contactInfo.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{contactInfo.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>{contactInfo.address}</span>
              </div>
              {contactInfo.supportHours && (
                <div className="flex items-center gap-2 text-slate-400 pt-1">
                  <span className="text-[#D4AF37] font-bold">Hours:</span>
                  <span>{contactInfo.supportHours}</span>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            {contactInfo.socialMedia && (
              <div className="flex items-center gap-3 pt-2">
                {contactInfo.socialMedia.facebook && (
                  <a href={contactInfo.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition text-xs font-bold">
                    FB
                  </a>
                )}
                {contactInfo.socialMedia.twitter && (
                  <a href={contactInfo.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition text-xs font-bold">
                    X
                  </a>
                )}
                {contactInfo.socialMedia.linkedin && (
                  <a href={contactInfo.socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition text-xs font-bold">
                    IN
                  </a>
                )}
                {contactInfo.socialMedia.instagram && (
                  <a href={contactInfo.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition text-xs font-bold">
                    IG
                  </a>
                )}
                {contactInfo.socialMedia.youtube && (
                  <a href={contactInfo.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#D4AF37] transition text-xs font-bold">
                    YT
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">Platform Links</p>
            <ul className="space-y-1.5 text-xs font-semibold">
              {footer.quickLinks.map((ql) => (
                <li key={ql.id}>
                  <button onClick={() => handleNav(ql.url as ActiveView)} className="hover:text-[#D4AF37] transition cursor-pointer">
                    {ql.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Company */}
          <div className="space-y-2.5">
            <p className="text-xs font-black text-[#D4AF37] uppercase tracking-wider">Company & Legal</p>
            <ul className="space-y-1.5 text-xs font-semibold">
              <li>
                <button onClick={() => setActiveModal('contact')} className="hover:text-[#D4AF37] transition cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('contact')} className="hover:text-[#D4AF37] transition cursor-pointer">
                  Contact Support
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('privacy')} className="hover:text-[#D4AF37] transition cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => setActiveModal('terms')} className="hover:text-[#D4AF37] transition cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold mt-2 border border-[#D4AF37]/30">
                  <ShieldCheck className="w-3 h-3" /> GDPR & POPIA Compliant
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} EDUkenZA SaaS Platform. All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            <span>Built with enterprise care for schools globally.</span>
          </p>
        </div>

      </div>
    </footer>
  );
};
