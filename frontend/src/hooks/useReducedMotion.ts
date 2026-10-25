import { useState, useEffect } from 'react';

/**
 * Hook to detect and listen for the user's OS prefers-reduced-motion preference.
 * Returns true if the user prefers reduced motion.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    // Modern browsers support addEventListener on MediaQueryList
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Set initial
    setPrefersReduced(mediaQuery.matches);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReduced;
}

/**
 * Sets up the document visibility listener to pause idle loops when the browser tab is hidden.
 */
export function setupTabVisibilityListener(): () => void {
  if (typeof document === 'undefined') return () => {};

  const handleVisibilityChange = () => {
    if (document.hidden) {
      document.documentElement.classList.add('tab-hidden');
    } else {
      document.documentElement.classList.remove('tab-hidden');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  // Initial check
  handleVisibilityChange();

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
