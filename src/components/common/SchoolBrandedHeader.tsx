import React from 'react';
import { useSchoolBranding } from '../../context/SchoolBrandingContext';
import { getAccessibleTextColor } from '../../services/schoolBrandingService';
import { GraduationCap, ShieldCheck } from 'lucide-react';

export interface SchoolBrandedHeaderProps {
  portalRoleName: string;
  portalRoleBadge?: string;
  userName?: string;
  userPhotoUrl?: string;
  actions?: React.ReactNode;
  rightWidgets?: React.ReactNode;
  onOpenProfile?: () => void;
}

export const SchoolBrandedHeader: React.FC<SchoolBrandedHeaderProps> = ({
  portalRoleName,
  portalRoleBadge,
  userName,
  userPhotoUrl,
  actions,
  rightWidgets,
  onOpenProfile
}) => {
  const { 
    schoolName, 
    motto, 
    logoUrl, 
    primaryColor, 
    secondaryColor,
    academicTerm 
  } = useSchoolBranding();

  const textColor = getAccessibleTextColor(primaryColor);
  const secondaryTextColor = getAccessibleTextColor(secondaryColor);

  return (
    <header 
      className="w-full rounded-2xl sm:rounded-3xl shadow-lg border p-3.5 sm:p-5 transition-all duration-300 relative overflow-hidden"
      style={{
        backgroundColor: primaryColor || '#002147',
        borderColor: 'rgba(255,255,255,0.12)'
      }}
    >
      {/* Subtle background ambient sheen */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 -mr-20 -mt-20"
        style={{ backgroundColor: secondaryColor || '#D4AF37' }}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Section: School Identity (Logo, Name, Motto, Portal Badge) */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          
          {/* School Crest / Logo */}
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden shadow-md border-2 flex items-center justify-center shrink-0 bg-white/10"
            style={{ borderColor: secondaryColor || '#D4AF37' }}
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${schoolName} Crest`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center font-black text-sm sm:text-base select-none"
                style={{
                  backgroundColor: secondaryColor || '#D4AF37',
                  color: primaryColor || '#002147'
                }}
              >
                {schoolName?.substring(0, 2).toUpperCase() || 'EK'}
              </div>
            )}
          </div>

          {/* School Name & Motto */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
                style={{
                  backgroundColor: secondaryColor || '#D4AF37',
                  color: secondaryTextColor
                }}
              >
                {portalRoleBadge || portalRoleName}
              </span>

              {academicTerm && (
                <span 
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/15 backdrop-blur-sm border border-white/10"
                  style={{ color: textColor }}
                >
                  {academicTerm}
                </span>
              )}
            </div>

            <h1 
              className="text-base sm:text-lg md:text-xl font-black truncate leading-tight tracking-tight mt-1"
              style={{ color: textColor }}
            >
              {schoolName}
            </h1>

            {motto && (
              <p 
                className="text-[11px] sm:text-xs italic truncate opacity-85 mt-0.5 font-serif"
                style={{ color: textColor }}
              >
                &ldquo;{motto}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Right Section: Interactive Widgets & User Profile */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-3 flex-wrap">
          {actions}
          {rightWidgets}

          {/* User Avatar with Profile Hook */}
          {userName && (
            <div 
              onClick={onOpenProfile}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 transition backdrop-blur-sm ${
                onOpenProfile ? 'cursor-pointer' : ''
              }`}
              title={onOpenProfile ? 'View Profile' : undefined}
            >
              <div 
                className="w-8 h-8 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center shrink-0 font-black text-xs border"
                style={{ borderColor: secondaryColor || '#D4AF37' }}
              >
                {userPhotoUrl ? (
                  <img 
                    src={userPhotoUrl} 
                    alt={userName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span style={{ color: secondaryColor || '#D4AF37' }}>
                    {userName.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="hidden sm:block text-left truncate max-w-[120px]">
                <div 
                  className="text-xs font-black truncate leading-tight"
                  style={{ color: textColor }}
                >
                  {userName}
                </div>
                <div className="text-[10px] text-white/70 truncate">
                  {portalRoleName}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
