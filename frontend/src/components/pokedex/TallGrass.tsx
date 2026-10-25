import React from 'react';

export const TallGrass: React.FC = () => {
  const blades = Array.from({ length: 32 });

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '46px',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {blades.map((_, i) => {
        const isB = i % 3 === 1;
        const height = 26 + (i % 6) * 4;
        const hue = 118 + (i % 5) * 4;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height,
              background: `hsl(${hue}, 50%, ${isB ? 26 : 20}%)`,
              borderRadius: '50% 50% 0 0 / 65% 65% 0 0',
              transformOrigin: 'bottom center',
              animation: `${isB ? 'grass-sway-b' : 'grass-sway'} ${2.4 + (i % 4) * 0.4}s ease-in-out infinite`,
              animationDelay: `${(i % 7) * 0.12}s`,
            }}
          />
        );
      })}
    </div>
  );
};
