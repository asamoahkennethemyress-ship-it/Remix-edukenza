import React, { useState } from 'react';
import { useAuth, getDashboardViewForRole } from '../context/AuthContext';
import { useMarketing } from '../context/MarketingContext';
import { isPlatformOwner } from '../utils/permissions';
import { ActiveView } from '../types';
import { 
  GraduationCap, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Sparkles,
  ShieldCheck,
  Building2,
  Palette,
  Eye,
  Send,
  ArrowRight
} from 'lucide-react';

import { NotificationBell } from './notifications/NotificationBell';
import { NotificationCenterModal } from './notifications/NotificationCenterModal';
import { BrandLogo } from './brand/BrandLogo';
import { BrandAssetsShowcase } from './brand/BrandAssetsShowcase';

export const Navbar: React.FC = () => {
  const { currentUser, activeView, setActiveView, logout, setActiveModal, showToast } = useAuth();
  const { marketingContent, isPreviewMode, togglePreviewMode, publishLive, draftContent, isSaving } = useMarketing();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isBrandShowcaseOpen, setIsBrandShowcaseOpen] = useState(false);

  // Dynamic Navigation from Marketing Content (or fallback)
  const navItems = (marketingContent?.navigation?.items || [])
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleNavClick = (view: string) => {
    setActiveView(view as ActiveView);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublishFromBanner = async () => {
    await publishLive(draftContent);
    togglePreviewMode(false);
  };

  const isOwnerUser = isPlatformOwner(currentUser);

  return (
    <header className="sticky top-0 z-50 bg-[#002147] text-white border-b-4 border-[#D4AF37] shadow-xl pt-[env(safe-area-inset-top,0px)]">
      {/* Platform Owner Draft Preview Alert Banner */}
      {isPreviewMode && isOwnerUser && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>Draft Preview Active — You are previewing unpublished marketing changes</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePublishFromBanner}
              disabled={isSaving}
              className="bg-[#002147] hover:bg-[#003366] text-white px-3 py-1 rounded text-[11px] font-bold uppercase transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3 h-3 text-[#D4AF37]" />
              <span>{isSaving ? 'Publishing...' : 'Publish Live Now'}</span>
            </button>
            <button
              onClick={() => togglePreviewMode(false)}
              className="bg-black/10 hover:bg-black/20 text-slate-950 px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer"
            >
              Exit Preview
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <BrandLogo variant="full-dark" size="md" showTagline={false} />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-bold uppercase tracking-wider">
            {navItems.map((link) => (
              <button
                key={link.id || link.view}
                onClick={() => handleNavClick(link.view)}
                className={`transition-colors py-1 border-b-2 ${
                  activeView === link.view
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-200 hover:text-[#D4AF37]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Actions / Auth */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setIsBrandShowcaseOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-amber-300 hover:text-white bg-[#001733] hover:bg-white/10 transition border border-[#D4AF37]/40 rounded-lg flex items-center gap-1.5 cursor-pointer"
              title="View EDUkenZA Brand Identity & 5 Logo Assets"
            >
              <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Brand Assets</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-3 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                <NotificationBell onOpenCenter={() => setIsNotificationCenterOpen(true)} />
                <div className="w-8 h-8 rounded-md bg-[#D4AF37] text-[#002147] flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-none">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[#D4AF37] capitalize font-medium">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const view = getDashboardViewForRole(currentUser.role, currentUser.educationCategory);
                    handleNavClick(view);
                  }}
                  className="ml-2 text-xs bg-[#D4AF37] text-[#002147] font-bold px-2.5 py-1 rounded transition hover:bg-[#c29f2e] cursor-pointer"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  title="Log out"
                  className="text-slate-300 hover:text-red-400 p-1 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('login')}
                className="px-5 py-2 text-xs uppercase font-bold text-white hover:text-[#D4AF37] bg-white/10 hover:bg-white/20 transition border border-white/20 rounded shadow-sm"
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-200 hover:text-white rounded-lg bg-[#001733] cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#001733] border-t border-[#D4AF37]/30 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-3">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full min-h-[44px] flex items-center text-left px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider cursor-pointer ${
              activeView === 'home' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-200'
            }`}
          >
            Home
          </button>
          {navItems.map((link) => (
            <button
              key={link.id || link.view}
              onClick={() => handleNavClick(link.view)}
              className={`w-full min-h-[44px] flex items-center text-left px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider cursor-pointer ${
                activeView === link.view ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-200'
              }`}
            >
              {link.label}
            </button>
          ))}
          
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
            {currentUser ? (
              <div className="bg-[#002147] p-3 rounded-lg flex items-center justify-between border border-[#D4AF37]/30">
                <div>
                  <p className="text-sm font-bold text-white">{currentUser.name}</p>
                  <p className="text-xs text-[#D4AF37] capitalize">{currentUser.role.replace('_', ' ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const view = getDashboardViewForRole(currentUser.role, currentUser.educationCategory);
                      handleNavClick(view);
                    }}
                    className="bg-[#D4AF37] text-[#002147] text-xs px-3 py-1.5 rounded font-bold"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={logout}
                    className="p-2 text-red-400 hover:bg-white/10 rounded"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleNavClick('login')}
                className="w-full py-2.5 text-center text-xs font-bold uppercase text-slate-200 border border-white/20 rounded hover:border-[#D4AF37] transition"
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />

      {/* Commercial Brand Assets Showcase Modal */}
      <BrandAssetsShowcase
        isOpen={isBrandShowcaseOpen}
        onClose={() => setIsBrandShowcaseOpen(false)}
        showToast={showToast}
      />
    </header>
  );
};
