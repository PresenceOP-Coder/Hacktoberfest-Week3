import React, { useState } from 'react';
import type { DigestItem } from '../../types';
import { TypeBadge } from './TypeBadge';
import { HpBar } from './HpBar';
import { PokeButton } from './PokeButton';

interface WildEncounterProps {
  item: DigestItem;
  onCatch: () => void;
  onRun?: () => void;
  onFight?: () => void;
  onBag?: () => void;
}

export const WildEncounter: React.FC<WildEncounterProps> = ({
  item,
  onCatch,
  onRun,
  onFight,
  onBag,
}) => {
  const [showEvidence, setShowEvidence] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);

  // Sender display
  const senderClean = item.from_address.split('<')[0].replace(/"/g, '').trim() || item.from_address;

  const handleFightClick = () => {
    setShowEvidence((prev) => !prev);
    if (onFight) onFight();
  };

  const handleBagClick = () => {
    setBagOpen((prev) => !prev);
    if (onBag) onBag();
  };

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #1d2c42 0%, #132033 100%)',
        border: '3px solid var(--dex-body-border)',
        borderRadius: '12px',
        boxShadow: '4px 4px 0 #09131d',
        overflow: 'hidden',
        animation: 'battle-slide 0.35s ease-out',
        position: 'relative',
      }}
    >
      {/* Wild announcement header */}
      <div
        style={{
          background: 'linear-gradient(90deg, #C03028 0%, #E3350D 100%)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid var(--dex-body-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⚡</span>
          <span
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: '9px',
              color: '#FFF',
              letterSpacing: '0.04em',
            }}
          >
            A WILD DEADLINE APPEARED!
          </span>
        </div>
        <TypeBadge priority={item.priority} category={item.category} size="sm" />
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Opponent Info Plate (top-right styled battle plate) */}
        <div
          style={{
            background: 'var(--paper)',
            color: 'var(--ink)',
            border: '3px solid var(--ink)',
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '3px 3px 0 var(--ink)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--font-button)' }}>
                OPPONENT: {senderClean}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'var(--font-body)', color: 'var(--ink)' }}>
                {item.subject}
              </h3>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-button)',
                fontSize: '10px',
                color: 'var(--dex-red)',
                border: '1px solid var(--dex-red)',
                padding: '1px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              Lv. 1 Urgent
            </span>
          </div>

          <HpBar isOverdue={false} label="TIME HP" />
        </div>

        {/* Action Callout if present */}
        {item.action_text && (
          <div
            style={{
              background: '#0d1724',
              border: '2px solid #ff7a3d',
              borderRadius: '6px',
              padding: '10px 12px',
              color: '#FFE8D6',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span style={{ color: '#FF7A3D', fontFamily: 'var(--font-button)', fontSize: '10px', display: 'block', marginBottom: '2px' }}>
              REQUIRED ACTION:
            </span>
            {item.action_text}
          </div>
        )}

        {/* Pokédex Entry quote bubble */}
        {item.evidence && (
          <div
            style={{
              background: '#182b42',
              border: '2px dashed #4A6580',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#B0C8E0',
              fontStyle: 'italic',
            }}
          >
            <div style={{ fontFamily: 'var(--font-button)', fontSize: '9px', color: 'var(--lens-blue)', marginBottom: '4px', fontStyle: 'normal' }}>
              📖 POKÉDEX ENTRY (VERBATIM EVIDENCE):
            </div>
            "{item.evidence}"
          </div>
        )}

        {/* Expanded Fight View / Raw Info */}
        {showEvidence && (
          <div
            style={{
              background: '#0a1420',
              border: '2px solid #2a3f5a',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '12px',
              color: 'var(--text-main)',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontFamily: 'var(--font-button)', fontSize: '9px', color: '#FFD23F', marginBottom: '4px' }}>
              BATTLE SCAN:
            </div>
            <div><strong>From:</strong> {item.from_address}</div>
            <div><strong>Received:</strong> {item.received_at ? new Date(item.received_at).toLocaleString() : 'Recent'}</div>
            <div><strong>Message ID:</strong> <code>{item.message_id}</code></div>
          </div>
        )}

        {/* Bag info */}
        {bagOpen && (
          <div
            style={{
              background: '#0e1e30',
              border: '2px solid #4880C8',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#C0D8F0',
            }}
          >
            <span style={{ fontFamily: 'var(--font-button)', fontSize: '9px', color: '#7FB3E8', display: 'block', marginBottom: '2px' }}>
              TRAINER'S BAG:
            </span>
            Protected by SnoozeBox Local Privacy. Running on offline Gemma 2 2B engine. No external tracker beacons allowed.
          </div>
        )}

        {/* 2x2 Battle Menu (FIGHT / BAG / CATCH / RUN) */}
        <div>
          <div
            style={{
              fontFamily: 'var(--font-button)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              marginBottom: '6px',
              letterSpacing: '0.05em',
            }}
          >
            WHAT WILL TRAINER DO?
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <PokeButton variant="fight" onClick={handleFightClick}>
              ⚔ FIGHT {showEvidence ? '▲' : '▼'}
            </PokeButton>
            <PokeButton variant="bag" onClick={handleBagClick}>
              🎒 BAG {bagOpen ? '▲' : '▼'}
            </PokeButton>
            <PokeButton variant="catch" onClick={onCatch}>
              ⚾ CATCH!
            </PokeButton>
            <PokeButton variant="run" onClick={onRun || onCatch}>
              🏃 RUN (24h)
            </PokeButton>
          </div>
        </div>
      </div>
    </div>
  );
};
