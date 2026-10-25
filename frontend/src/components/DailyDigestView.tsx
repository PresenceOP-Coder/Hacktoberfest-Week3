import React, { useState, useEffect } from 'react';
import type { Digest, DigestTaskItem } from '../types';
import { api } from '../api';
import { useCountUp } from '../hooks/useCountUp';
import { Collapse } from './motion/Collapse';
import {
  Mascot,
  SpeechBubble,
  NapMeter,
  FlavorBadge,
  CategoryChip,
  LazyButton,
  PokeFluteButton,
  MunchToast,
  RouteBlocked,
  BellySkeleton,
  HandDrawnUnderline,
  HalfEatenBerry,
  SectionDoodle,
  StickyNoteTip,
  snorlaxSound,
} from './snorlax';
import {
  pluralize,
  getSnorlaxSpeech,
  pickCopy,
  EMPTY_STATES,
} from '../utils/humanCopy';
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Check,
  Moon,
  Archive,
} from 'lucide-react';

export const DailyDigestView: React.FC = () => {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllDueSoon, setShowAllDueSoon] = useState(false);
  const [snackPileOpen, setSnackPileOpen] = useState(false);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // Exiting items animation tracker (taskId -> 'munch' | 'snooze')
  const [exitingItems, setExitingItems] = useState<{ [id: string]: 'munch' | 'snooze' }>({});

  // Munch Toast notification state
  const [munchToast, setMunchToast] = useState<{ id: string; title: string; action: 'done' | 'snooze' } | null>(null);

  const loadDigest = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDigest();
      setDigest(data);
    } catch (err: unknown) {
      console.error('Failed to load digest:', err);
      const msg = err instanceof Error ? err.message : "Couldn't load your morning report.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setWakingUp(true);
      snorlaxSound.playFlute();
      setError(null);
      const data = await api.generateDigest();
      setDigest(data);
    } catch (err: unknown) {
      console.error('Failed to regenerate digest:', err);
      const msg = err instanceof Error ? err.message : "Couldn't wake Snorlax.";
      setError(msg);
    } finally {
      setRefreshing(false);
      setTimeout(() => setWakingUp(false), 800);
    }
  };

  const handleCompleteTask = async (taskId: string, title: string) => {
    try {
      snorlaxSound.playMunch();
      setWakingUp(true);
      setExitingItems((prev) => ({ ...prev, [taskId]: 'munch' }));
      setMunchToast({ id: taskId, title, action: 'done' });
      
      // Allow the 320ms cardMunchOut animation to play smoothly
      setTimeout(async () => {
        try {
          await api.updateTask(taskId, { status: 'completed' });
          await loadDigest();
        } finally {
          setExitingItems((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
          setWakingUp(false);
        }
      }, 320);
    } catch (err) {
      console.error('Error completing task:', err);
      setExitingItems((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      setWakingUp(false);
    }
  };

  const handleSnooze = async (taskId: string, title: string) => {
    try {
      snorlaxSound.playClick();
      setExitingItems((prev) => ({ ...prev, [taskId]: 'snooze' }));
      setMunchToast({ id: taskId, title, action: 'snooze' });
      
      // Allow the 280ms cardSnoozeOut animation to play smoothly
      setTimeout(async () => {
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await api.snoozeTask(taskId, tomorrow.toISOString());
          await loadDigest();
        } finally {
          setExitingItems((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
        }
      }, 280);
    } catch (err) {
      console.error('Error snoozing task:', err);
      setExitingItems((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  };

  const handleUndo = async () => {
    if (!munchToast) return;
    try {
      snorlaxSound.playClick();
      await api.updateTask(munchToast.id, { status: 'detected' });
      setMunchToast(null);
      await loadDigest();
    } catch (err) {
      console.error('Error undoing task:', err);
    }
  };

  // Naps saved front-end calculation (represented as one human sentence)
  const totalEmailsTriaged = (digest?.total_items || ((digest?.urgent_items?.length || 0) + (digest?.pending_actions?.length || 0) + (digest?.low_priority_news?.length || 0))) || 8;
  const minutesSaved = Math.max(2, Math.round((totalEmailsTriaged * 20) / 60));
  const newslettersSilenced = digest?.low_priority_news?.length || 0;

  const animatedMinutes = useCountUp(minutesSaved);
  const animatedNewsletters = useCountUp(newslettersSilenced);

  useEffect(() => {
    loadDigest();
  }, []);

  if (loading) {
    return (
      <BellySkeleton
        message="Snorlax is yawning..."
        submessage="Reading your mail slowly, on purpose."
      />
    );
  }

  if (error || !digest) {
    return (
      <RouteBlocked
        title="Couldn't sync. Snorlax is blocking the road."
        message={error || 'Could not fetch your briefing from the local SQLite database.'}
        onRetry={loadDigest}
      />
    );
  }

  const rawUrgentItems = digest.urgent_items || [];
  const rawDueSoonTasks = digest.due_soon_tasks || [];
  const lowPriorityNews = digest.low_priority_news || [];

  // Deduping logic: Tasks in urgent cannot duplicate in due_soon
  const urgentIdentifiers = new Set<string>();
  rawUrgentItems.forEach((item) => {
    if (item.message_id) urgentIdentifiers.add(item.message_id);
    if (item.subject) urgentIdentifiers.add(item.subject.toLowerCase().trim());
  });

  const now = Date.now();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  const dedupedDueSoon: DigestTaskItem[] = rawDueSoonTasks.filter((t) => {
    const isOpen = t.status !== 'completed' && t.status !== 'dismissed';
    if (!isOpen) return false;

    if (!t.due_at) return false;
    const dueTime = new Date(t.due_at).getTime();
    if (isNaN(dueTime)) return false;
    const diff = dueTime - now;
    const isWithin48h = diff <= fortyEightHoursMs;
    if (!isWithin48h) return false;

    if (t.task_id && urgentIdentifiers.has(t.task_id)) return false;
    if (t.title && urgentIdentifiers.has(t.title.toLowerCase().trim())) return false;

    return true;
  });

  const urgentCount = rawUrgentItems.length;
  const dueSoonCount = dedupedDueSoon.length;
  const hasUrgent = urgentCount > 0;
  const displayedDueSoon = showAllDueSoon ? dedupedDueSoon : dedupedDueSoon.slice(0, 6);

  // Snorlax Mood System based on real data:
  // - 0 urgent: asleep, Zzz drifting (hero size reference image)
  // - 1-2 urgent: one eye cracked open, sleepy-grumpy tone
  // - 3+ urgent: fully awake, arms up, panicked
  // - All done today: belly up, content, tiny crumbs
  const allDoneToday = urgentCount === 0 && dueSoonCount === 0 && (digest.total_items || 0) > 0;
  const snorlaxSpeech = getSnorlaxSpeech(urgentCount, dueSoonCount, allDoneToday);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {/* Munch Toast with 5s Undo (Bottom-Center) */}
      {munchToast && (
        <MunchToast
          taskTitle={munchToast.title}
          action={munchToast.action}
          onUndo={handleUndo}
          onDismiss={() => setMunchToast(null)}
        />
      )}

      {/* ============================================================
          1. ASYMMETRIC BREAKOUT HERO
          Real reference image Snorlax (>=240px tall) on left.
          Background strictly matches #00647B teal for 100% seamless blend.
          No ugly box borders or protruding card shadows.
          Taller speech bubble aligned to head with tagline under it.
          "Wake me up" cream button directly below bubble.
          Mobile: Snorlax on top, bubble below.
          Sticky-note tip anchored inside content column at top-right corner.
          ============================================================ */}
      <div style={{ position: 'relative', marginTop: '12px' }}>
        {/* Taped sticky note tip anchored in content column, overlapping top-right corner */}
        <div
          className="morning-sticky-tip-wrapper"
          style={{
            position: 'absolute',
            top: '-20px',
            right: '24px',
            zIndex: 10,
          }}
        >
          <StickyNoteTip tipText="Tip: press g then t anytime to jump straight to Tasks." />
        </div>

        <section
          style={{
            position: 'relative',
            background: '#00647B', // Exact match with snorlax-reference.jpg
            border: '3px solid var(--snorlax-outline)',
            borderRadius: '26px 30px 24px 28px',
            padding: '24px 28px',
            boxShadow: 'var(--shadow-chunky)',
            color: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          <div
            className="morning-hero-layout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            {/* Left: Large Reference Snorlax blending seamlessly into #00647B */}
            <div
              className={`morning-hero-snorlax ${wakingUp ? 'snorlax-stretch-yawn' : ''}`}
              style={{
                flexShrink: 0,
                width: '260px',
                height: '240px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
                animation: 'fadeUp 350ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1))',
              }}
            >
              <Mascot
                pose="sleeping"
                size="hero"
                alt="Sleeping Snorlax reference in Morning hero"
              />
            </div>

            {/* Right: Taller Speech Bubble & Directly Aligned Wake-Up Button */}
            <div
              className="morning-hero-bubble-col"
              style={{
                flex: 1,
                minWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
                zIndex: 2,
              }}
            >
              <SpeechBubble
                tailPosition="left"
                style={{
                  minHeight: '92px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '18px 24px',
                  animation: 'popIn 250ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) 150ms both',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.45, color: 'var(--ink)' }}>
                  {snorlaxSpeech}
                </div>
                <div
                  className="font-handwriting"
                  style={{
                    marginTop: '8px',
                    fontSize: '21px',
                    color: 'var(--snorlax-dark)',
                    lineHeight: 1.2,
                  }}
                >
                  Your inbox, asleep on the job. Mostly.
                </div>
              </SpeechBubble>

              {/* Directly below the bubble: "Wake me up" button with generous spacing */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  paddingLeft: '4px',
                  paddingTop: '4px',
                  animation: 'fadeUp 250ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) 220ms both',
                }}
              >
                <PokeFluteButton
                  label="Wake me up"
                  tooltip="Refresh the digest"
                  onClick={handleRefresh}
                  loading={refreshing}
                  size="sm"
                  style={{
                    background: 'var(--belly-cream)',
                    color: 'var(--snorlax-outline)',
                    border: '2px solid var(--snorlax-outline)',
                    boxShadow: '2px 2px 0 var(--snorlax-outline)',
                    fontWeight: 800,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Responsive mobile styling for hero */}
          <style>{`
            @media (max-width: 680px) {
              .morning-sticky-tip-wrapper {
                display: none !important;
              }
              .morning-hero-layout {
                flex-direction: column !important;
                align-items: center !important;
                gap: 16px !important;
              }
              .morning-hero-snorlax {
                width: 100% !important;
                height: 200px !important;
              }
              .morning-hero-bubble-col {
                width: 100% !important;
                align-items: center !important;
                text-align: center;
              }
            }
          `}</style>
        </section>
      </div>

      {/* ============================================================
          2. NAPS SAVED: ONE SINGLE SENTENCE WITH MARKER UNDERLINE
          No tiles, no icon squares. Sits right under hero.
          ============================================================ */}
      <section
        style={{
          padding: '0 4px',
          marginTop: '-16px',
        }}
      >
        <p
          style={{
            fontSize: '17px',
            lineHeight: 1.6,
            color: 'var(--muted)',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Since you started, I've saved you about{' '}
          <span style={{ position: 'relative', display: 'inline-block', color: 'var(--ink)', fontWeight: 800 }}>
            {animatedMinutes} minutes of scrolling
            <HandDrawnUnderline color="var(--sun)" />
          </span>{' '}
          and gently put{' '}
          <span style={{ position: 'relative', display: 'inline-block', color: 'var(--ink)', fontWeight: 800 }}>
            {pluralize(animatedNewsletters, 'newsletter', 'newsletters', 'all newsletters')} to bed
            <HandDrawnUnderline color="var(--berry-dry)" />
          </span>
          .
        </p>
      </section>

      {/* ============================================================
          3. EMPTY STATE: NOTHING ON FIRE
          ============================================================ */}
      {!hasUrgent && dueSoonCount === 0 && (
        <section
          style={{
            textAlign: 'center',
            padding: '40px 16px',
          }}
        >
          <div style={{ display: 'inline-block', marginBottom: '12px' }}>
            <Mascot pose="belly" size="lg" crumbs={true} alt="Snorlax content" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '26px',
              fontWeight: 900,
              color: 'var(--ink)',
              margin: '0 0 6px',
            }}
          >
            {pickCopy(EMPTY_STATES.morning, 'morning-empty')}
          </h3>
          <p
            className="font-handwriting"
            style={{
              fontSize: '22px',
              color: 'var(--muted)',
              maxWidth: '460px',
              margin: '0 auto',
            }}
          >
            Zero alarms on the horizon. Snorlax approves. Go outside or nap.
          </p>
        </section>
      )}

      {/* ============================================================
          4. URGENT ACTIONS: "WORTH WAKING UP FOR"
          Surface style (a): Outlined cards with hard shadow.
          Section heading sits directly on background with doodle.
          First card is larger & louder.
          ============================================================ */}
      {hasUrgent && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section Heading directly on page background with doodle */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '24px',
                fontWeight: 900,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              Worth waking up for
            </h2>
            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--berry-spicy)',
              }}
            >
              {urgentCount}
            </span>
            <SectionDoodle variant="squiggle" color="var(--berry-spicy)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {rawUrgentItems.map((item, idx) => {
              const isFirst = idx === 0;
              const isDetailsOpen = expandedEmailId === item.message_id;
              const senderClean = item.from_address.split('<')[0].replace(/"/g, '').trim() || item.from_address;
              const exitType = exitingItems[item.message_id];

              let cardAnimation: string | undefined = undefined;
              if (exitType === 'munch') {
                cardAnimation = 'cardMunchOut 350ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) forwards';
              } else if (exitType === 'snooze') {
                cardAnimation = 'cardSnoozeOut 280ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) forwards';
              } else if (isFirst) {
                cardAnimation = 'shake 400ms ease-in-out 300ms';
              }

              return (
                <div
                  key={item.message_id}
                  className={`surface-urgent-card ${isFirst ? 'surface-urgent-first' : ''}`}
                  style={{
                    position: 'relative',
                    borderLeft: `7px solid var(--berry-spicy)`,
                    padding: isFirst ? '24px 28px' : '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    animation: cardAnimation,
                    pointerEvents: exitType ? 'none' : 'auto',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Human detail: Half-eaten berry crumb on the corner of the first card */}
                  {isFirst && (
                    <HalfEatenBerry style={{ top: '-10px', right: '-8px' }} />
                  )}

                  {/* Top row: Subject, Badges, NapMeter */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {/* Only one badge; category chip only if it adds info */}
                        <FlavorBadge priority={item.priority} />
                        {item.category && item.category !== 'action_required' && (
                          <CategoryChip category={item.category} compact />
                        )}
                      </div>

                      <h3
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: isFirst ? '22px' : '18px',
                          fontWeight: 900,
                          color: 'var(--ink)',
                          lineHeight: 1.35,
                          margin: 0,
                        }}
                      >
                        {item.subject}
                      </h3>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <NapMeter dueAt={item.received_at} />
                    </div>
                  </div>

                  {/* From Address */}
                  <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>
                    From: <strong style={{ color: 'var(--ink)' }}>{senderClean}</strong>
                  </div>

                  {/* Bold "Do this:" actionable instruction */}
                  {item.action_text && (
                    <div
                      style={{
                        background: 'var(--surface-alt)',
                        borderLeft: '4px solid var(--snorlax)',
                        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                        padding: '12px 16px',
                        fontSize: '15px',
                        color: 'var(--ink)',
                      }}
                    >
                      <strong style={{ color: 'var(--snorlax-dark)' }}>Do this: </strong>
                      {item.action_text}
                    </div>
                  )}

                  {/* Verbatim quote from the email */}
                  {item.evidence && (
                    <blockquote
                      style={{
                        margin: 0,
                        padding: '10px 14px',
                        background: 'rgba(0,0,0,0.025)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '3px solid var(--muted)',
                        fontSize: '14px',
                        color: 'var(--muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontStyle: 'normal' }}>From the email: </span>
                      "{item.evidence}"
                    </blockquote>
                  )}

                  {/* Action Buttons: Primary Done, Secondary Back to sleep, Ghost Open email */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <LazyButton
                        variant="primary"
                        size="sm"
                        icon={<Check size={16} strokeWidth={2.5} />}
                        title="Body Slam? Nope. Munch."
                        onClick={() => handleCompleteTask(item.message_id, item.subject)}
                      >
                        Done
                      </LazyButton>

                      <LazyButton
                        variant="secondary"
                        size="sm"
                        icon={<Moon size={16} strokeWidth={2.5} />}
                        title="Rest: Put back to sleep until tomorrow"
                        onClick={() => handleSnooze(item.message_id, item.subject)}
                      >
                        Back to sleep
                      </LazyButton>
                    </div>

                    <button
                      onClick={() => setExpandedEmailId(isDetailsOpen ? null : item.message_id)}
                      title="Inspect full email thread"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '44px',
                        padding: '0 10px',
                        background: 'transparent',
                        color: 'var(--muted)',
                        fontFamily: 'var(--font-heading)',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <Mail size={16} />
                      <span>{isDetailsOpen ? 'Hide email' : 'Open email'}</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          transform: isDetailsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 200ms ease',
                        }}
                      >
                        <ChevronDown size={16} />
                      </span>
                    </button>
                  </div>

                  {/* Expanded Email Drawer with smooth height collapse */}
                  <Collapse isOpen={isDetailsOpen}>
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '16px',
                        background: 'var(--surface-alt)',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border)',
                        fontSize: '14px',
                        color: 'var(--ink)',
                      }}
                    >
                      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
                        Message ID: <code>{item.message_id}</code>
                      </div>
                      <div style={{ lineHeight: 1.5 }}>
                        {item.evidence || 'No full text body preview available.'}
                      </div>
                    </div>
                  </Collapse>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          5. SECONDARY INFO: "NEXT SNACKS"
          Surface style (b): Flat soft-tinted panels with NO outline
          and no shadows. Sitting directly on the page.
          ============================================================ */}
      {dedupedDueSoon.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '22px',
                  fontWeight: 900,
                  color: 'var(--ink)',
                  margin: 0,
                }}
              >
                Next snacks
              </h2>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--muted)' }}>
                {dueSoonCount}
              </span>
              <SectionDoodle variant="arrow" color="var(--snorlax)" />
            </div>

            {dedupedDueSoon.length > 6 && (
              <button
                onClick={() => setShowAllDueSoon((prev) => !prev)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px',
                  padding: '0 12px',
                  background: 'transparent',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--snorlax-dark)',
                  cursor: 'pointer',
                }}
              >
                <span>{showAllDueSoon ? 'Show less' : `Show all ${dedupedDueSoon.length}`}</span>
                {showAllDueSoon ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {displayedDueSoon.map((task) => {
              const exitType = exitingItems[task.task_id];
              let cardAnimation: string | undefined = undefined;
              if (exitType === 'munch') {
                cardAnimation = 'cardMunchOut 350ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) forwards';
              } else if (exitType === 'snooze') {
                cardAnimation = 'cardSnoozeOut 280ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) forwards';
              }

              return (
                <div
                  key={task.task_id}
                  className="surface-soft-panel"
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    animation: cardAnimation,
                    pointerEvents: exitType ? 'none' : 'auto',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <FlavorBadge priority={task.priority} compact />
                      <NapMeter dueAt={task.due_at} isOverdue={task.is_overdue} compact />
                    </div>

                    <h4
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: 'var(--ink)',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {task.title}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                    <LazyButton
                      variant="ghost"
                      size="sm"
                      title="Rest"
                      onClick={() => handleSnooze(task.task_id, task.title)}
                    >
                      Snooze
                    </LazyButton>

                    <LazyButton
                      variant="primary"
                      size="sm"
                      icon={<Check size={16} strokeWidth={2.5} />}
                      title="Munch."
                      onClick={() => handleCompleteTask(task.task_id, task.title)}
                    >
                      Done
                    </LazyButton>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================
          6. SNACK PILE: LIGHTWEIGHT DRAWER ROW
          Dashed top border, not a full boxed card.
          Copy: "N newsletters, asleep in the snack pile. Tap to peek."
          ============================================================ */}
      <section
        style={{
          borderTop: '2px dashed var(--border)',
          paddingTop: '20px',
        }}
      >
        <button
          onClick={() => {
            snorlaxSound.playClick();
            setSnackPileOpen((prev) => !prev);
          }}
          style={{
            width: '100%',
            padding: '12px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Archive size={20} color="var(--berry-dry)" strokeWidth={2.5} />
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--ink)',
                }}
              >
                {lowPriorityNews.length} newsletters, asleep in the snack pile.
              </span>
              <span
                className="font-handwriting"
                style={{
                  fontSize: '19px',
                  color: 'var(--muted)',
                  marginLeft: '8px',
                }}
              >
                {snackPileOpen ? 'Tap to close.' : 'Tap to peek.'}
              </span>
            </div>
          </div>

          <div
            style={{
              color: 'var(--muted)',
              display: 'inline-flex',
              alignItems: 'center',
              transform: snackPileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          >
            <ChevronDown size={20} />
          </div>
        </button>

        <Collapse isOpen={snackPileOpen}>
          <div
            style={{
              padding: '16px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {lowPriorityNews.length === 0 ? (
              <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
                No newsletters snoozing in the pile.
              </p>
            ) : (
              lowPriorityNews.map((news) => (
                <div
                  key={news.message_id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-alt)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                      {news.subject}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {news.from_address}
                    </div>
                  </div>
                  <CategoryChip category={news.category} compact />
                </div>
              ))
            )}
          </div>
        </Collapse>
      </section>
    </div>
  );
};
