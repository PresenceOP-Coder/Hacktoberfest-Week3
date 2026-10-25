import React, { useState, forwardRef } from 'react';

export type LazyButtonVariant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';

export interface LazyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LazyButtonVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const LazyButton = forwardRef<HTMLButtonElement, LazyButtonProps>(({
  variant = 'secondary',
  icon,
  children,
  size = 'md',
  fullWidth = false,
  disabled,
  style,
  ...props
}, ref) => {
  const [pressed, setPressed] = useState(false);

  // Variant styling
  let bg = 'var(--surface)';
  let color = 'var(--ink)';
  let borderColor = 'var(--border)';
  let shadow = 'var(--shadow-btn)';

  if (variant === 'primary') {
    bg = 'var(--accent)';
    color = '#FFFFFF';
    borderColor = 'var(--border)';
  } else if (variant === 'secondary') {
    bg = 'var(--snorlax)';
    color = '#FFFFFF';
    borderColor = 'var(--border)';
  } else if (variant === 'danger') {
    bg = 'var(--berry-spicy)';
    color = '#FFFFFF';
    borderColor = 'var(--border)';
  } else if (variant === 'ghost' || variant === 'quiet') {
    bg = 'var(--surface-alt)';
    color = 'var(--muted)';
    borderColor = 'var(--border)';
    shadow = '2px 2px 0 var(--border)';
  }

  // Size styling (always 44px+ touch target)
  const height = size === 'sm' ? '44px' : size === 'lg' ? '52px' : '46px';
  const padding = size === 'sm' ? '0 14px' : size === 'lg' ? '0 24px' : '0 18px';
  const fontSize = size === 'lg' ? '17px' : '15px';

  return (
    <button
      ref={ref}
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
        gap: '8px',
        height,
        minHeight: '44px',
        padding,
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-heading)',
        fontSize,
        fontWeight: 800,
        background: disabled ? 'var(--surface-alt)' : bg,
        color: disabled ? 'var(--muted)' : color,
        border: `3px solid ${disabled ? 'var(--muted)' : borderColor}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: pressed || disabled ? '1px 1px 0 var(--border)' : shadow,
        transform: pressed ? 'translate(2px, 2px)' : 'translate(0, 0)',
        transition: 'transform 0.05s, box-shadow 0.05s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        userSelect: 'none',
        ...style,
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center', fontSize: '18px' }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
});

LazyButton.displayName = 'LazyButton';
