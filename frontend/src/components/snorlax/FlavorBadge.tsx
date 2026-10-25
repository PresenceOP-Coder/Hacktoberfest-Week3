import React from 'react';
import type { Priority, Category } from '../../types';
import {
  BerrySpicy,
  BerrySour,
  BerrySweet,
  BerryDry,
  BerryMystery,
} from './PokemonIcons';

export interface FlavorBadgeProps {
  priority?: Priority;
  category?: Category | string;
  isUnanalyzed?: boolean;
  compact?: boolean;
}

export const getCategoryLabel = (category?: Category | string): string => {
  switch (category) {
    case 'action_required':
      return 'Needs action';
    case 'transactional':
      return 'Update';
    case 'newsletter':
      return 'Newsletter';
    case 'informational':
      return 'FYI';
    case 'unknown':
    default:
      return 'Not analyzed';
  }
};

export const CategoryChip: React.FC<{ category?: Category | string; compact?: boolean }> = ({
  category,
  compact = false,
}) => {
  const label = getCategoryLabel(category);
  const isAction = category === 'action_required';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: compact ? '2px 8px' : '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: isAction ? 'var(--berry-spicy-bg)' : 'var(--surface-alt)',
        color: isAction ? 'var(--berry-spicy)' : 'var(--muted)',
        border: `1.5px solid ${isAction ? 'var(--berry-spicy)' : 'var(--border)'}`,
        fontFamily: 'var(--font-heading)',
        fontSize: compact ? '12px' : '13px',
        fontWeight: 800,
        lineHeight: 1.2,
      }}
    >
      {label}
    </span>
  );
};

export const FlavorBadge: React.FC<FlavorBadgeProps> = ({
  priority = 'unknown',
  category,
  isUnanalyzed = false,
  compact = false,
}) => {
  const iconSize = compact ? 14 : 16;

  // 1. Unanalyzed row -> Single "Not analyzed" badge in Mystery style
  if (isUnanalyzed || priority === 'unknown') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '2px 8px' : '3px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--berry-mystery-bg)',
          color: 'var(--berry-mystery)',
          border: '1.5px solid var(--berry-mystery)',
          fontFamily: 'var(--font-heading)',
          fontSize: compact ? '12px' : '13px',
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        <BerryMystery size={iconSize} />
        <span>Not analyzed</span>
      </span>
    );
  }

  // 2. Newsletter -> Dry Flavor Badge
  if (category === 'newsletter') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '2px 8px' : '3px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--berry-dry-bg)',
          color: 'var(--berry-dry)',
          border: '1.5px solid var(--berry-dry)',
          fontFamily: 'var(--font-heading)',
          fontSize: compact ? '12px' : '13px',
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      >
        <BerryDry size={iconSize} />
        <span>Dry • Newsletter</span>
      </span>
    );
  }

  // 3. Analyzed Priority + Category (e.g., "Sweet • Update", "Spicy • Urgent", "Sour • High")
  let flavor = 'Sweet';
  let icon = <BerrySweet size={iconSize} />;
  let textColor = 'var(--snorlax)';
  let bgColor = 'var(--berry-sweet-bg)';
  let borderColor = 'var(--snorlax)';

  if (priority === 'urgent') {
    flavor = 'Spicy';
    icon = <BerrySpicy size={iconSize} />;
    textColor = 'var(--berry-spicy)';
    bgColor = 'var(--berry-spicy-bg)';
    borderColor = 'var(--berry-spicy)';
  } else if (priority === 'high') {
    flavor = 'Sour';
    icon = <BerrySour size={iconSize} />;
    textColor = 'var(--berry-sour)';
    bgColor = 'var(--berry-sour-bg)';
    borderColor = 'var(--berry-sour)';
  }

  // Build second word: append category when informative, otherwise priority word
  let secondaryWord = priority === 'urgent' ? 'Urgent' : priority === 'high' ? 'High' : 'Normal';
  if (category === 'transactional') {
    secondaryWord = 'Update';
  } else if (category === 'informational') {
    secondaryWord = 'FYI';
  } else if (category === 'action_required') {
    secondaryWord = priority === 'urgent' ? 'Urgent' : priority === 'high' ? 'High' : 'Needs action';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: compact ? '2px 8px' : '3px 10px',
        borderRadius: 'var(--radius-full)',
        background: bgColor,
        color: textColor,
        border: `1.5px solid ${borderColor}`,
        fontFamily: 'var(--font-heading)',
        fontSize: compact ? '12px' : '13px',
        fontWeight: 800,
        lineHeight: 1.2,
      }}
    >
      {icon}
      <span>{flavor} • {secondaryWord}</span>
    </span>
  );
};
