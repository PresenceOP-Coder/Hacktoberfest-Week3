import React from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface StaggerProps {
  children: React.ReactNode;
  delayPerItemMs?: number;
  maxStagger?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  delayPerItemMs = 40,
  maxStagger = 8,
  className = '',
  style,
}) => {
  const reducedMotion = useReducedMotion();
  const childArray = React.Children.toArray(children);

  if (reducedMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {childArray.map((child, index) => {
        // Cap stagger index at maxStagger (e.g. 8)
        const cappedIndex = Math.min(index, maxStagger);
        const delay = cappedIndex * delayPerItemMs;

        return (
          <div
            key={(child as any)?.key || index}
            style={{
              animation: `fadeUp var(--m-base) var(--ease-out) ${delay}ms both`,
              willChange: 'transform, opacity',
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};
