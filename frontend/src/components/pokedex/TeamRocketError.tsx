import React from 'react';
import { PokeButton } from './PokeButton';

interface TeamRocketErrorProps {
  message: string;
  onRetry?: () => void;
}

export const TeamRocketError: React.FC<TeamRocketErrorProps> = ({ message, onRetry }) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1f0404 0%, #2b0808 50%, #120202 100%)',
        border: '3px solid #CC0000',
        borderRadius: '8px',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '4px 4px 0 #440000',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>⚡</span>
        <div
          style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: '9px',
            color: '#FF4D4D',
            lineHeight: 1.6,
            letterSpacing: '0.04em',
          }}
        >
          TEAM ROCKET IS BLASTING OFF AGAIN!
        </div>
      </div>

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: '#FF9999',
          lineHeight: 1.5,
          fontWeight: 700,
          background: 'rgba(200, 0, 0, 0.15)',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid rgba(255, 60, 60, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ color: '#FF3333' }}>⚠</span>
        <span>{message}</span>
      </p>

      {onRetry && (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <PokeButton variant="fight" onClick={onRetry} size="sm">
            ⚔ Retry Battle
          </PokeButton>
        </div>
      )}
    </div>
  );
};
