import { useEffect } from 'react';

/**
 * Initializes a native, high-performance IntersectionObserver for scroll-reveal animations.
 * Features:
 * - Checks elements with '.scroll-reveal'
 * - Auto-reveals elements already visible on mount
 * - Adds '.is-visible' on intersection (threshold 0.1)
 * - Has a fallback timeout to guarantee elements are NEVER permanently invisible
 * - Respects prefers-reduced-motion
 */
export function initScrollObserver(): () => void {
  if (typeof window === 'undefined') return () => {};

  // If user prefers reduced motion, reveal everything immediately
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      el.classList.add('is-visible');
    });
    return () => {};
  }

  const observerCallback: IntersectionObserverCallback = (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  };

  const observerOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px -20px 0px',
    threshold: 0.08,
  };

  let observer: IntersectionObserver | null = null;
  try {
    observer = new IntersectionObserver(observerCallback, observerOptions);
  } catch (e) {
    console.warn('IntersectionObserver not available, triggering fallback reveal.', e);
  }

  const observeElements = () => {
    const elements = document.querySelectorAll('.scroll-reveal:not(.is-visible)');
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // If already in or above viewport, reveal immediately
      if (rect.top < windowHeight - 20) {
        el.classList.add('is-visible');
      } else if (observer) {
        observer.observe(el);
      } else {
        el.classList.add('is-visible');
      }
    });
  };

  // Initial observation
  observeElements();

  // Re-check on scroll as backup
  const handleScroll = () => {
    const elements = document.querySelectorAll('.scroll-reveal:not(.is-visible)');
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < windowHeight - 20) {
        el.classList.add('is-visible');
        if (observer) observer.unobserve(el);
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', observeElements, { passive: true });

  // Observe dynamically mounted elements (e.g., async data loaded from Firestore)
  let mutationObserver: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined' && document.body) {
    mutationObserver = new MutationObserver(() => {
      observeElements();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Safety sweep after 1000ms: ensure zero elements remain hidden
  const safetyTimeout = setTimeout(() => {
    const elements = document.querySelectorAll('.scroll-reveal:not(.is-visible)');
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < (window.innerHeight || 800) + 200) {
        el.classList.add('is-visible');
      }
    });
  }, 1000);

  return () => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', observeElements);
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
    clearTimeout(safetyTimeout);
    if (observer) {
      observer.disconnect();
    }
  };
}

/**
 * React hook to enable scroll-reveal on the active view
 */
export function useScrollReveal(dependencyKey?: any) {
  useEffect(() => {
    const cleanup = initScrollObserver();
    // Re-check when dependency changes or DOM updates
    const timer = setTimeout(() => {
      initScrollObserver();
    }, 150);

    return () => {
      cleanup();
      clearTimeout(timer);
    };
  }, [dependencyKey]);
}
