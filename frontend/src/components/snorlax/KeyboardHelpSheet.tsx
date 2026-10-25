import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardHelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpSheet: React.FC<KeyboardHelpSheetProps> = ({ isOpen, onClose }) => {
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeBtnRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'g then m', desc: 'Go to Morning Briefing' },
    { key: 'g then t', desc: 'Go to Tasks (Attention Debt)' },
    { key: 'g then i', desc: 'Go to Inbox Triage' },
    { key: 'g then s', desc: 'Go to Settings' },
    { key: '?', desc: 'Show this keyboard guide' },
    { key: 'Esc', desc: 'Close dialogs and sheets' },
    { key: '↑ ↑ ↓ ↓ ← → ← → B A', desc: 'Konami Code (Play Poké Flute & berry rain!)' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 31, 38, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '3px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: 'var(--shadow-chunky)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Keyboard size={24} color="var(--snorlax)" strokeWidth={2.5} />
            <h3
              id="keyboard-help-title"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              SnoozeBox Shortcuts
            </h3>
          </div>

          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              color: 'var(--muted)',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--surface-alt)',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 600 }}>{s.desc}</span>
              <kbd
                style={{
                  fontFamily: 'var(--font-logo)',
                  fontSize: '12px',
                  background: 'var(--surface)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--border)',
                  color: 'var(--snorlax)',
                  boxShadow: '1px 1px 0 var(--border)',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              minHeight: '44px',
              padding: '0 20px',
              background: 'var(--snorlax)',
              color: '#FFFFFF',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-heading)',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-btn)',
            }}
          >
            Got it, stay lazy
          </button>
        </div>
      </div>
    </div>
  );
};
