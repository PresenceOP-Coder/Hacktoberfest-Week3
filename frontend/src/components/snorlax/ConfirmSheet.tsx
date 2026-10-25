import React, { useEffect, useRef } from 'react';
import { LazyButton } from './LazyButton';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmSheetProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'primary';
}

export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Yes, let it go',
  cancelLabel = 'No, keep it',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      lastActiveElementRef.current = document.activeElement as HTMLElement;
      // Focus confirm or cancel button
      setTimeout(() => {
        if (variant === 'danger') {
          cancelBtnRef.current?.focus();
        } else {
          confirmBtnRef.current?.focus();
        }
      }, 50);

      // Focus trapping handler
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
          return;
        }

        if (e.key === 'Tab') {
          if (!dialogRef.current) return;
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (lastActiveElementRef.current) {
          lastActiveElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onCancel, variant]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-sheet-title"
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
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        style={{
          background: 'var(--surface)',
          border: '3px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--shadow-chunky)',
          animation: 'popIn 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {variant === 'danger' ? (
              <AlertTriangle size={24} color="var(--berry-spicy)" strokeWidth={2.5} />
            ) : (
              <Trash2 size={24} color="var(--snorlax)" strokeWidth={2.5} />
            )}
            <h3
              id="confirm-sheet-title"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              {title}
            </h3>
          </div>

          <button
            onClick={onCancel}
            aria-label="Close dialog"
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

        <p
          style={{
            fontSize: '16px',
            lineHeight: 1.5,
            color: 'var(--muted)',
            marginBottom: '24px',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
          <LazyButton
            ref={cancelBtnRef}
            variant="ghost"
            size="md"
            onClick={onCancel}
          >
            {cancelLabel}
          </LazyButton>

          <LazyButton
            ref={confirmBtnRef}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
          >
            {confirmLabel}
          </LazyButton>
        </div>
      </div>
    </div>
  );
};
