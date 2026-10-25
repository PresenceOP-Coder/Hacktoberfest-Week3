import React from 'react';
import { Infinity as InfinityIcon } from 'lucide-react';

interface NapMeterProps {
  dueAt?: string;
  isOverdue?: boolean;
  compact?: boolean;
}

export const NapMeter: React.FC<NapMeterProps> = ({ dueAt, isOverdue, compact = false }) => {
  // 1. NO DEADLINE: "No rush" with an infinity icon and NO bar.
  if (!dueAt && !isOverdue) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'var(--font-heading)',
          fontSize: compact ? '12px' : '14px',
          fontWeight: 700,
          color: 'var(--snorlax)',
        }}
      >
        <InfinityIcon size={compact ? 14 : 16} strokeWidth={2.5} />
        <span>No rush</span>
      </div>
    );
  }

  // Calculate hours left & overdue state
  const now = Date.now();
  const due = dueAt ? new Date(dueAt).getTime() : now;
  const isInvalidDate = isNaN(due);
  const diffHours = (due - now) / (1000 * 60 * 60);
  const isActuallyOverdue = isOverdue || (!isInvalidDate && diffHours < 0);
  const overdueHours = Math.max(1, Math.round(Math.abs(diffHours)));
  const hoursLeft = Math.max(0, Math.round(diffHours));

  // Format exact deadline text next to it
  const dueDate = new Date(due);
  const exactDeadlineText = isInvalidDate
    ? 'Due soon'
    : `${dueDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })} ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  // Bar styling rules:
  // - Overdue: FULLY EMPTY bar (0% fill) with a red "Overdue by Xh" label (never a full red bar).
  // - <12h: red
  // - <48h: amber
  // - 48h+: teal
  let barColor = 'var(--snorlax-teal)'; // 48h+ = teal
  let labelColor = 'var(--snorlax-teal)';
  let statusText = `${hoursLeft}h left`;
  let fillPercent = Math.min(100, Math.max(8, Math.round((hoursLeft / 72) * 100)));

  if (isActuallyOverdue) {
    barColor = 'transparent';
    fillPercent = 0; // FULLY EMPTY bar
    labelColor = 'var(--berry-spicy)';
    statusText = `Overdue by ${overdueHours}h`;
  } else if (hoursLeft < 12) {
    barColor = 'var(--berry-spicy)'; // <12h = red
    labelColor = 'var(--berry-spicy)';
    statusText = hoursLeft <= 1 ? '< 1h left' : `${hoursLeft}h left`;
  } else if (hoursLeft < 48) {
    barColor = 'var(--berry-sour)'; // <48h = amber
    labelColor = 'var(--berry-sour)';
    statusText = `${hoursLeft}h left`;
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        fontFamily: 'var(--font-heading)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: compact ? '12px' : '13px',
            fontWeight: 800,
            color: 'var(--muted)',
          }}
        >
          Nap:
        </span>

        {/* NapMeter Bar */}
        <div
          title={statusText}
          style={{
            width: compact ? '60px' : '84px',
            height: '10px',
            background: 'var(--surface-alt)',
            borderRadius: 'var(--radius-full)',
            border: `2px solid ${isActuallyOverdue ? 'var(--berry-spicy)' : 'var(--border)'}`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {fillPercent > 0 && (
            <div
              style={{
                width: `${fillPercent}%`,
                height: '100%',
                background: barColor,
                borderRadius: 'var(--radius-full)',
                transition: 'width 500ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
              }}
            />
          )}
        </div>
      </div>

      {/* Label and exact deadline */}
      <span
        style={{
          fontSize: compact ? '12px' : '13px',
          fontWeight: 800,
          color: labelColor,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          animation: isActuallyOverdue ? 'popBadge 400ms ease-out' : 'none',
        }}
      >
        <span>{statusText}</span>
        <span style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '12px' }}>
          • {exactDeadlineText}
        </span>
      </span>
    </div>
  );
};
