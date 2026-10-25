import React, { useState } from 'react';

export type PokeButtonVariant = 'fight' | 'bag' | 'run' | 'catch' | 'ghost' | 'primary' | 'danger' | 'heal';

interface PokeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PokeButtonVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES: Record<PokeButtonVariant, { bg: string; color: string; shadow: string; border: string }> = {
  fight:   { bg: '#C03028', color: '#fff', shadow: '3px 3px 0 #6E1810', border: '#6E1810' },
  bag:     { bg: '#4880C8', color: '#fff', shadow: '3px 3px 0 #204880', border: '#204880' },
  run:     { bg: '#5A8A28', color: '#fff', shadow: '3px 3px 0 #2A5010', border: '#2A5010' },
  catch:   { bg: '#E87030', color: '#fff', shadow: '3px 3px 0 #804010', border: '#804010' },
  ghost:   { bg: '#685898', color: '#fff', shadow: '3px 3px 0 #302850', border: '#302850' },
  primary: { bg: 'var(--dex-red)', color: '#fff', shadow: '3px 3px 0 var(--dex-red-dark)', border: 'var(--dex-red-dark)' },
  danger:  { bg: '#880000', color: '#fff', shadow: '3px 3px 0 #440000', border: '#440000' },
  heal:    { bg: '#E880C0', color: '#fff', shadow: '3px 3px 0 #804080', border: '#804080' },
};

export const PokeButton: React.FC<PokeButtonProps> = ({
  variant = 'primary',
  children,
  size = 'md',
  style,
  disabled,
  ...props
}) => {
  const [pressed, setPressed] = useState(false);
  const s = VARIANT_STYLES[variant];

  const fontSize = size === 'lg' ? '12px' : size === 'sm' ? '9px' : '11px';
  const padding = size === 'lg' ? '12px 20px' : size === 'sm' ? '5px 10px' : '8px 16px';

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontFamily: 'var(--font-button)',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.04em',
        background: disabled ? '#2a3545' : s.bg,
        color: disabled ? '#6b7f99' : s.color,
        border: `3px solid ${disabled ? '#1c2533' : s.border}`,
        borderRadius: '6px',
        padding,
        boxShadow: pressed || disabled ? '1px 1px 0 #000' : s.shadow,
        transform: pressed ? 'translate(2px, 2px)' : 'translate(0, 0)',
        transition: 'transform 0.05s, box-shadow 0.05s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        userSelect: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  );
};
