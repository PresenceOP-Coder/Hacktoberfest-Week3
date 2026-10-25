import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

class SnorlaxSoundManager {
  private ctx: AudioContext | null = null;
  public enabled = false;

  private getCtx(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Soft Pokeflute gentle whistle notes (C5, E5, G5)
  playFlute() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.25);
      });
    } catch {
      // safe fallback
    }
  }

  // Soft Munch chew sound
  playMunch() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      [220, 180].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.1);
      });
    } catch {
      // safe fallback
    }
  }

  // Click UI sound
  playClick() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // safe fallback
    }
  }

  // Soft Snorlax belly "hrrrm" rumble (easter egg)
  playHrrrm() {
    const ctx = this.getCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(95, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // safe fallback
    }
  }
}

export const snorlaxSound = new SnorlaxSoundManager();

export const SoundToggle: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    snorlaxSound.enabled = enabled;
  }, [enabled]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    snorlaxSound.enabled = next;
    if (next) {
      snorlaxSound.playFlute();
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? 'Mute sound effects' : 'Unmute sound effects'}
      title={enabled ? 'Sound On (Click to mute)' : 'Sound Muted (Click to enable gentle chimes)'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '44px',
        height: '44px',
        minWidth: '44px',
        minHeight: '44px',
        background: enabled ? 'var(--belly)' : 'var(--surface-alt)',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius-full)',
        color: 'var(--ink)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-btn)',
        transition: 'all 0.15s ease',
      }}
    >
      {enabled ? <Volume2 size={18} strokeWidth={2.5} /> : <VolumeX size={18} strokeWidth={2.5} />}
    </button>
  );
};
