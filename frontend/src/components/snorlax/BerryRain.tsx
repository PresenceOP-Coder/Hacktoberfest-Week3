import React from 'react';
import { BerrySpicy, BerrySour, BerrySweet, BerryDry, BerryMystery, PokeBallIcon } from './PokemonIcons';

interface BerryRainProps {
  active: boolean;
}

export const BerryRain: React.FC<BerryRainProps> = ({ active }) => {
  if (!active) return null;

  const items = Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    left: `${(i * 4.2 + (i % 3) * 2) % 96}%`,
    delay: `${(i * 0.08).toFixed(2)}s`,
    duration: `${1.2 + (i % 4) * 0.2}s`,
    type: i % 6,
  }));

  const renderIcon = (type: number) => {
    switch (type) {
      case 0: return <BerrySpicy size={28} />;
      case 1: return <BerrySour size={28} />;
      case 2: return <BerrySweet size={28} />;
      case 3: return <BerryDry size={28} />;
      case 4: return <BerryMystery size={28} />;
      default: return <PokeBallIcon size={26} />;
    }
  };

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes berryFall {
          0% {
            transform: translateY(-50px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0.9;
          }
        }
      `}</style>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            top: 0,
            left: item.left,
            animation: `berryFall ${item.duration} linear forwards`,
            animationDelay: item.delay,
          }}
        >
          {renderIcon(item.type)}
        </div>
      ))}
    </div>
  );
};
