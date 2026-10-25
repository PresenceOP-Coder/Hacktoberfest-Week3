import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Collapse: React.FC<CollapseProps> = ({
  isOpen,
  children,
  durationMs = 250,
  className = '',
  style,
}) => {
  const reducedMotion = useReducedMotion();

  const transitionDuration = reducedMotion ? '0.01ms' : `${durationMs}ms`;

  return (
    <div
      className={`motion-collapse-container ${isOpen ? 'motion-collapse-open' : 'motion-collapse-closed'} ${className}`}
      style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: `grid-template-rows ${transitionDuration} var(--ease-out)`,
        willChange: 'grid-template-rows',
        ...style,
      }}
      aria-hidden={!isOpen}
    >
      <div
        className="motion-collapse-inner"
        style={{
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
};
