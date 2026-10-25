import { useState, useEffect } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Animates a number from 0 to target over durationMs using cubic-bezier ease-out.
 * Returns final value immediately when reduced motion is on.
 */
export function useCountUp(target: number, durationMs: number = 700): number {
  const reducedMotion = useReducedMotion();
  const [current, setCurrent] = useState<number>(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion || target === 0) {
      setCurrent(target);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const easeOutCubic = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const step = (now: number) => {
      if (startTime === null) startTime = now;
      const progress = Math.min((now - startTime) / durationMs, 1);
      const easedProgress = easeOutCubic(progress);
      const nextValue = Math.round(easedProgress * target);

      setCurrent(nextValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrent(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [target, durationMs, reducedMotion]);

  return current;
}
