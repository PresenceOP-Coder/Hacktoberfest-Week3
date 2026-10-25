import React, { useState, useEffect } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PresenceProps {
  show: boolean;
  children: React.ReactNode;
  exitDurationMs?: number;
  className?: string;
  style?: React.CSSProperties;
  exitAnimation?: 'fadeOut' | 'collapseOut' | 'shrinkOut';
}

export const Presence: React.FC<PresenceProps> = ({
  show,
  children,
  exitDurationMs = 250,
  className = '',
  style,
  exitAnimation = 'fadeOut',
}) => {
  const reducedMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(show);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      if (reducedMotion) {
        setShouldRender(false);
        setIsExiting(false);
      } else {
        setIsExiting(true);
        const timer = setTimeout(() => {
          setShouldRender(false);
          setIsExiting(false);
        }, exitDurationMs);
        return () => clearTimeout(timer);
      }
    }
  }, [show, shouldRender, exitDurationMs, reducedMotion]);

  if (!shouldRender) return null;

  let animationStyle: React.CSSProperties = {};

  if (!reducedMotion) {
    if (isExiting) {
      if (exitAnimation === 'shrinkOut') {
        animationStyle = {
          opacity: 0,
          transform: 'scale(0.85) translateY(-8px)',
          transition: `opacity ${exitDurationMs}ms var(--ease-out), transform ${exitDurationMs}ms var(--ease-out)`,
          pointerEvents: 'none',
        };
      } else {
        animationStyle = {
          opacity: 0,
          transform: 'translateY(-6px)',
          transition: `opacity ${exitDurationMs}ms var(--ease-out), transform ${exitDurationMs}ms var(--ease-out)`,
          pointerEvents: 'none',
        };
      }
    } else {
      animationStyle = {
        animation: `fadeUp var(--m-base) var(--ease-out) forwards`,
      };
    }
  }

  return (
    <div
      className={className}
      style={{
        ...style,
        ...animationStyle,
        willChange: isExiting ? 'transform, opacity' : 'auto',
      }}
    >
      {children}
    </div>
  );
};
