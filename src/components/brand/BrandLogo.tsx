import React, { useState } from 'react';
import { useMarketing } from '../../context/MarketingContext';

export type LogoVariant = 
  | 'full-light' 
  | 'full-dark' 
  | 'app-icon' 
  | 'monochrome-light' 
  | 'monochrome-dark';

export interface BrandLogoProps {
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  height?: number;
  className?: string;
  showTagline?: boolean;
  overrideLogoUrl?: string;
  overrideWebsiteName?: string;
}

/**
 * Premium Enterprise SaaS Brand Logo for EDUkenZA
 * Palette:
 * - Deep Navy: #0B1F3A
 * - Technology Blue: #2563EB
 * - Achievement Gold: #FBBF24
 * - Clean White: #FFFFFF
 */
export const BrandLogoSymbol: React.FC<{ sizePx?: number; monochrome?: boolean; darkBg?: boolean }> = ({ 
  sizePx = 40, 
  monochrome = false,
  darkBg = false 
}) => {
  const iconId = React.useId();

  // Colors based on theme
  const navyColor = monochrome ? (darkBg ? '#FFFFFF' : '#0B1F3A') : '#0B1F3A';
  const blueColor = monochrome ? (darkBg ? '#FFFFFF' : '#0B1F3A') : '#2563EB';
  const goldColor = monochrome ? (darkBg ? '#FFFFFF' : '#0B1F3A') : '#FBBF24';
  const bgOverlay = darkBg ? '#0B1F3A' : '#FFFFFF';

  return (
    <svg 
      width={sizePx} 
      height={sizePx} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200"
    >
      <defs>
        <linearGradient id={`${iconId}-blue-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={monochrome ? blueColor : "#3B82F6"} />
          <stop offset="100%" stopColor={monochrome ? blueColor : "#1D4ED8"} />
        </linearGradient>

        <linearGradient id={`${iconId}-gold-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={monochrome ? goldColor : "#F59E0B"} />
          <stop offset="100%" stopColor={monochrome ? goldColor : "#FBBF24"} />
        </linearGradient>

        <filter id={`${iconId}-shadow`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Rounded Symbol Container Backdrop */}
      <rect 
        x="2" 
        y="2" 
        width="96" 
        height="96" 
        rx="24" 
        fill={darkBg ? "#001733" : "#F8FAFC"} 
        stroke={darkBg ? "#1E293B" : "#E2E8F0"} 
        strokeWidth="2" 
      />

      {/* Modern 'E' Symbol Structure (Book Pages + Tech Network Nodes) */}
      <g filter={`url(#${iconId}-shadow)`}>
        {/* Top bar of 'E' - Learning Pathway Arc */}
        <path 
          d="M 24 28 C 24 28, 45 22, 74 28 L 74 38 C 48 34, 34 38, 34 38 L 34 28 Z" 
          fill={navyColor} 
        />

        {/* Vertical Spine of 'E' - Foundation Pillar */}
        <path 
          d="M 24 24 L 35 24 L 35 76 L 24 76 Z" 
          fill={`url(#${iconId}-blue-grad)`} 
          rx="2"
        />

        {/* Middle Bar of 'E' - Connected Node Bridge */}
        <path 
          d="M 34 47 L 66 47 C 68 47, 70 49, 70 51 L 70 53 C 70 55, 68 57, 66 57 L 34 57 Z" 
          fill={`url(#${iconId}-gold-grad)`} 
        />

        {/* Bottom bar of 'E' - Open Book Base */}
        <path 
          d="M 34 66 C 34 66, 48 70, 76 66 L 76 74 C 45 80, 24 74, 24 74 L 24 66 Z" 
          fill={`url(#${iconId}-blue-grad)`} 
        />

        {/* Connected Technology Nodes (Dots & Lines) */}
        {!monochrome && (
          <>
            {/* Top Node */}
            <circle cx="74" cy="33" r="5" fill="#FBBF24" stroke="#0B1F3A" strokeWidth="2" />
            {/* Middle Node */}
            <circle cx="66" cy="52" r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Bottom Node */}
            <circle cx="76" cy="70" r="5" fill="#10B981" stroke="#0B1F3A" strokeWidth="2" />
            {/* Connecting pulse line */}
            <path d="M 74 38 L 66 47.5" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="2 2" />
            <path d="M 66 56.5 L 76 65" stroke="#10B981" strokeWidth="1.5" strokeDasharray="2 2" />
          </>
        )}
      </g>
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full-light',
  size = 'md',
  height,
  className = '',
  showTagline = false,
  overrideLogoUrl,
  overrideWebsiteName,
}) => {
  const [imageError, setImageError] = useState(false);

  // Safely consume marketing context if available
  let marketingContent: any = null;
  try {
    const ctx = useMarketing();
    marketingContent = ctx?.marketingContent;
  } catch {
    // Outside MarketingProvider, use fallbacks
  }

  const effectiveLogoUrl = overrideLogoUrl !== undefined 
    ? overrideLogoUrl 
    : (marketingContent?.branding?.logoUrl || '');

  const effectiveName = overrideWebsiteName !== undefined 
    ? overrideWebsiteName 
    : (marketingContent?.websiteName || 'EDUkenZA');

  // Determine pixel size
  let pxSize = 40;
  if (height) {
    pxSize = height;
  } else if (size === 'sm') {
    pxSize = 32;
  } else if (size === 'md') {
    pxSize = 42;
  } else if (size === 'lg') {
    pxSize = 56;
  } else if (size === 'xl') {
    pxSize = 72;
  }

  const isDark = variant === 'full-dark' || variant === 'monochrome-dark';
  const isMonochrome = variant === 'monochrome-light' || variant === 'monochrome-dark';
  const isIconOnly = variant === 'app-icon';

  const eduTextColor = isDark 
    ? '#FFFFFF' 
    : isMonochrome 
      ? '#0B1F3A' 
      : '#0B1F3A';

  const kenZaTextColor = isMonochrome
    ? (isDark ? '#FFFFFF' : '#0B1F3A')
    : '#2563EB';

  const goldDotColor = isMonochrome
    ? (isDark ? '#FFFFFF' : '#0B1F3A')
    : '#FBBF24';

  const hasCustomLogo = Boolean(effectiveLogoUrl && !imageError);

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* If custom published logo exists and loads successfully */}
      {hasCustomLogo ? (
        <img
          src={effectiveLogoUrl}
          alt={effectiveName}
          onError={() => setImageError(true)}
          style={{ height: `${pxSize}px`, maxWidth: `${pxSize * 3.5}px` }}
          className="object-contain rounded select-none shrink-0"
          referrerPolicy="no-referrer"
        />
      ) : (
        /* Professional SVG Emblem Fallback */
        <BrandLogoSymbol 
          sizePx={pxSize} 
          monochrome={isMonochrome} 
          darkBg={isDark} 
        />
      )}

      {/* Typography (Only if not app-icon variant) */}
      {!isIconOnly && (
        <div className="flex flex-col justify-center leading-none">
          {/* If the user customized the brand name, display custom name; else display default EDUkenZA styling */}
          {effectiveName && effectiveName.toLowerCase() !== 'edukenza' ? (
            <span
              style={{
                color: eduTextColor,
                fontSize: `${Math.max(14, pxSize * 0.48)}px`,
                letterSpacing: '-0.02em',
                fontWeight: 900,
              }}
              className="tracking-tight font-black uppercase font-sans truncate max-w-[240px]"
            >
              {effectiveName}
            </span>
          ) : (
            <div className="flex items-center text-slate-900 tracking-tight font-black uppercase font-sans">
              <span 
                style={{ 
                  color: eduTextColor, 
                  fontSize: `${pxSize * 0.52}px`,
                  letterSpacing: '-0.02em',
                  fontWeight: 900
                }}
              >
                EDU
              </span>
              <span 
                style={{ 
                  color: kenZaTextColor, 
                  fontSize: `${pxSize * 0.52}px`,
                  letterSpacing: '-0.01em',
                  fontWeight: 800
                }}
              >
                kenZA
              </span>
              <span 
                className="inline-block rounded-full ml-0.5"
                style={{ 
                  backgroundColor: goldDotColor, 
                  width: `${Math.max(4, pxSize * 0.12)}px`, 
                  height: `${Math.max(4, pxSize * 0.12)}px` 
                }} 
              />
            </div>
          )}

          {showTagline && (
            <span 
              className={`text-[9px] font-extrabold uppercase tracking-widest mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Next-Gen EdTech SaaS
            </span>
          )}
        </div>
      )}
    </div>
  );
};
