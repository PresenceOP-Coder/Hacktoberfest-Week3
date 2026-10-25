import React, { useEffect, useState } from 'react';
import { Mascot } from './Mascot';
import { Undo2, X } from 'lucide-react';
import { getDoneToastCopy, getSnoozeToastCopy, getDismissToastCopy } from '../../utils/humanCopy';

export type ToastAction = 'done' | 'snooze' | 'dismiss';

interface MunchToastProps {
  taskTitle: string;
  action?: ToastAction;
  onUndo?: () => void;
  onDismiss: () => void;
}

export const MunchToast: React.FC<MunchToastProps> = ({
  taskTitle,
  action = 'done',
  onUndo,
  onDismiss,
}) => {
  const [chewing, setChewing] = useState(true);

  useEffect(() => {
    const chewTimer = setTimeout(() => setChewing(false), 500);
    const dismissTimer = setTimeout(onDismiss, 5000); // 5s Undo
    return () => {
      clearTimeout(chewTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  const getToastDetails = () => {
    switch (action) {
      case 'snooze':
        return {
          title: getSnoozeToastCopy(),
          desc: `"${taskTitle}" put back to sleep until tomorrow.`,
          pose: 'sleeping' as const,
        };
      case 'dismiss':
        return {
          title: getDismissToastCopy(),
          desc: `"${taskTitle}" removed from active tasks.`,
          pose: 'munchlax' as const,
        };
      case 'done':
      default:
        return {
          title: getDoneToastCopy(),
          desc: `"${taskTitle}" moved to Leftovers.`,
          pose: 'eating' as const,
        };
    }
  };

  const details = getToastDetails();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        background: 'var(--surface)',
        border: '3px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 20px',
        boxShadow: 'var(--shadow-chunky)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        maxWidth: '480px',
        width: 'calc(100% - 48px)',
        boxSizing: 'border-box',
        animation: 'popIn var(--m-base, 250ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          animation: chewing ? 'snorlaxMunchBob 350ms ease-in-out infinite' : 'none',
        }}
      >
        <Mascot pose={details.pose} size="md" alt={details.title} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--ink)',
          }}
        >
          {details.title}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {details.desc}
        </div>
      </div>

      {onUndo && (
        <button
          onClick={onUndo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '44px',
            padding: '0 14px',
            background: 'var(--belly)',
            color: 'var(--snorlax-dark)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '2px 2px 0 var(--border)',
            flexShrink: 0,
          }}
        >
          <Undo2 size={16} strokeWidth={2.5} />
          <span>Undo</span>
        </button>
      )}

      <button
        onClick={onDismiss}
        aria-label="Dismiss toast"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '44px',
          width: '44px',
          padding: '4px',
          color: 'var(--muted)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <X size={18} strokeWidth={2.5} />
      </button>

      {/* Draining 5s Undo Progress Bar */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'var(--surface-alt)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--snorlax)',
            width: '100%',
            animation: 'toastDrain 5s linear forwards',
            transformOrigin: 'left center',
          }}
        />
      </div>

      <style>{`
        @keyframes toastDrain {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
};
