import React, { useState, useEffect } from 'react';
import type { Preferences, RuntimeStatus } from '../types';
import { api } from '../api';
import {
  Mascot,
  LazyButton,
  RouteBlocked,
  ConfirmSheet,
  BellySkeleton,
  SectionDoodle,
  snorlaxSound,
  BedsideMusicPlayer,
} from './snorlax';
import {
  Moon,
  Star,
  Trash2,
  Shield,
  Key,
  Sliders,
  Check,
  Sun,
  Lock,
  Sparkles,
} from 'lucide-react';

interface SettingsViewProps {
  density?: 'comfortable' | 'compact';
  onDensityChange?: (density: 'comfortable' | 'compact') => void;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
}

interface LazyBadge {
  id: string;
  name: string;
  icon: React.ReactNode;
  earned: boolean;
  desc: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  density = 'comfortable',
  onDensityChange,
  theme = 'light',
  onThemeToggle,
}) => {
  const [initialPrefs, setInitialPrefs] = useState<Preferences | null>(null);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sleep mode / Quiet hours
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [digestTime, setDigestTime] = useState('08:30');
  const [vipInput, setVipInput] = useState('');
  const [vipList, setVipList] = useState<string[]>([]);
  const [vipToRemove, setVipToRemove] = useState<string | null>(null);

  // Gmail OAuth2 & Sync state
  const [gmailStatus, setGmailStatus] = useState<{ authorized: boolean; creds_present: boolean; message: string } | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [exchanging, setExchanging] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [clearingFixtures, setClearingFixtures] = useState(false);
  const [gmailFeedback, setGmailFeedback] = useState<string | null>(null);
  const [gmailError, setGmailError] = useState<string | null>(null);

  // Clear the Fridge confirm sheet
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [fridgeShaking, setFridgeShaking] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [p, r, gStatus, completedTasksRes] = await Promise.all([
        api.getSettings(),
        api.getRuntime(),
        api.getGmailStatus().catch(() => null),
        api.getTasks('completed').catch(() => ({ tasks: [], count: 0 })),
      ]);
      setInitialPrefs(p);
      setRuntime(r);
      if (gStatus) setGmailStatus(gStatus);
      if (completedTasksRes) setCompletedTasksCount(completedTasksRes.count || completedTasksRes.tasks?.length || 0);

      if (p) {
        setQuietStart(p.quiet_hours_start || '22:00');
        setQuietEnd(p.quiet_hours_end || '08:00');
        setDigestTime(p.daily_digest_time || '08:30');
        setVipList(p.vip_senders || []);
      }
    } catch (err: unknown) {
      console.error('Failed to load settings:', err);
      const msg = err instanceof Error ? err.message : "Couldn't load preferences.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasChanges =
    initialPrefs !== null &&
    (quietStart !== (initialPrefs.quiet_hours_start || '22:00') ||
      quietEnd !== (initialPrefs.quiet_hours_end || '08:00') ||
      digestTime !== (initialPrefs.daily_digest_time || '08:30') ||
      JSON.stringify(vipList) !== JSON.stringify(initialPrefs.vip_senders || []));

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) return;
    try {
      setSaving(true);
      snorlaxSound.playClick();
      setError(null);
      const updated = await api.updateSettings({
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        daily_digest_time: digestTime,
        vip_senders: vipList,
      });
      setInitialPrefs(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      const msg = err instanceof Error ? err.message : 'Error saving preferences';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddVip = () => {
    const trimmed = vipInput.trim().toLowerCase();
    if (!trimmed || vipList.includes(trimmed)) return;
    snorlaxSound.playClick();
    setVipList([...vipList, trimmed]);
    setVipInput('');
  };

  const handleConfirmRemoveVip = () => {
    if (!vipToRemove) return;
    snorlaxSound.playClick();
    setVipList(vipList.filter((e) => e !== vipToRemove));
    setVipToRemove(null);
  };

  const handleStartGmailAuth = async () => {
    try {
      setGmailFeedback(null);
      setGmailError(null);
      snorlaxSound.playFlute();
      const res = await api.getGmailAuth();
      if (res.auth_url) {
        setAuthUrl(res.auth_url);
        window.open(res.auth_url, '_blank');
      } else if (res.already_authorized) {
        setGmailFeedback('Gmail is already authorized and ready.');
        const st = await api.getGmailStatus();
        setGmailStatus(st);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start authorization';
      setGmailError(msg);
    }
  };

  const handleExchangeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = authCode.trim();
    if (!code) return;
    try {
      setExchanging(true);
      setGmailError(null);
      snorlaxSound.playClick();
      const res = await api.exchangeGmailCode(code);
      if (res.authorized) {
        setGmailFeedback('Connected! Snorlax is ready to sync.');
        setAuthUrl(null);
        setAuthCode('');
        const st = await api.getGmailStatus();
        setGmailStatus(st);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code or exchange failed';
      setGmailError(msg);
    } finally {
      setExchanging(false);
    }
  };

  const handleSyncGmail = async () => {
    try {
      setSyncingGmail(true);
      snorlaxSound.playFlute();
      setGmailError(null);
      const res = await api.syncGmail(30);
      setGmailFeedback(`Synced ${res.synced_count} emails, analyzed ${res.analyzed_count} into tasks.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync Gmail inbox';
      setGmailError(msg);
    } finally {
      setSyncingGmail(false);
    }
  };

  const handleClearDemoFixtures = async () => {
    try {
      setClearingFixtures(true);
      setFridgeShaking(true);
      snorlaxSound.playClick();
      setShowPurgeConfirm(false);
      setError(null);
      
      setTimeout(async () => {
        try {
          await api.clearFixtures();
          await loadData();
        } catch (err: unknown) {
          console.error('Error clearing demo fixtures:', err);
          const msg = err instanceof Error ? err.message : 'Error clearing mock data';
          setError(msg);
        } finally {
          setClearingFixtures(false);
          setFridgeShaking(false);
        }
      }, 450);
    } catch (err: unknown) {
      console.error('Error clearing demo fixtures:', err);
      const msg = err instanceof Error ? err.message : 'Error clearing mock data';
      setError(msg);
      setClearingFixtures(false);
      setFridgeShaking(false);
    }
  };

  const silencedCount = Math.max(0, 4 - (vipList.length % 3));
  const sleepDepth = silencedCount >= 4 ? 'Slumbering' : silencedCount >= 1 ? 'Snoozing' : 'Dozing';

  // Real-data achievements (Only Local-First Shield starts unlocked by default)
  const lazyAchievements: LazyBadge[] = [
    {
      id: 'local-shield',
      name: 'Local-First Shield',
      icon: <Shield size={24} color="var(--berry-dry)" strokeWidth={2.5} />,
      earned: true,
      desc: 'Zero tokens uploaded to the cloud. 100% offline.',
    },
    {
      id: 'first-sync',
      name: 'First Sync',
      icon: <Key size={24} color={gmailStatus?.authorized ? 'var(--sun)' : 'var(--muted)'} strokeWidth={2.5} />,
      earned: !!gmailStatus?.authorized,
      desc: 'Linked Gmail or synced local attention tasks.',
    },
    {
      id: 'sleep-mode',
      name: 'Sleep Mode Active',
      icon: <Moon size={24} color="var(--snorlax)" strokeWidth={2.5} />,
      earned: !!(quietStart && quietEnd && (quietStart !== '22:00' || quietEnd !== '08:00')),
      desc: 'Configured custom Quiet Hours for restful peace.',
    },
    {
      id: 'first-munch',
      name: 'First Munch',
      icon: <Sparkles size={24} color="var(--snorlax)" strokeWidth={2.5} />,
      earned: completedTasksCount > 0,
      desc: 'Ate a completed task into Leftovers.',
    },
    {
      id: 'vip-friend',
      name: 'VIP Friend Added',
      icon: <Star size={24} color="var(--sun)" strokeWidth={2.5} />,
      earned: vipList.length > 0,
      desc: 'Added trusted friends allowed to wake Snorlax.',
    },
    {
      id: 'fridge-cleared',
      name: 'Fresh Start',
      icon: <Trash2 size={24} color="var(--berry-spicy)" strokeWidth={2.5} />,
      earned: !(runtime?.has_messages ?? true),
      desc: 'Cleared demo mock data for a clean slate.',
    },
  ];

  if (loading) {
    return (
      <BellySkeleton
        message="Still waking up..."
        submessage="Opening Snorlax's Room settings from local SQLite."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {/* Purge Confirm Sheet with Focus Trapping */}
      <ConfirmSheet
        isOpen={showPurgeConfirm}
        title="Clear the fridge?"
        message="Throw away all demo mock snacks? Snorlax will only track your real Gmail messages."
        confirmLabel="Yes, clear the fridge"
        cancelLabel="No, keep them"
        onConfirm={handleClearDemoFixtures}
        onCancel={() => setShowPurgeConfirm(false)}
        variant="danger"
      />

      {/* Remove VIP Confirm Sheet */}
      <ConfirmSheet
        isOpen={!!vipToRemove}
        title="Remove friend from VIP list?"
        message={`Remove "${vipToRemove}"? Emails from this address will no longer wake Snorlax during Sleep Mode.`}
        confirmLabel="Remove friend"
        cancelLabel="Keep friend"
        onConfirm={handleConfirmRemoveVip}
        onCancel={() => setVipToRemove(null)}
        variant="danger"
      />

      {/* ============================================================
          SCENE HEADER: SNORLAX'S ROOM
          Humanized scene tone with handwritten subnote
          ============================================================ */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '32px',
              fontWeight: 900,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            Snorlax's Room
          </h1>
          <SectionDoodle variant="squiggle" color="var(--snorlax)" />
        </div>
        <p
          className="font-handwriting"
          style={{
            fontSize: '22px',
            color: 'var(--muted)',
            margin: 0,
          }}
        >
          Welcome to the bedroom. Keep your voice down, Snorlax is resting.
        </p>
      </section>

      {/* Global Error Banner */}
      {error && <RouteBlocked title="Settings Error" message={error} onRetry={loadData} />}

      {/* ============================================================
          SCENE 1: THE BEDSIDE TABLE (Sleep Mode & Quiet Hours)
          Flat soft-tinted panel holding the sleep arc & native inputs
          ============================================================ */}
      <section
        className="surface-soft-panel"
        style={{
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Moon size={22} color="var(--sun)" strokeWidth={2.5} />
            <h2
              title="Yawn"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              Sleep Mode
            </h2>
          </div>
          <span
            className="font-handwriting"
            style={{
              fontSize: '20px',
              color: theme === 'dark' ? 'var(--sun)' : 'var(--snorlax-dark)',
            }}
          >
            Sleep depth: {sleepDepth}
          </span>
        </div>

        {/* Large Day / Night Arc Illustration with Belly Pose Snorlax */}
        <div
          style={{
            background: 'linear-gradient(90deg, #001F26 0%, #00627A 50%, #FFE4B5 100%)',
            borderRadius: '24px',
            padding: '24px 28px',
            border: '2px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#FFFFFF',
            flexWrap: 'wrap',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'transform 300ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))',
            }}
          >
            <Moon size={28} color="#FFD23F" />
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 800 }}>
                Night: {quietStart}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>Quiet hours active</div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Mascot pose="belly" size="md" alt="Snorlax Belly resting" />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#00323F',
              transition: 'transform 300ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 800 }}>
                Day: {quietEnd}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>Report at {digestTime}</div>
            </div>
            <Sun size={28} color="#D83C2D" />
          </div>
        </div>

        {/* Native Time Form Inputs */}
        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                Quiet hours start
              </label>
              <input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  fontSize: '15px',
                  fontWeight: 700,
                  colorScheme: theme === 'dark' ? 'dark' : 'light',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                Quiet hours end
              </label>
              <input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  fontSize: '15px',
                  fontWeight: 700,
                  colorScheme: theme === 'dark' ? 'dark' : 'light',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                Morning report time
              </label>
              <input
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  fontSize: '15px',
                  fontWeight: 700,
                  colorScheme: theme === 'dark' ? 'dark' : 'light',
                }}
              />
            </div>
          </div>

          {/* Bedside Relaxing Music Player */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                Bedside Poké Flute Radio
              </label>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Relaxing piano cover for focus, reading, and nap time.
              </span>
            </div>
            <BedsideMusicPlayer />
          </div>

          {/* VIP Senders */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                VIP Friends
              </label>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Allowed to wake Snorlax during quiet hours.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="friend@company.internal"
                value={vipInput}
                onChange={(e) => setVipInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVip();
                  }
                }}
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '10px 14px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                }}
              />
              <LazyButton variant="secondary" size="md" type="button" onClick={handleAddVip}>
                Add friend
              </LazyButton>
            </div>

            {/* Friend cards */}
            {vipList.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {vipList.map((email) => (
                  <div
                    key={email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      background: theme === 'dark' ? 'var(--surface-alt)' : 'var(--belly)',
                      color: 'var(--ink)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      border: '1.5px solid var(--border)',
                      animation: 'popIn 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <Star size={15} fill="var(--sun)" color="var(--sun)" className="star-twinkle" />
                      <span style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVipToRemove(email)}
                      aria-label={`Remove ${email}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
            {savedSuccess && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: 'var(--berry-dry)',
                  animation: 'popIn 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards',
                }}
              >
                <Check size={18} strokeWidth={2.5} />
                <span>Saved.</span>
              </span>
            )}

            <div
              style={{
                transform: hasChanges ? 'translateY(-2px)' : 'none',
                boxShadow: hasChanges ? '0 4px 14px rgba(227, 87, 61, 0.35)' : 'none',
                borderRadius: 'var(--radius-md)',
                transition: 'transform 200ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), box-shadow 200ms ease',
              }}
            >
              <LazyButton
                variant="primary"
                size="md"
                type="submit"
                disabled={saving || !hasChanges}
              >
                {saving ? 'Saving...' : 'Save preferences'}
              </LazyButton>
            </div>
          </div>
        </form>
      </section>

      {/* ============================================================
          SCENE 2: GMAIL LINK CABLE
          Flat soft panel for local link cable
          ============================================================ */}
      <section
        className="surface-soft-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={22} color="var(--snorlax)" strokeWidth={2.5} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
              Gmail Link Cable
            </h3>
          </div>

          <span
            className="badge-calm"
            style={{
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: gmailStatus?.authorized ? 'var(--berry-dry-bg)' : 'var(--berry-spicy-bg)',
              color: gmailStatus?.authorized ? 'var(--berry-dry)' : 'var(--berry-spicy)',
              border: `1.5px solid ${gmailStatus?.authorized ? 'var(--berry-dry)' : 'var(--berry-spicy)'}`,
            }}
          >
            {gmailStatus?.authorized ? 'Connected' : 'Not linked'}
          </span>
        </div>

        <p style={{ fontSize: '15px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          SnoozeBox streams unread emails into local SQLite, where Gemma 2 2B triages them completely offline. Nothing leaves your laptop.
        </p>

        {gmailFeedback && (
          <div
            style={{
              background: 'var(--berry-dry-bg)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--berry-dry)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={18} strokeWidth={2.5} />
            <span>{gmailFeedback}</span>
          </div>
        )}

        {gmailError && (
          <RouteBlocked
            title="Link Cable Error"
            message={gmailError}
            compact
          />
        )}

        {!gmailStatus?.authorized ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600 }}>
                Step 1: Open Google consent screen in browser.
              </span>
              <LazyButton variant="secondary" size="sm" onClick={handleStartGmailAuth}>
                Authorize with Google
              </LazyButton>
            </div>

            {authUrl && (
              <form onSubmit={handleExchangeCode} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  required
                  placeholder="Paste authorization code here"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '220px',
                    padding: '8px 12px',
                    background: 'var(--surface)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '14px',
                    color: 'var(--ink)',
                  }}
                />
                <LazyButton variant="primary" size="sm" type="submit" disabled={exchanging}>
                  {exchanging ? 'Linking...' : 'Connect'}
                </LazyButton>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
              Tokens stored safely in <code>quiteos/gmail_token.json</code>.
            </span>
            <LazyButton
              variant="primary"
              size="sm"
              onClick={handleSyncGmail}
              disabled={syncingGmail}
            >
              {syncingGmail ? 'Syncing...' : 'Sync inbox now'}
            </LazyButton>
          </div>
        )}
      </section>

      {/* ============================================================
          SCENE 3: DISPLAY & ATMOSPHERE
          ============================================================ */}
      <section
        className="surface-soft-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={22} color="var(--snorlax)" strokeWidth={2.5} />
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
            Atmosphere & Density
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)', marginBottom: '6px' }}>
              Density
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onDensityChange?.('comfortable')}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: density === 'comfortable' ? 'var(--snorlax)' : 'var(--surface)',
                  color: density === 'comfortable' ? '#FFFFFF' : 'var(--ink)',
                  border: '1.5px solid var(--border)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Comfortable
              </button>
              <button
                onClick={() => onDensityChange?.('compact')}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: density === 'compact' ? 'var(--snorlax)' : 'var(--surface)',
                  color: density === 'compact' ? '#FFFFFF' : 'var(--ink)',
                  border: '1.5px solid var(--border)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Compact
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)', marginBottom: '6px' }}>
              Theme
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onThemeToggle}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: theme === 'light' ? 'var(--snorlax)' : 'var(--surface)',
                  color: theme === 'light' ? '#FFFFFF' : 'var(--ink)',
                  border: '1.5px solid var(--border)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Afternoon Nap
              </button>
              <button
                onClick={onThemeToggle}
                style={{
                  flex: 1,
                  minHeight: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: theme === 'dark' ? 'var(--snorlax)' : 'var(--surface)',
                  color: theme === 'dark' ? '#FFFFFF' : 'var(--ink)',
                  border: '1.5px solid var(--border)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Midnight Snooze
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SCENE 4: PRIVACY (Thick Fat)
          ============================================================ */}
      <section
        className="surface-soft-panel"
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={22} color="var(--berry-dry)" strokeWidth={2.5} />
            <h3
              title="Thick Fat: nothing gets through"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              Thick Fat Privacy
            </h3>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--berry-dry)' }}>
            100% on-device
          </span>
        </div>

        <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          Model: <strong>{runtime?.model_configured || 'gemma2:2b'}</strong> on GPU · Pure-Go SQLite storage.
        </p>
      </section>

      {/* ============================================================
          SCENE 5: DANGER CARD (Clear the fridge)
          The ONLY card with an urgent red outline and hard shadow
          ============================================================ */}
      <section
        className={`surface-urgent-card ${fridgeShaking ? 'fridge-shaking' : ''}`}
        style={{
          border: '3px solid var(--berry-spicy)',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          transition: 'all 0.2s ease',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Trash2 size={20} color="var(--berry-spicy)" strokeWidth={2.5} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 900, color: 'var(--berry-spicy)', margin: 0 }}>
              Clear the fridge
            </h3>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
            Throw away all demo snacks so Snorlax only tracks your real Gmail messages.
          </p>
        </div>

        <LazyButton
          variant="danger"
          size="md"
          onClick={() => {
            snorlaxSound.playClick();
            setShowPurgeConfirm(true);
          }}
          disabled={clearingFixtures}
        >
          {clearingFixtures ? 'Clearing...' : 'Clear the fridge'}
        </LazyButton>
      </section>

      {/* ============================================================
          SCENE 6: LAZY ACHIEVEMENTS
          ============================================================ */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 900, color: 'var(--ink)', margin: 0 }}>
            Lazy Achievements
          </h2>
          <SectionDoodle variant="squiggle" color="var(--sun)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
          {lazyAchievements.map((badge) => {
            const isEarned = badge.earned;
            return (
              <div
                key={badge.id}
                title={badge.desc}
                className={isEarned ? 'achievement-card-shine' : ''}
                style={{
                  background: isEarned
                    ? (theme === 'dark' ? '#252116' : '#FFF9E6')
                    : 'var(--surface-alt)',
                  border: isEarned
                    ? '2px solid var(--sun)'
                    : '1.5px solid var(--border)',
                  boxShadow: isEarned
                    ? '0 2px 8px rgba(255, 210, 63, 0.18)'
                    : 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 12px',
                  textAlign: 'center',
                  opacity: isEarned ? 1 : 0.45,
                  position: 'relative',
                  overflow: 'hidden',
                  animation: isEarned ? 'popIn 350ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {!isEarned && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0.6 }}>
                    <Lock size={12} color="var(--muted)" />
                  </div>
                )}
                <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>
                  {badge.icon}
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                  {badge.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.3 }}>
                  {badge.desc}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          FOOTER CREDIT LINE
          ============================================================ */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--muted)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Snorlax is © Nintendo / Creatures / GAME FREAK. Fan project, not affiliated.
        </div>
      </div>
    </div>
  );
};
