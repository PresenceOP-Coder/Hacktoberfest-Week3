import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Music, Play, Pause } from 'lucide-react';

export class SnorlaxSoundManager {
  private ctx: AudioContext | null = null;
  public enabled = false;
  private bgMusic: HTMLAudioElement | null = null;
  private wasPlayingBeforeHidden = false;
  public volume = 0.28;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.bgMusic && !this.bgMusic.paused) {
            this.bgMusic.pause();
            this.wasPlayingBeforeHidden = true;
            this.notify();
          }
        } else if (this.enabled && this.wasPlayingBeforeHidden) {
          this.bgMusic?.play().catch(() => {});
          this.wasPlayingBeforeHidden = false;
          this.notify();
        }
      });
    }
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // safe fallback
      }
    });
  }

  get isMusicPlaying(): boolean {
    return !!(this.bgMusic && !this.bgMusic.paused);
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.bgMusic) {
      this.bgMusic.volume = this.volume;
    }
    this.notify();
  }

  playMusic() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.bgMusic) {
        this.bgMusic = new Audio('/audio/pokeflute.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = this.volume;
      }
      this.bgMusic.volume = this.volume;
      const promise = this.bgMusic.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Autoplay policy or gesture required
        });
      }
      this.notify();
    } catch {
      // safe fallback
    }
  }

  pauseMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
    this.wasPlayingBeforeHidden = false;
    this.notify();
  }

  toggleMusic() {
    if (this.isMusicPlaying) {
      this.pauseMusic();
    } else {
      this.playMusic();
    }
  }

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
  const [enabled, setEnabled] = useState(snorlaxSound.enabled);
  const [isPlaying, setIsPlaying] = useState(snorlaxSound.isMusicPlaying);

  useEffect(() => {
    return snorlaxSound.subscribe(() => {
      setEnabled(snorlaxSound.enabled);
      setIsPlaying(snorlaxSound.isMusicPlaying);
    });
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    snorlaxSound.enabled = next;
    if (next) {
      snorlaxSound.playFlute();
      snorlaxSound.playMusic();
    } else {
      snorlaxSound.pauseMusic();
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={enabled ? 'Mute Poké Flute music & sound' : 'Unmute Poké Flute music & sound'}
      title={
        enabled
          ? 'Poké Flute (Relaxing Piano) Playing · Click to mute'
          : 'Sound Muted · Click to play Poké Flute Piano & sound effects'
      }
      style={{
        position: 'relative',
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

      {/* Subtle indicator dot when music is actively playing */}
      {enabled && isPlaying && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--snorlax)',
            boxShadow: '0 0 6px var(--snorlax)',
            animation: 'musicNoteFloat 1.8s ease-in-out infinite',
          }}
        />
      )}
    </button>
  );
};

export const BedsideMusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(snorlaxSound.isMusicPlaying);
  const [volume, setVolume] = useState(snorlaxSound.volume);

  useEffect(() => {
    return snorlaxSound.subscribe(() => {
      setIsPlaying(snorlaxSound.isMusicPlaying);
      setVolume(snorlaxSound.volume);
    });
  }, []);

  const handleToggle = () => {
    if (isPlaying) {
      snorlaxSound.pauseMusic();
    } else {
      snorlaxSound.enabled = true;
      snorlaxSound.playMusic();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    snorlaxSound.setVolume(val);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px 20px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1.5px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-full)',
            background: isPlaying ? 'var(--belly)' : 'var(--surface-alt)',
            border: '2px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink)',
            flexShrink: 0,
          }}
        >
          <Music size={20} strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
            Poké Flute (Piano Cover)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
            Pokémon Sleep · Relaxing Piano by Moisés Nieto
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Volume2 size={16} color="var(--muted)" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Bedside music volume"
            style={{
              width: '100px',
              accentColor: 'var(--snorlax)',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', minWidth: '32px' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: isPlaying ? 'var(--sun)' : 'var(--snorlax)',
            color: isPlaying ? '#00323F' : '#FFFFFF',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-btn)',
            transition: 'all 0.15s ease',
          }}
        >
          {isPlaying ? (
            <>
              <Pause size={14} strokeWidth={3} /> Pause Music
            </>
          ) : (
            <>
              <Play size={14} strokeWidth={3} /> Play Music
            </>
          )}
        </button>
      </div>
    </div>
  );
};
