import React from 'react';

interface SlakothSVGProps {
  state?: 'sleeping' | 'alert' | 'peeking';
  size?: number;
  className?: string;
}

export const SlakothSVG: React.FC<SlakothSVGProps> = ({
  state = 'sleeping',
  size = 64,
  className = '',
}) => {
  const isSleeping = state === 'sleeping';
  const isAlert = state === 'alert';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ imageRendering: 'pixelated' }}
      aria-label={`Slakoth mascot (${state})`}
    >
      {/* Body */}
      <rect x="8" y="14" width="16" height="12" rx="4" fill="#C8A878" />
      {/* Belly */}
      <rect x="11" y="17" width="10" height="7" rx="3" fill="#E8D0A0" />
      {/* Head */}
      <rect x="9" y="7" width="14" height="12" rx="5" fill="#C8A878" />
      {/* Ears */}
      <rect x="7" y="8" width="4" height="5" rx="2" fill="#A07850" />
      <rect x="21" y="8" width="4" height="5" rx="2" fill="#A07850" />
      {/* Inner ears */}
      <rect x="8" y="9" width="2" height="3" rx="1" fill="#E8A0A0" />
      <rect x="22" y="9" width="2" height="3" rx="1" fill="#E8A0A0" />

      {/* Eyes */}
      {isSleeping ? (
        <>
          {/* Sleeping eyes — squiggly lines */}
          <path d="M11 14 Q12 12 13 14" stroke="#5A3A1A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M19 14 Q20 12 21 14" stroke="#5A3A1A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      ) : isAlert ? (
        <>
          {/* Alert eyes — wide open */}
          <circle cx="12" cy="13" r="2.5" fill="#5A3A1A" />
          <circle cx="20" cy="13" r="2.5" fill="#5A3A1A" />
          <circle cx="12.8" cy="12.2" r="0.8" fill="white" />
          <circle cx="20.8" cy="12.2" r="0.8" fill="white" />
        </>
      ) : (
        <>
          {/* Peeking eyes — half open */}
          <ellipse cx="12" cy="13.5" rx="2" ry="1.5" fill="#5A3A1A" />
          <ellipse cx="20" cy="13.5" rx="2" ry="1.5" fill="#5A3A1A" />
        </>
      )}

      {/* Nose */}
      <ellipse cx="16" cy="16" rx="1.5" ry="1" fill="#A07850" />

      {/* Mouth */}
      {isSleeping ? (
        <path d="M14 18 Q16 17 18 18" stroke="#8B5E3C" strokeWidth="1" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M14 18 Q16 19 18 18" stroke="#8B5E3C" strokeWidth="1" fill="none" strokeLinecap="round" />
      )}

      {/* Arms */}
      <rect x="4" y="16" width="5" height="4" rx="2" fill="#B89060" />
      <rect x="23" y="16" width="5" height="4" rx="2" fill="#B89060" />

      {/* Claws */}
      <rect x="3" y="19" width="2" height="2" rx="1" fill="#8B6040" />
      <rect x="5" y="20" width="2" height="2" rx="1" fill="#8B6040" />
      <rect x="25" y="19" width="2" height="2" rx="1" fill="#8B6040" />
      <rect x="27" y="20" width="2" height="2" rx="1" fill="#8B6040" />

      {/* Zzz bubbles (sleeping only) */}
      {isSleeping && (
        <g style={{ animation: 'confetti-z 2s ease-in-out infinite' }}>
          <text x="22" y="10" fontSize="4" fill="#7A9BBF" fontWeight="bold" fontFamily="monospace">z</text>
          <text x="24" y="7" fontSize="5" fill="#7A9BBF" fontWeight="bold" fontFamily="monospace">Z</text>
          <text x="26" y="4" fontSize="6" fill="#7A9BBF" fontWeight="bold" fontFamily="monospace">Z</text>
        </g>
      )}
    </svg>
  );
};
