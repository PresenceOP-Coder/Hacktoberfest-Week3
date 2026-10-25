import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Poké Ball SVG
export const PokeBallIcon: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-label="Poké Ball"
  >
    {/* Outer circle with chunky dark outline */}
    <circle cx="12" cy="12" r="10" fill="#FFFFFF" stroke="#00323F" strokeWidth="2.5" />
    {/* Top half red */}
    <path d="M 2 12 A 10 10 0 0 1 22 12 Z" fill="#E3573D" stroke="#00323F" strokeWidth="2.5" />
    {/* Middle divider line */}
    <line x1="2" y1="12" x2="22" y2="12" stroke="#00323F" strokeWidth="2.5" />
    {/* Center outer ring */}
    <circle cx="12" cy="12" r="3.5" fill="#FFFFFF" stroke="#00323F" strokeWidth="2" />
    {/* Center button */}
    <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" stroke="#00323F" strokeWidth="1" />
  </svg>
);

// Cheri Berry (Spicy / Urgent - Red with small green stem)
export const BerrySpicy: React.FC<IconProps> = ({ size = 18, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-label="Cheri Berry (Spicy)"
  >
    {/* Stem */}
    <path d="M 12 3 C 12 3 11 7 8 8" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />
    <path d="M 12 3 C 12 3 13 7 16 8" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />
    <path d="M 12 3 L 13 1" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
    {/* Two cherries / Cheri berry shape */}
    <circle cx="8" cy="14" r="6" fill="#D83C2D" stroke="#00323F" strokeWidth="2" />
    <circle cx="16" cy="14" r="6" fill="#D83C2D" stroke="#00323F" strokeWidth="2" />
    {/* Highlights */}
    <circle cx="6.5" cy="12" r="1.5" fill="#FF8A80" />
    <circle cx="14.5" cy="12" r="1.5" fill="#FF8A80" />
  </svg>
);

// Aspear Berry (Sour / High Priority - Golden Yellow)
export const BerrySour: React.FC<IconProps> = ({ size = 18, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-label="Aspear Berry (Sour)"
  >
    {/* Green Top leaves */}
    <path d="M 12 2 L 10 7 L 14 7 Z" fill="#2E7D32" stroke="#00323F" strokeWidth="1.5" />
    {/* Bulbous Pear / Berry Body */}
    <path
      d="M 12 6 C 8 6 6 10 6 14 C 6 19 8.5 22 12 22 C 15.5 22 18 19 18 14 C 18 10 16 6 12 6 Z"
      fill="#FFD23F"
      stroke="#00323F"
      strokeWidth="2"
    />
    {/* Highlight */}
    <ellipse cx="10" cy="12" rx="2" ry="4" fill="#FFF3B0" />
  </svg>
);

// Pecha Berry (Sweet / Normal Priority - Peach / Soft Teal body)
export const BerrySweet: React.FC<IconProps> = ({ size = 18, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-label="Pecha Berry (Sweet)"
  >
    {/* Stem */}
    <path d="M 12 2 Q 13 5 12 7" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" />
    {/* Peach heart shape */}
    <path
      d="M 12 8 C 8 4 3 8 3 13 C 3 18 8 21 12 23 C 16 21 21 18 21 13 C 21 8 16 4 12 8 Z"
      fill="#00627A"
      stroke="#00323F"
      strokeWidth="2"
    />
    <path
      d="M 12 9 C 9 6 5 9 5 13 C 5 16.5 9 19 12 21 Z"
      fill="#FFE4B5"
      opacity="0.75"
    />
  </svg>
);

// Rawst Berry (Dry / Newsletter - Forest Green)
export const BerryDry: React.FC<IconProps> = ({ size = 18, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-label="Rawst Berry (Dry)"
  >
    {/* Leaf cap */}
    <path d="M 8 5 Q 12 2 16 5" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />
    {/* Segmented berry shape */}
    <ellipse cx="12" cy="14" rx="7" ry="8" fill="#2E7D32" stroke="#00323F" strokeWidth="2" />
    <ellipse cx="9" cy="13" rx="2" ry="4" fill="#66BB6A" />
    <path d="M 12 6 L 12 2" stroke="#00323F" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Chesto / Mystery Berry (Purple / Unknown)
export const BerryMystery: React.FC<IconProps> = ({ size = 18, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-label="Mystery Berry"
  >
    <path d="M 12 2 L 14 6 L 10 6 Z" fill="#2E7D32" stroke="#00323F" strokeWidth="1.5" />
    <circle cx="12" cy="14" r="7.5" fill="#6A459E" stroke="#00323F" strokeWidth="2" />
    {/* Swirl question mark curve */}
    <path
      d="M 10 11 C 10 9.5 13.5 9.5 13.5 12 C 13.5 14 11.5 14.5 11.5 16"
      stroke="#F3EBF9"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="11.5" cy="18" r="1" fill="#F3EBF9" />
  </svg>
);

// Poké Flute SVG
export const PokeFluteIcon: React.FC<IconProps> = ({ size = 20, className = '', style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    aria-label="Poké Flute"
  >
    {/* Wooden flute body tilted */}
    <rect
      x="3"
      y="10"
      width="18"
      height="4"
      rx="2"
      transform="rotate(-25 12 12)"
      fill="#D49A00"
      stroke="#00323F"
      strokeWidth="2"
    />
    {/* Finger holes */}
    <circle cx="8" cy="14" r="1" fill="#00323F" />
    <circle cx="12" cy="12" r="1" fill="#00323F" />
    <circle cx="16" cy="10" r="1" fill="#00323F" />
  </svg>
);

export const getBerryForPriority = (priority?: string, category?: string) => {
  if (category === 'newsletter') return <BerryDry />;
  if (category === 'transactional') return <BerrySweet />;
  switch (priority) {
    case 'urgent':
      return <BerrySpicy />;
    case 'high':
      return <BerrySour />;
    case 'normal':
    case 'low':
      return <BerrySweet />;
    default:
      return <BerryMystery />;
  }
};
