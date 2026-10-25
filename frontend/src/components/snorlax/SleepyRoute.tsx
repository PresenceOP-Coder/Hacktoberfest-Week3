import React from 'react';
import { Mascot } from './Mascot';
import { PokeBallIcon, BerrySpicy, BerrySweet, BerryDry } from './PokemonIcons';

// Natural Route Grass Tuft SVG with staggered swaying
const GrassTuft: React.FC<{
  height?: number;
  color?: string;
  style?: React.CSSProperties;
  staggerDelay?: string;
}> = ({
  height = 20,
  color = 'var(--snorlax, #00647B)',
  style,
  staggerDelay = '0s',
}) => (
  <svg
    width={Math.round(height * 0.85)}
    height={height}
    viewBox="0 0 24 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="grass-tuft"
    style={{
      display: 'inline-block',
      verticalAlign: 'bottom',
      flexShrink: 0,
      transformOrigin: 'bottom center',
      animation: `routeGrassSway 3s ease-in-out infinite`,
      animationDelay: staggerDelay,
      ...style,
    }}
  >
    {/* 3 organic blades of grass */}
    <path d="M 4 28 C 3 18, 1 10, 4 4 C 6 12, 8 20, 9 28 Z" fill={color} opacity="0.8" />
    <path d="M 8 28 C 9 16, 11 4, 13 1 C 15 8, 16 18, 16 28 Z" fill={color} opacity="0.95" />
    <path d="M 15 28 C 17 20, 20 12, 22 8 C 21 16, 19 22, 18 28 Z" fill={color} opacity="0.75" />
  </svg>
);

// Individual Soft Paw Print
const PawPrint: React.FC<{ rotate?: number; scale?: number; style?: React.CSSProperties }> = ({
  rotate = 0,
  scale = 1,
  style,
}) => (
  <svg
    width={16 * scale}
    height={14 * scale}
    viewBox="0 0 24 22"
    fill="var(--ink)"
    style={{
      opacity: 0.2,
      transform: `rotate(${rotate}deg)`,
      display: 'inline-block',
      flexShrink: 0,
      ...style,
    }}
  >
    <ellipse cx="12" cy="14" rx="7" ry="6" />
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="12" cy="4" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
  </svg>
);

export const SleepyRoute: React.FC = () => {
  return (
    <footer
      aria-hidden="true"
      style={{
        width: '100%',
        height: '60px',
        minHeight: '56px',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        marginTop: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Background Illustrated Winding Dirt Path across full viewport width */}
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      >
        {/* Soft upper meadow contour */}
        <path
          d="M 0 28 Q 280 16, 600 24 T 1200 22 L 1200 60 L 0 60 Z"
          fill="var(--surface-alt)"
          opacity="0.45"
        />
        {/* Warm dirt path surface */}
        <path
          d="M 0 34 Q 280 22, 600 30 T 1200 28 L 1200 60 L 0 60 Z"
          fill="var(--belly-dark)"
          opacity="0.32"
        />
        {/* Continuous organic path top edge line (smooth unbroken curve) */}
        <path
          d="M 0 34 Q 280 22, 600 30 T 1200 28"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.8"
          opacity="0.4"
        />
      </svg>

      {/* 3 Balanced Scenic Clusters within 1080px column */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          zIndex: 2,
          boxSizing: 'border-box',
          paddingBottom: '5px',
        }}
      >
        {/* Cluster 1 (Left): Grass tuft + Cheri Berry (Spicy) + Paw prints starting trail */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <GrassTuft height={22} staggerDelay="0s" />
          <div className="berry-bob" style={{ transform: 'translateY(-1px)' }}>
            <BerrySpicy size={16} />
          </div>
          <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
            <PawPrint rotate={-10} scale={0.75} />
            <PawPrint rotate={14} scale={0.75} style={{ transform: 'translateY(-3px) rotate(14deg)' }} />
          </div>
        </div>

        {/* Cluster 2 (Center): Sleeping Munchlax nestled comfortably in grass on route */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            transform: 'translateY(1px)',
          }}
        >
          <GrassTuft height={18} staggerDelay="1.3s" />
          <div
            title="Sleeping Munchlax resting on Route 12"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
              cursor: 'pointer',
              lineHeight: 0,
            }}
          >
            <Mascot pose="munchlax" size="sm" alt="Sleeping Munchlax on route" />
          </div>
          <GrassTuft height={20} staggerDelay="2.6s" />
        </div>

        {/* Cluster 3 (Right): Pecha Berry (Sweet) + Grass + Poke Ball + Rawst Berry (Dry) + Grass */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <div className="berry-bob" style={{ transform: 'translateY(-1px)', animationDelay: '0.8s' }}>
            <BerrySweet size={16} />
          </div>

          <GrassTuft height={16} staggerDelay="0.7s" />

          <div className="pokeball-glint" style={{ transform: 'rotate(18deg) translateY(1px)' }}>
            <PokeBallIcon size={18} />
          </div>

          <div className="berry-bob" style={{ transform: 'translateY(-1px)', animationDelay: '1.4s' }}>
            <BerryDry size={16} />
          </div>

          <GrassTuft height={22} staggerDelay="1.8s" />
        </div>
      </div>
    </footer>
  );
};
