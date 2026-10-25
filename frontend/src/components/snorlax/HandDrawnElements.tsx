import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// 1. Hand-Drawn Wobbly Underline (with 400ms stroke animation)
export const HandDrawnUnderline: React.FC<{
  color?: string;
  width?: number | string;
  style?: React.CSSProperties;
}> = ({ color = 'var(--sun)', width = '100%', style }) => (
  <svg
    viewBox="0 0 120 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      display: 'block',
      width: width,
      height: '10px',
      overflow: 'visible',
      marginTop: '-2px',
      ...style,
    }}
    aria-hidden="true"
  >
    <path
      d="M 2 8 C 25 3, 55 10, 85 4 C 100 2, 112 7, 118 5"
      stroke={color}
      strokeWidth="3.5"
      strokeLinecap="round"
      className="animate-draw"
    />
  </svg>
);

// 2. Hand-Drawn Wobbly Circle / Oval (around text like "Overdue")
export const HandDrawnCircle: React.FC<{
  color?: string;
  children: React.ReactNode;
}> = ({ color = 'var(--berry-spicy)', children }) => (
  <span style={{ position: 'relative', display: 'inline-block', padding: '2px 6px' }}>
    <svg
      viewBox="0 0 100 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        inset: '-4px -6px',
        width: 'calc(100% + 12px)',
        height: 'calc(100% + 8px)',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <path
        d="M 10 20 C 8 8, 30 4, 60 5 C 90 6, 96 16, 92 26 C 88 34, 50 37, 20 34 C 8 32, 6 18, 22 14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className="animate-draw"
      />
    </svg>
    {children}
  </span>
);

// 3. Coffee Ring Stain (Subtle background accent)
export const CoffeeRingStain: React.FC<{
  size?: number;
  style?: React.CSSProperties;
}> = ({ size = 160, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{
      position: 'absolute',
      pointerEvents: 'none',
      opacity: 0.06,
      userSelect: 'none',
      ...style,
    }}
  >
    <circle
      cx="50"
      cy="50"
      r="42"
      stroke="#6B4F35"
      strokeWidth="3.5"
      strokeDasharray="4 2 8 3 12 4"
      fill="none"
    />
    <circle
      cx="51"
      cy="49"
      r="39"
      stroke="#6B4F35"
      strokeWidth="1.5"
      opacity="0.6"
      fill="none"
    />
    <path
      d="M 78 28 C 84 32, 88 44, 82 52"
      stroke="#6B4F35"
      strokeWidth="4"
      strokeLinecap="round"
      opacity="0.8"
    />
    <circle cx="28" cy="74" r="2.5" fill="#6B4F35" opacity="0.7" />
  </svg>
);

// 4. Half-Eaten Berry (corner decoration with tiny crumbs)
export const HalfEatenBerry: React.FC<{
  size?: number;
  style?: React.CSSProperties;
}> = ({ size = 28, style }) => (
  <div
    style={{
      position: 'absolute',
      display: 'inline-flex',
      pointerEvents: 'none',
      ...style,
    }}
    aria-hidden="true"
  >
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Cheri berry body with a scalloped bite mark */}
      <path
        d="M 6 18 C 6 25 13 28 20 28 C 26 28 28 23 28 18 C 28 14 26 12 24 12 C 22 14 20 14 19 12 C 18 10 16 10 15 12 C 13 14 11 12 10 11 C 7 13 6 15 6 18 Z"
        fill="#D83C2D"
        stroke="#00323F"
        strokeWidth="2"
      />
      {/* Cream inner fruit showing at bite edge */}
      <path
        d="M 10 12 C 12 13 14 13 16 11 C 18 12 21 12 23 11 C 24 13 25 15 25 17 C 23 18 20 16 18 17 C 15 16 12 18 10 16 Z"
        fill="#FFE4B5"
      />
      {/* Little floating crumbs */}
      <circle cx="26" cy="8" r="1.5" fill="#D83C2D" />
      <circle cx="30" cy="12" r="1" fill="#FFE4B5" />
      <circle cx="24" cy="5" r="1" fill="#D83C2D" />
    </svg>
  </div>
);

// 5. Snorlax Paw Prints
export const PawPrintTrail: React.FC<{
  style?: React.CSSProperties;
}> = ({ style }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '12px',
      opacity: 0.18,
      pointerEvents: 'none',
      userSelect: 'none',
      ...style,
    }}
    aria-hidden="true"
  >
    {/* Left Paw */}
    <svg width="22" height="20" viewBox="0 0 24 22" fill="var(--snorlax-outline)">
      <ellipse cx="12" cy="14" rx="7" ry="6" />
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="12" cy="4" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
    </svg>

    {/* Right Paw offset */}
    <svg width="22" height="20" viewBox="0 0 24 22" fill="var(--snorlax-outline)" style={{ transform: 'translateY(-6px) rotate(12deg)' }}>
      <ellipse cx="12" cy="14" rx="7" ry="6" />
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="12" cy="4" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
    </svg>
  </div>
);

// 6. Section Doodle (squiggle / arrow / accent with draw animation option)
export const SectionDoodle: React.FC<{
  variant?: 'squiggle' | 'arrow' | 'star';
  color?: string;
  animateDraw?: boolean;
}> = ({ variant = 'squiggle', color = 'var(--snorlax)', animateDraw = false }) => {
  if (variant === 'arrow') {
    return (
      <svg width="28" height="14" viewBox="0 0 28 14" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <path
          d="M 2 7 Q 14 3 24 7 M 18 2 L 25 7 L 18 12"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animateDraw ? 'animate-draw' : ''}
        />
      </svg>
    );
  }
  return (
    <svg width="34" height="10" viewBox="0 0 34 10" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
      <path
        d="M 2 5 Q 8 1 14 5 T 26 5 T 32 5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        className={animateDraw ? 'animate-draw' : ''}
      />
    </svg>
  );
};

// 7. Sticky-Note Tip (Once per session, taped corner, handwritten font)
export const StickyNoteTip: React.FC<{
  tipText?: string;
  storageKey?: string;
}> = ({
  tipText = 'Tip: press g then t to jump straight to Tasks without clicking.',
  storageKey = 'snoozebox_sticky_dismissed',
}) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDismissed = sessionStorage.getItem(storageKey);
      if (!isDismissed) {
        setDismissed(false);
      }
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, 'true');
    }
  };

  if (dismissed) return null;

  return (
    <div
      role="note"
      aria-label="Snorlax's Sticky Note Tip"
      style={{
        position: 'relative',
        background: '#FFF9C4', // Canary soft yellow sticky paper
        color: '#3E2723',
        padding: '14px 18px 12px',
        borderRadius: '3px 4px 6px 3px',
        boxShadow: '3px 4px 12px rgba(0,0,0,0.12), 1px 2px 0 rgba(0,0,0,0.08)',
        maxWidth: '320px',
        transform: 'rotate(-1.2deg)',
        border: '1px solid #FFF176',
        fontFamily: 'var(--font-handwriting)',
        fontSize: '19px',
        lineHeight: 1.25,
        margin: '12px 0 20px',
        display: 'inline-block',
      }}
    >
      {/* Translucent tape strip at the top */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-10px',
          left: '35%',
          width: '54px',
          height: '18px',
          background: 'rgba(255, 255, 255, 0.65)',
          border: '1px solid rgba(230, 230, 230, 0.8)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          transform: 'rotate(2deg)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <p style={{ margin: 0 }}>
          {tipText}
        </p>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss sticky note"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#795548',
            cursor: 'pointer',
            padding: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '28px',
            opacity: 0.8,
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
