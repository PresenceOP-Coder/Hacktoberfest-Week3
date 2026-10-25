import React, { useState } from 'react';
import { LazyButton } from './LazyButton';
import { PokeFluteIcon } from './PokemonIcons';
import { Music } from 'lucide-react';

interface PokeFluteButtonProps {
  label?: string;
  tooltip?: string;
  onClick: () => Promise<void> | void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const PokeFluteButton: React.FC<PokeFluteButtonProps> = ({
  label = 'Wake me up',
  tooltip = 'Refresh the digest',
  onClick,
  loading = false,
  variant = 'secondary',
  size = 'md',
  style,
}) => {
  const [playing, setPlaying] = useState(false);

  const handleClick = async () => {
    setPlaying(true);
    try {
      await onClick();
    } finally {
      setTimeout(() => setPlaying(false), 900);
    }
  };

  const isBusy = loading || playing;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <LazyButton
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isBusy}
        title={tooltip}
        style={style}
        icon={
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {isBusy ? <Music size={18} className="spin" /> : <PokeFluteIcon size={18} />}
          </span>
        }
      >
        {isBusy ? 'Waking Snorlax gently...' : label}
      </LazyButton>

      {/* Floating Musical Notes when playing - positioned to the right to avoid overlapping content above */}
      {isBusy && (
        <div
          aria-hidden="true"
          className="flute-notes-container"
          style={{
            position: 'absolute',
            top: '50%',
            right: '-36px',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            pointerEvents: 'none',
          }}
        >
          <span className="flute-note-1" style={{ color: 'var(--sun, #FFD23F)', display: 'inline-flex' }}>
            <Music size={15} />
          </span>
          <span className="flute-note-2" style={{ color: 'var(--belly-cream, #FFE4B5)', display: 'inline-flex' }}>
            <Music size={12} />
          </span>

          <style>{`
            @keyframes fluteNoteBob1 {
              0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.95; }
              50% { transform: translateY(-4px) rotate(10deg); opacity: 1; }
            }
            @keyframes fluteNoteBob2 {
              0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
              50% { transform: translateY(-3px) rotate(-8deg); opacity: 1; }
            }
            .flute-note-1 {
              animation: fluteNoteBob1 0.8s ease-in-out infinite;
            }
            .flute-note-2 {
              animation: fluteNoteBob2 0.8s ease-in-out infinite 0.25s;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
