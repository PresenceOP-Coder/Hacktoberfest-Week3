import React, { useState, useEffect } from 'react';

// WebAudio Sound Manager (No external files needed)
class SoundFx {
  private ctx: AudioContext | null = null;
  public enabled = false;

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playBlip(freq = 600, duration = 0.05) {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext failure ignored
    }
  }

  playCatch() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.12);
      });
    } catch {
      // ignored
    }
  }
}

export const soundFx = new SoundFx();

export const SoundToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    soundFx.enabled = enabled;
  }, [enabled]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    soundFx.enabled = next;
    if (next) {
      soundFx.playBlip(880, 0.08);
    }
  };

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Sound On (WebAudio)' : 'Sound Off (Default — SnoozeBox is quiet)'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        background: enabled ? 'rgba(93, 187, 99, 0.2)' : 'rgba(0, 0, 0, 0.25)',
        border: `2px solid ${enabled ? 'var(--grass)' : '#3a4a5a'}`,
        borderRadius: '6px',
        fontFamily: 'var(--font-button)',
        fontSize: '9px',
        color: enabled ? 'var(--grass)' : '#7A9BBF',
        cursor: 'pointer',
      }}
    >
      <span>{enabled ? '🔊 SFX' : '🔇 MUTE'}</span>
    </button>
  );
};
