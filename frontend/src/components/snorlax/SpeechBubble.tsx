import React from 'react';

interface SpeechBubbleProps {
  speaker?: string; // Kept optional for compatibility, but omitted for human hand-made feel
  children: React.ReactNode;
  tailPosition?: 'left' | 'top' | 'none';
  className?: string;
  style?: React.CSSProperties;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  speaker,
  children,
  tailPosition = 'left',
  className = '',
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: 'var(--surface)',
        color: 'var(--ink)',
        border: '3px solid var(--border)',
        // Slightly irregular hand-drawn border-radius and -0.5deg tilt
        borderRadius: '22px 26px 20px 25px',
        transform: 'rotate(-0.5deg)',
        padding: '18px 22px',
        boxShadow: 'var(--shadow-chunky)',
        ...style,
      }}
    >
      {/* Optional Speaker Chip (Only rendered if specifically requested) */}
      {speaker && (
        <div
          style={{
            position: 'absolute',
            top: '-12px',
            left: '20px',
            background: 'var(--snorlax)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            fontWeight: 800,
            padding: '2px 10px',
            borderRadius: 'var(--radius-full)',
            border: '2px solid var(--border)',
            letterSpacing: '0.04em',
          }}
        >
          {speaker}
        </div>
      )}

      {/* Bubble Tail pointing toward Snorlax's head (Smooth seamless curve, no notches or cuts) */}
      {tailPosition === 'left' && (
        <svg
          width="18"
          height="28"
          viewBox="0 0 18 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '32px',
            left: '-16px',
            pointerEvents: 'none',
          }}
        >
          <path
            d="M 17 2 Q 8 8 2 15 Q 9 19 17 26"
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {tailPosition === 'top' && (
        <svg
          width="28"
          height="18"
          viewBox="0 0 28 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        >
          <path
            d="M 2 17 Q 8 8 15 2 Q 19 9 26 17"
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <div
        style={{
          fontSize: '17px',
          lineHeight: 1.5,
          fontWeight: 700,
          color: 'var(--ink)',
        }}
      >
        {children}
      </div>
    </div>
  );
};
