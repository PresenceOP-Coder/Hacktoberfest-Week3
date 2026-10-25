import React, { useEffect, useState } from 'react';

interface PokeballCatchProps {
  taskTitle: string;
  onComplete: () => void;
}

type Phase = 'fly' | 'shake' | 'flash' | 'gotcha' | 'done';

export const PokeballCatch: React.FC<PokeballCatchProps> = ({ taskTitle, onComplete }) => {
  const [phase, setPhase] = useState<Phase>('fly');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    const t1 = setTimeout(() => setPhase('shake'), 350);
    const t2 = setTimeout(() => setPhase('flash'), 1200);
    const t3 = setTimeout(() => setPhase('gotcha'), 1500);
    const t4 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done') return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: phase === 'flash' ? 'rgba(255,255,255,0.92)' : 'rgba(10, 15, 25, 0.75)',
        backdropFilter: 'blur(3px)',
        transition: 'background 0.15s ease',
      }}
    >
      {phase === 'gotcha' ? (
        <div
          style={{
            background: 'var(--paper)',
            border: '4px solid var(--ink)',
            borderRadius: '12px',
            padding: '24px 32px',
            textAlign: 'center',
            boxShadow: '6px 6px 0 var(--ink)',
            animation: 'fadeIn 0.2s ease-out',
            maxWidth: '400px',
            margin: '0 20px',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>⚾</div>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '11px',
              color: 'var(--dex-red)',
              marginBottom: '8px',
              letterSpacing: '0.05em',
            }}
          >
            All right!
          </div>
          <div
            style={{
              fontFamily: 'var(--font-button)',
              fontSize: '13px',
              color: 'var(--ink)',
              marginBottom: '6px',
            }}
          >
            Gotcha!
          </div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 800,
              color: '#333',
              lineHeight: 1.4,
            }}
          >
            "{taskTitle}" was caught!
          </div>
          <div style={{ marginTop: '12px', fontSize: '18px', letterSpacing: '4px' }}>✨🌟⭐✨</div>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '52px',
              filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
              animation:
                phase === 'shake'
                  ? 'pokeball-catch 0.8s ease-in-out infinite'
                  : 'fadeIn 0.3s ease-out',
            }}
          >
            ⚾
          </div>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '9px',
              color: 'var(--electric)',
              letterSpacing: '0.05em',
              textShadow: '0 2px 4px #000',
            }}
          >
            {phase === 'shake' ? 'Click... Click... Click...' : 'Throwing Pokéball!'}
          </div>
        </div>
      )}
    </div>
  );
};
