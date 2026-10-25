import React from 'react';
import { useInView } from '../../hooks/useInView';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface RevealProps {
  children: React.ReactNode;
  delayMs?: number;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'section' | 'span' | 'article' | 'p';
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  delayMs = 0,
  durationMs = 250,
  className = '',
  style,
  as = 'div',
}) => {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1, triggerOnce: true });
  const reducedMotion = useReducedMotion();

  const Component = as as any;

  if (reducedMotion) {
    return (
      <Component className={className} style={style}>
        {children}
      </Component>
    );
  }

  const animationStyle: React.CSSProperties = {
    opacity: inView ? 1 : 0,
    transform: inView ? 'translateY(0)' : 'translateY(8px)',
    transition: `opacity ${durationMs}ms var(--ease-out) ${delayMs}ms, transform ${durationMs}ms var(--ease-out) ${delayMs}ms`,
    willChange: inView ? 'auto' : 'transform, opacity',
    ...style,
  };

  return (
    <Component ref={ref} className={className} style={animationStyle}>
      {children}
    </Component>
  );
};
