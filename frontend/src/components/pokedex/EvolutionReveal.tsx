import React, { useEffect, useState } from 'react';

interface EvolutionRevealProps {
  fromText?: string;
  toText?: string;
  onFinished?: () => void;
}

export const EvolutionReveal: React.FC<EvolutionRevealProps> = ({
  fromText = 'Single Email',
  toText = 'Attention Debt Responsibility',
  onFinished,
}) => {
  const [stage, setStage] = useState<'pulsing' | 'evolved'>('pulsing');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStage('evolved');
      if (onFinished) onFinished();
      return;
    }

    const t1 = setTimeout(() => setStage('evolved'), 1200);
    const t2 = setTimeout(() => {
      if (onFinished) onFinished();
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #162438 0%, #0d1726 100%)',
        border: '3px solid #FFD23F',
        borderRadius: '10px',
        padding: '16px 20px',
        textAlign: 'center',
        boxShadow: '0 0 16px rgba(255, 210, 63, 0.4), 4px 4px 0 #000',
        animation: stage === 'pulsing' ? 'evolution-glow 1s ease-in-out infinite' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: '10px',
          color: '#FFD23F',
          marginBottom: '8px',
          letterSpacing: '0.05em',
        }}
      >
        {stage === 'pulsing' ? 'WHAT? YOUR TASK IS EVOLVING!' : 'CONGRATULATIONS! TASK EVOLVED!'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', margin: '12px 0' }}>
        <div
          style={{
            padding: '8px 12px',
            background: '#0a1420',
            border: '2px solid #3a5070',
            borderRadius: '6px',
            fontFamily: 'var(--font-button)',
            fontSize: '11px',
            color: '#8BA5C0',
          }}
        >
          {fromText}
        </div>

        <span style={{ fontSize: '20px', color: '#FFD23F' }}>➔</span>

        <div
          style={{
            padding: '8px 12px',
            background: '#1a3050',
            border: '2px solid #FFD23F',
            borderRadius: '6px',
            fontFamily: 'var(--font-button)',
            fontSize: '11px',
            color: '#FFEAA7',
            fontWeight: 700,
          }}
        >
          {toText}
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)' }}>
        Multiple emails collapsed into a single active objective with unified deadline tracking.
      </p>
    </div>
  );
};
