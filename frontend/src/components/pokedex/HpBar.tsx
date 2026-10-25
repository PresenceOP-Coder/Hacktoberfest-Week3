import React, { useEffect, useState } from 'react';

interface HpBarProps {
  dueAt?: string;
  isOverdue?: boolean;
  label?: string;
  compact?: boolean;
}

function calcHpPercent(dueAt?: string, isOverdue?: boolean): number {
  if (isOverdue) return 0;
  if (!dueAt) return 100; // no deadline → full green
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const msLeft = due - now;
  if (msLeft <= 0) return 0;
  const fullMs = 48 * 60 * 60 * 1000; // 48h = full bar
  return Math.min(100, Math.round((msLeft / fullMs) * 100));
}

export const HpBar: React.FC<HpBarProps> = ({ dueAt, isOverdue, label = 'HP', compact = false }) => {
  const hp = calcHpPercent(dueAt, isOverdue);
  const noDeadline = !dueAt && !isOverdue;

  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(hp), 80);
    return () => clearTimeout(t);
  }, [hp]);

  const color =
    hp > 50 ? '#33CC33' :
    hp > 20 ? '#FFD700' :
    '#FF3333';

  const isLowHp = hp <= 20 && !noDeadline;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '4px' : '8px', minWidth: 0 }}>
      <span
        style={{
          fontFamily: 'var(--font-button)',
          fontSize: compact ? '8px' : '10px',
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {label}
      </span>

      <div
        style={{
          flex: 1,
          height: compact ? '6px' : '8px',
          background: '#1a2a3a',
          borderRadius: '4px',
          border: '2px solid #2a3f5a',
          overflow: 'hidden',
          minWidth: compact ? 40 : 60,
        }}
      >
        {noDeadline ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#33CC33',
              borderRadius: '2px',
            }}
          />
        ) : (
          <div
            style={{
              width: `${width}%`,
              height: '100%',
              background: color,
              borderRadius: '2px',
              transition: 'width 0.6s ease-out',
              animation: isLowHp ? 'hp-blink 0.8s ease-in-out infinite' : 'none',
            }}
          />
        )}
      </div>

      {noDeadline ? (
        <span style={{ fontFamily: 'var(--font-button)', fontSize: '8px', color: '#33CC33', flexShrink: 0 }}>∞</span>
      ) : (
        <span style={{ fontFamily: 'var(--font-button)', fontSize: '8px', color, flexShrink: 0, animation: isLowHp ? 'hp-blink 0.8s ease-in-out infinite' : 'none' }}>
          {hp}%
        </span>
      )}
    </div>
  );
};
