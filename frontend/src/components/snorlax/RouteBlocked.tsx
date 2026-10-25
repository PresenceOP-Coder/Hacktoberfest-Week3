import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Mascot } from './Mascot';
import { PokeFluteIcon } from './PokemonIcons';
import { LazyButton } from './LazyButton';

interface RouteBlockedProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const formatErrorMessage = (rawMessage: string): { friendlySummary?: string; rawMessage: string } => {
  if (!rawMessage) return { rawMessage: 'An unknown route blockage occurred.' };

  if (
    rawMessage.includes('Unexpected non-whitespace character after JSON') ||
    rawMessage.includes('SyntaxError') ||
    rawMessage.includes('Unexpected token')
  ) {
    return {
      friendlySummary: 'Local AI response was interrupted or included extra trailing text.',
      rawMessage,
    };
  }

  if (rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError') || rawMessage.includes('ECONNREFUSED')) {
    return {
      friendlySummary: 'SnoozeBox Go backend is asleep or unreachable on port 8080.',
      rawMessage,
    };
  }

  return { rawMessage };
};

export const RouteBlocked: React.FC<RouteBlockedProps> = ({
  title = "Couldn't sync. Snorlax is blocking the road.",
  message,
  onRetry,
  compact = false,
}) => {
  const { friendlySummary, rawMessage } = formatErrorMessage(message);

  return (
    <div
      role="alert"
      style={{
        background: 'var(--berry-spicy-bg)',
        border: '3px solid var(--berry-spicy)',
        borderRadius: 'var(--radius-lg)',
        padding: compact ? '16px' : '24px',
        boxShadow: 'var(--shadow-chunky)',
        display: 'flex',
        flexDirection: compact ? 'column' : 'row',
        alignItems: compact ? 'flex-start' : 'center',
        gap: '20px',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <Mascot pose="blocking" size={compact ? 'md' : 'lg'} alt="Route Blocked" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <AlertTriangle size={20} color="var(--berry-spicy)" strokeWidth={2.5} />
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--berry-spicy)',
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>

        {friendlySummary && (
          <p
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: '6px',
            }}
          >
            {friendlySummary}
          </p>
        )}

        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>
          Here's what the server said:
        </div>

        <p
          style={{
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'var(--muted)',
            marginBottom: onRetry ? '14px' : 0,
            wordBreak: 'break-word',
            fontFamily: friendlySummary ? 'monospace' : 'inherit',
            background: friendlySummary ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
            padding: friendlySummary ? '6px 10px' : 0,
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {rawMessage}
        </p>

        {onRetry && (
          <LazyButton
            variant="danger"
            size="sm"
            onClick={onRetry}
            icon={<PokeFluteIcon size={18} />}
          >
            Play the Poké Flute
          </LazyButton>
        )}
      </div>
    </div>
  );
};
