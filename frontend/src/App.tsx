import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { DailyDigestView } from './components/DailyDigestView';
import { AttentionDebtView } from './components/AttentionDebtView';
import { InboxView } from './components/InboxView';
import { SettingsView } from './components/SettingsView';
import { ErrorBoundary } from './ErrorBoundary';
import { api } from './api';
import type { RuntimeStatus } from './types';
import { setupTabVisibilityListener } from './hooks/useReducedMotion';
import {
  Mascot,
  RouteBlocked,
  SleepyRoute,
  SoundToggle,
  snorlaxSound,
} from './components/snorlax';
import { BerryRain } from './components/snorlax/BerryRain';
import { KeyboardHelpSheet } from './components/snorlax/KeyboardHelpSheet';
import {
  Sun,
  Moon,
  SunMedium,
  ClipboardList,
  Inbox,
  Settings,
  Cpu,
} from 'lucide-react';

export type Tab = 'digest' | 'attention' | 'inbox' | 'settings';
export type ThemeMode = 'light' | 'dark';
export type DensityMode = 'comfortable' | 'compact';

interface TabItem {
  key: Tab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  { key: 'digest',    label: 'Morning',  icon: <SunMedium size={18} strokeWidth={2.5} /> },
  { key: 'attention', label: 'Tasks',    icon: <ClipboardList size={18} strokeWidth={2.5} /> },
  { key: 'inbox',     label: 'Inbox',    icon: <Inbox size={18} strokeWidth={2.5} /> },
  { key: 'settings',  label: 'Settings', icon: <Settings size={18} strokeWidth={2.5} /> },
];

const getInitialTab = (): Tab => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as Tab;
    if (tabParam && ['digest', 'attention', 'inbox', 'settings'].includes(tabParam)) {
      return tabParam;
    }
  }
  return 'digest';
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme') as ThemeMode;
    if (themeParam && ['light', 'dark'].includes(themeParam)) {
      return themeParam;
    }
  }
  return 'light';
};

const getInitialDensity = (): DensityMode => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const densityParam = params.get('density') as DensityMode;
    if (densityParam && ['comfortable', 'compact'].includes(densityParam)) {
      return densityParam;
    }
  }
  return 'comfortable';
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [density, setDensity] = useState<DensityMode>(getInitialDensity);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  // Easter eggs & Help sheet
  const [showBerryRain, setShowBerryRain] = useState(false);
  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [urgentCount, setUrgentCount] = useState(0);

  // Tab sliding indicator measurement
  const tabRefs = useRef<{ [key in Tab]?: HTMLButtonElement | null }>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updatePill = () => {
      const activeBtn = tabRefs.current[activeTab];
      if (activeBtn) {
        setPillStyle({
          left: activeBtn.offsetLeft,
          width: activeBtn.offsetWidth,
          opacity: 1,
        });
      }
    };
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [activeTab]);

  // Tab visibility listener (pauses loops when tab hidden)
  useEffect(() => {
    const cleanup = setupTabVisibilityListener();
    return cleanup;
  }, []);

  // Konami code tracker
  const konamiSeq = useRef<string[]>([]);
  const gPrefix = useRef<boolean>(false);
  const gTimer = useRef<number | null>(null);

  // Sync data attributes with document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  // Dynamic Browser Tab Title: "zzz SnoozeBox" normally, or "(N) SnoozeBox" when urgent items exist
  useEffect(() => {
    if (urgentCount > 0) {
      document.title = `(${urgentCount}) SnoozeBox`;
    } else {
      document.title = 'zzz SnoozeBox';
    }
  }, [urgentCount]);

  const checkConnection = async () => {
    try {
      setReconnecting(true);
      const [runtimeData, digestData] = await Promise.all([
        api.getRuntime(),
        api.getDigest().catch(() => null),
      ]);
      setRuntime(runtimeData);
      setBackendError(null);
      if (digestData?.urgent_items) {
        setUrgentCount(digestData.urgent_items.length);
      }
    } catch (err: unknown) {
      console.error('Error fetching runtime:', err);
      const msg = err instanceof Error ? err.message : 'Cannot connect to SnoozeBox backend';
      setBackendError(msg);
    } finally {
      setReconnecting(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleTabChange = (key: Tab) => {
    snorlaxSound.playClick();
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?tab=${key}`);
    }
  };

  const toggleTheme = () => {
    snorlaxSound.playClick();
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Keyboard navigation: "g m", "g t", "g i", "g s", "?", and Konami code
  useEffect(() => {
    const konamiTarget = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a'
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // 1. Konami Code check
      const key = e.key;
      konamiSeq.current.push(key);
      if (konamiSeq.current.length > konamiTarget.length) {
        konamiSeq.current.shift();
      }
      if (konamiSeq.current.join(',').toLowerCase() === konamiTarget.join(',').toLowerCase()) {
        snorlaxSound.playFlute();
        setShowBerryRain(true);
        setTimeout(() => setShowBerryRain(false), 2000);
        konamiSeq.current = [];
      }

      // 2. Help Sheet ("?")
      if (key === '?') {
        e.preventDefault();
        setShowHelpSheet(true);
        return;
      }

      // 3. "g" sequence shortcuts ("g m", "g t", "g i", "g s")
      if (key.toLowerCase() === 'g' && !gPrefix.current) {
        gPrefix.current = true;
        if (gTimer.current) window.clearTimeout(gTimer.current);
        gTimer.current = window.setTimeout(() => {
          gPrefix.current = false;
        }, 1200);
        return;
      }

      if (gPrefix.current) {
        gPrefix.current = false;
        if (gTimer.current) window.clearTimeout(gTimer.current);

        const lowerKey = key.toLowerCase();
        if (lowerKey === 'm') {
          e.preventDefault();
          handleTabChange('digest');
        } else if (lowerKey === 't') {
          e.preventDefault();
          handleTabChange('attention');
        } else if (lowerKey === 'i') {
          e.preventDefault();
          handleTabChange('inbox');
        } else if (lowerKey === 's') {
          e.preventDefault();
          handleTabChange('settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isModelOnline = !backendError && !!runtime?.model_configured;
  const modelName = runtime?.model_configured || 'gemma2:2b';

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--ink)',
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* Konami Berry Rain Overlay */}
      <BerryRain active={showBerryRain} />

      {/* Keyboard Shortcuts Help Sheet */}
      <KeyboardHelpSheet isOpen={showHelpSheet} onClose={() => setShowHelpSheet(false)} />

      {/* ============================================================
          TOP COZY APP BAR (Two zones, clean gutters, never wraps awkwardly)
          ============================================================ */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '3px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 80,
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '1080px',
            margin: '0 auto',
            padding: '10px 24px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Zone 1 (Left): Brand: Pixel logo "SnoozeBox" + small sleeping Munchlax BESIDE it */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => handleTabChange('digest')}
              title="SnoozeBox — Your inbox, asleep on the job. Mostly."
            >
              <Mascot pose="munchlax" size="sm" alt="Sleeping Munchlax beside SnoozeBox" />
            </div>

            <span
              onClick={() => handleTabChange('digest')}
              style={{
                fontFamily: 'var(--font-logo)',
                fontSize: '18px',
                color: 'var(--snorlax-dark)',
                letterSpacing: '0.04em',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              SnoozeBox
            </span>
          </div>

          {/* Center: Soft Pill Navigation Tabs (Desktop / Tablet ≥680px) with sliding active pill */}
          <nav
            className="hide-on-mobile"
            style={{
              position: 'relative',
              display: 'flex',
              gap: '6px',
              background: 'var(--surface-alt)',
              padding: '4px 6px',
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--border)',
            }}
          >
            {/* Sliding Shared Active Pill Indicator */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                left: `${pillStyle.left}px`,
                width: `${pillStyle.width}px`,
                borderRadius: 'var(--radius-full)',
                background: 'var(--snorlax)',
                boxShadow: 'var(--shadow-btn)',
                transition: 'left var(--m-base, 250ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), width var(--m-base, 250ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), opacity 150ms ease',
                opacity: pillStyle.opacity,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {/* Cream belly dot indicator */}
              <span
                style={{
                  position: 'absolute',
                  bottom: '3px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '8px',
                  height: '3px',
                  borderRadius: '2px',
                  background: 'var(--belly)',
                }}
              />
            </div>

            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  ref={(el) => {
                    tabRefs.current[tab.key] = el;
                  }}
                  onClick={() => handleTabChange(tab.key)}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    minHeight: '44px',
                    borderRadius: 'var(--radius-full)',
                    background: isActive && pillStyle.width === 0 ? 'var(--snorlax)' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--ink)',
                    fontFamily: 'var(--font-heading)',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 2 (Right): GPU pill, Sound toggle, Theme toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* GPU Pill (single line, tooltip "Runs on your laptop. Nothing leaves it.") */}
            <div
              title="Runs on your laptop. Nothing leaves it."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '44px',
                padding: '0 14px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--surface-alt)',
                border: '2px solid var(--border)',
                fontFamily: 'var(--font-heading)',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--ink)',
                whiteSpace: 'nowrap',
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              <Cpu size={16} strokeWidth={2.5} color="var(--snorlax-dark)" />
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: backendError ? '#FF5555' : isModelOnline ? '#2E7D32' : '#FFD23F',
                  boxShadow: isModelOnline ? '0 0 6px #2E7D32' : 'none',
                }}
              />
              <span className="gpu-pill-text">
                {reconnecting
                  ? 'Connecting...'
                  : backendError
                  ? 'Offline'
                  : `${modelName} · GPU`}
              </span>
            </div>

            {/* Sound Toggle (icon-only, muted by default) */}
            <SoundToggle />

            {/* Theme Toggle (icon-only, Sun / Moon with 300ms spring rotation & scaling) */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to Midnight Snooze theme' : 'Switch to Afternoon Nap theme'}
              title={theme === 'light' ? 'Switch to Midnight Snooze (Dark)' : 'Switch to Afternoon Nap (Light)'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                background: 'var(--surface-alt)',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--ink)',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-btn)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.3)',
                  opacity: theme === 'light' ? 1 : 0,
                  transition: 'transform 300ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), opacity 200ms ease',
                }}
              >
                <Sun size={18} strokeWidth={2.5} />
              </span>
              <span
                style={{
                  position: 'absolute',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.3)',
                  opacity: theme === 'dark' ? 1 : 0,
                  transition: 'transform 300ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), opacity 200ms ease',
                }}
              >
                <Moon size={18} strokeWidth={2.5} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================
          MAIN CONTENT AREA (Max 1080px, 24px gutters, min-height: 100dvh)
          ============================================================ */}
      <main
        style={{
          flex: 1,
          maxWidth: '1080px',
          width: '100%',
          margin: '0 auto',
          padding: '24px 24px 40px',
          boxSizing: 'border-box',
        }}
      >
        {/* When backend is offline, display a single clear RouteBlocked screen instead of cascading duplicates */}
        {backendError ? (
          <RouteBlocked
            title="Route blocked. Snorlax is napping here."
            message={`Cannot connect to SnoozeBox Go service on port 8080 (${backendError}). Please make sure snoozebox is running on your machine.`}
            onRetry={checkConnection}
          />
        ) : (
          <ErrorBoundary>
            <div key={activeTab} className="screen-fade-in">
              {activeTab === 'digest'    && <DailyDigestView />}
              {activeTab === 'attention' && <AttentionDebtView />}
              {activeTab === 'inbox'     && <InboxView />}
              {activeTab === 'settings'  && (
                <SettingsView
                  density={density}
                  onDensityChange={setDensity}
                  theme={theme}
                  onThemeToggle={toggleTheme}
                />
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>

      {/* ============================================================
          SLEEPY ROUTE FOOTER (Pinned to bottom of viewport/content)
          ============================================================ */}
      <SleepyRoute />

      {/* ============================================================
          MOBILE BOTTOM NAV (≤680px)
          ============================================================ */}
      <nav
        className="mobile-bottom-nav"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          background: 'var(--surface)',
          borderTop: '3px solid var(--border)',
          padding: '6px 16px 12px',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 -4px 14px rgba(0,0,0,0.1)',
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minWidth: '60px',
                minHeight: '44px',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--snorlax)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--ink)',
                fontFamily: 'var(--font-heading)',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Responsive media styles */}
      <style>{`
        @media (max-width: 680px) {
          .hide-on-mobile {
            display: none !important;
          }
          .mobile-bottom-nav {
            display: flex !important;
          }
          .gpu-pill-text {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
