import React, { useEffect, useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms: 0, 75, 150, 225, 300, 400
  threshold?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  threshold = 0.08,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        el.classList.add('is-visible');
        return;
      }
    }

    // Check if already in viewport
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < windowHeight - 20) {
      el.classList.add('is-visible');
      return;
    }

    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              el.classList.add('is-visible');
              if (observer) observer.unobserve(el);
            }
          });
        },
        {
          rootMargin: '0px 0px -20px 0px',
          threshold,
        }
      );
      observer.observe(el);
    } catch {
      el.classList.add('is-visible');
    }

    // Safety timeout
    const fallbackTimer = setTimeout(() => {
      if (el) el.classList.add('is-visible');
    }, 1200);

    return () => {
      clearTimeout(fallbackTimer);
      if (observer) observer.disconnect();
    };
  }, [threshold]);

  const delayStyle: React.CSSProperties = delay > 0 ? { transitionDelay: `${delay}ms` } : {};

  return (
    <div
      ref={ref}
      style={delayStyle}
      className={`scroll-reveal ${className}`}
    >
      {children}
    </div>
  );
};
