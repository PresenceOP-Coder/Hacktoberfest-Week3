import React from 'react';
import type { Priority, Category } from '../../types';

interface TypeBadgeProps {
  priority?: Priority;
  category?: Category;
  size?: 'sm' | 'md';
}

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  urgent:        { label: 'FIRE',     icon: '🔥', color: 'var(--fire)',     bg: 'var(--fire-bg)' },
  high:          { label: 'ELECTRIC', icon: '⚡', color: 'var(--electric)', bg: 'var(--electric-bg)' },
  normal:        { label: 'WATER',    icon: '💧', color: 'var(--water)',    bg: 'var(--water-bg)' },
  low:           { label: 'NORMAL',   icon: '⚪', color: 'var(--normal)',   bg: 'var(--normal-bg)' },
  newsletter:    { label: 'GRASS',    icon: '🌿', color: 'var(--grass)',    bg: 'var(--grass-bg)' },
  transactional: { label: 'NORMAL',   icon: '📦', color: 'var(--normal)',   bg: 'var(--normal-bg)' },
  action_required: { label: 'FIRE',   icon: '🔥', color: 'var(--fire)',     bg: 'var(--fire-bg)' },
  informational: { label: 'WATER',    icon: '💧', color: 'var(--water)',    bg: 'var(--water-bg)' },
  unknown:       { label: '???',      icon: '👻', color: 'var(--ghost)',    bg: 'var(--ghost-bg)' },
};

export const TypeBadge: React.FC<TypeBadgeProps> = ({ priority, category, size = 'sm' }) => {
  const key = category && category !== 'unknown' && category !== 'action_required' && category !== 'informational'
    ? category
    : priority || 'unknown';
  const cfg = TYPE_CONFIG[key] || TYPE_CONFIG['unknown'];
  const fontSize = size === 'md' ? '11px' : '9px';
  const padding = size === 'md' ? '3px 10px' : '2px 7px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontFamily: 'var(--font-button)',
        fontSize,
        fontWeight: 700,
        color: cfg.color,
        background: cfg.bg,
        border: `2px solid ${cfg.color}`,
        borderRadius: '12px',
        padding,
        whiteSpace: 'nowrap',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ fontSize: size === 'md' ? '12px' : '10px' }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
};
