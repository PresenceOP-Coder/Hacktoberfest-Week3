import React, { useState, useEffect, useCallback } from 'react';

interface DialogBoxProps {
  speaker?: string;
  text: string;
  typewriterSpeed?: number; // ms per character
  onDone?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const DialogBox: React.FC<DialogBoxProps> = ({
  speaker,
  text,
  typewriterSpeed = 28,
  onDone,
  className = '',
  children,
}) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  const skipToEnd = useCallback(() => {
    setDisplayed(text);
    setDone(true);
    onDone?.();
  }, [text, onDone]);

  useEffect(() => {
    // prefers-reduced-motion: show full text immediately
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      skipToEnd();
      return;
    }

    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
        onDone?.();
      }
    }, typewriterSpeed);
    return () => clearInterval(id);
  }, [text, typewriterSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={className}
      onClick={!done ? skipToEnd : undefined}
      style={{
        position: 'relative',
        background: 'var(--paper)',
        color: 'var(--ink)',
        border: '3px solid var(--ink)',
        boxShadow: '4px 4px 0 var(--ink)',
        borderRadius: '8px',
        padding: '14px 18px 18px',
        cursor: done ? 'default' : 'pointer',
        userSelect: 'none',
      }}
    >
      {speaker && (
        <div
          style={{
            position: 'absolute',
            top: '-14px',
            left: '16px',
            background: 'var(--dex-red)',
            color: '#fff',
            fontFamily: 'var(--font-button)',
            fontSize: '10px',
            padding: '2px 10px',
            borderRadius: '4px',
            border: '2px solid var(--ink)',
            letterSpacing: '0.05em',
          }}
        >
          {speaker}
        </div>
      )}

      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontWeight: 700,
          lineHeight: 1.6,
          minHeight: '2em',
        }}
      >
        {displayed}
        {!done && (
          <span
            style={{
              display: 'inline-block',
              width: '2px',
              height: '1em',
              background: 'var(--ink)',
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'typewriter-cursor 0.6s step-end infinite',
            }}
          />
        )}
      </p>

      {/* Blinking ▼ triangle — only shown when done */}
      {done && (
        <span
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '12px',
            color: 'var(--dex-red)',
            fontSize: '12px',
            animation: 'led-blink 0.8s step-end infinite',
          }}
        >
          ▼
        </span>
      )}

      {children && (
        <div style={{ marginTop: '12px' }}>
          {children}
        </div>
      )}
    </div>
  );
};
