import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { Message } from '../types';
import { api } from '../api';
import { Collapse } from './motion/Collapse';
import {
  Mascot,
  FlavorBadge,
  LazyButton,
  RouteBlocked,
  BellySkeleton,
  BerrySpicy,
  BerrySour,
  BerrySweet,
  BerryDry,
  BerryMystery,
  SectionDoodle,
  snorlaxSound,
} from './snorlax';
import {
  pickCopy,
  EMPTY_STATES,
} from '../utils/humanCopy';
import {
  Search,
  Plus,
  Brain,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
} from 'lucide-react';

export const InboxView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingSingleId, setAnalyzingSingleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(25);
  const [legendOpen, setLegendOpen] = useState(false);
  const [showRawMap, setShowRawMap] = useState<Record<string, boolean>>({});

  // Motion: Track initial load for stagger & sliding filter indicator
  const isInitialLoad = useRef(true);
  const chipRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [chipPillStyle, setChipPillStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateChipPill = () => {
      const activeChip = chipRefs.current[filterCategory];
      if (activeChip) {
        setChipPillStyle({
          left: activeChip.offsetLeft,
          width: activeChip.offsetWidth,
          opacity: 1,
        });
      }
    };
    updateChipPill();
    window.addEventListener('resize', updateChipPill);
    return () => window.removeEventListener('resize', updateChipPill);
  }, [filterCategory]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => {
        isInitialLoad.current = false;
      }, 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const getProperDescription = (snippet?: string, body?: string): string => {
    let text = snippet?.trim() || '';
    if (!text || text.length < 15) {
      text = body?.trim() || '';
    }
    if (!text) return 'No description available for this email.';

    // Strip long tracking links and query strings
    text = text.replace(/https?:\/\/[^\s]+/g, (url) => {
      try {
        const parsed = new URL(url);
        return `[${parsed.hostname}]`;
      } catch {
        return '[link]';
      }
    });

    // Remove replacement characters, zero-width characters, and repeated whitespace
    text = text.replace(/[\uFFFD\u200C\u200B\u00A0]+/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();

    if (text.length > 240) {
      text = text.slice(0, 237).trim() + '...';
    }
    return text;
  };

  // Ingest Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newFrom, setNewFrom] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newThreadId, setNewThreadId] = useState('');

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMessages(100, 0);
      setMessages(res?.messages || []);
    } catch (err: unknown) {
      console.error('Failed to load messages:', err);
      const msg = err instanceof Error ? err.message : "Couldn't load inbox snacks.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAll = async () => {
    try {
      setAnalyzingAll(true);
      snorlaxSound.playFlute();
      setError(null);
      await api.analyzeAll();
      await loadMessages();
    } catch (err: unknown) {
      console.error('Error analyzing messages:', err);
      const msg = err instanceof Error ? err.message : "Couldn't analyze emails with Gemma.";
      setError(msg);
    } finally {
      setAnalyzingAll(false);
    }
  };

  const handleAnalyzeSingle = async (msgId: string) => {
    try {
      setAnalyzingSingleId(msgId);
      snorlaxSound.playClick();
      await api.analyzeMessage(msgId);
      await loadMessages();
    } catch (err) {
      console.error('Error analyzing single message:', err);
    } finally {
      setAnalyzingSingleId(null);
    }
  };

  const handleCreateCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrom || !newSubject || !newBody) return;

    try {
      setSubmitting(true);
      snorlaxSound.playMunch();
      const created = await api.createMessage({
        from_address: newFrom,
        subject: newSubject,
        body_text: newBody,
        thread_id: newThreadId || undefined,
      });
      setShowModal(false);
      setNewFrom('');
      setNewSubject('');
      setNewBody('');
      setNewThreadId('');
      await loadMessages();
      setExpandedId(created.id);
    } catch (err: unknown) {
      console.error('Error creating custom email:', err);
      const msg = err instanceof Error ? err.message : "Couldn't ingest email.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const applyTemplate = (type: 'urgent' | 'extension' | 'newsletter') => {
    snorlaxSound.playClick();
    if (type === 'urgent') {
      setNewFrom('security-lead@company.internal');
      setNewSubject('URGENT: Database credential leak in staging cluster');
      setNewBody('Team, we discovered exposed database credentials in git history. You must rotate the primary Postgres secrets and restart all API gateway pods by 4:00 PM today without fail.');
      setNewThreadId('');
    } else if (type === 'extension') {
      setNewFrom('sarah.lead@techcorp.internal');
      setNewSubject('Re: Project Orion: Finalizing QA sign-off for v2.0 - Further update');
      setNewBody('Alex, giving you more breathing room on the regression tests: deadline is pushed to next Monday at 10:00 AM UTC. Please verify sign-off then.');
      setNewThreadId('thread-orion-001');
    } else {
      setNewFrom('news@ai-weekly.com');
      setNewSubject('AI Weekly #112: The Rise of Small Language Models on Laptops');
      setNewBody('Welcome to issue #112 of AI Weekly. Today we explore running Gemma 2 2B directly on discrete GPUs with Ollama, eliminating cloud API costs and keeping private enterprise data local.');
      setNewThreadId('');
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const isUnanalyzed = (m: Message) => !m.analysis || m.analysis.priority === 'unknown' || m.analysis.category === 'unknown';
  const isUrgent = (m: Message) => !isUnanalyzed(m) && m.analysis?.priority === 'urgent';
  const isHigh = (m: Message) => !isUnanalyzed(m) && m.analysis?.priority === 'high';
  const isNews = (m: Message) => !isUnanalyzed(m) && m.analysis?.category === 'newsletter';

  // Base search-filtered messages
  const searchedMessages = messages.filter((m) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const subjectMatch = m.subject?.toLowerCase().includes(q);
      const senderMatch = m.from_address?.toLowerCase().includes(q);
      const bodyMatch = m.snippet?.toLowerCase().includes(q) || m.body_text?.toLowerCase().includes(q);
      if (!subjectMatch && !senderMatch && !bodyMatch) return false;
    }
    return true;
  });

  // Chip counts computed from the exact same dataset the list uses
  const allCount = searchedMessages.length;
  const urgentCount = searchedMessages.filter(isUrgent).length;
  const highCount = searchedMessages.filter(isHigh).length;
  const newsCount = searchedMessages.filter(isNews).length;
  const unanalyzedCount = searchedMessages.filter(isUnanalyzed).length;

  const filteredMessages = searchedMessages.filter((m) => {
    if (filterCategory === 'urgent') return isUrgent(m);
    if (filterCategory === 'high') return isHigh(m);
    if (filterCategory === 'newsletter') return isNews(m);
    if (filterCategory === 'unanalyzed') return isUnanalyzed(m);
    return true;
  });

  // Sort filtered messages newest first by real received_at
  const sortedMessages = [...filteredMessages].sort((a, b) => {
    const timeA = a.received_at ? new Date(a.received_at).getTime() : 0;
    const timeB = b.received_at ? new Date(b.received_at).getTime() : 0;
    return timeB - timeA;
  });

  const getDayInfo = (dateStr?: string): { day: string; timestamp: number } => {
    if (!dateStr) return { day: 'Earlier snacks', timestamp: 0 };
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { day: 'Earlier snacks', timestamp: 0 };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const msgDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

    const diffDays = Math.round((todayStart - msgDayStart) / (24 * 60 * 60 * 1000));

    let day: string;
    if (diffDays === 0) {
      day = 'Today';
    } else if (diffDays === 1) {
      day = 'Yesterday';
    } else {
      day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    return { day, timestamp: msgDayStart };
  };

  const formatMessageTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    // Check if timestamp contains an explicit time component
    const hasTime =
      (dateStr.includes('T') && !dateStr.includes('T00:00:00')) ||
      (dateStr.includes(':') && !dateStr.includes('00:00:00'));

    if (hasTime) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const visibleMessages = sortedMessages.slice(0, visibleLimit);
  const groupedByDay: { day: string; timestamp: number; messages: Message[] }[] = [];

  visibleMessages.forEach((msg) => {
    const { day, timestamp } = getDayInfo(msg.received_at);
    let group = groupedByDay.find((g) => g.day === day);
    if (!group) {
      group = { day, timestamp, messages: [] };
      groupedByDay.push(group);
    }
    group.messages.push(msg);
  });

  // Sort day headers in strict order: Today, Yesterday, then dates newest first
  groupedByDay.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* ============================================================
          HEADER: SOFT-TINTED PANEL (Not a duplicate card)
          ============================================================ */}
      <div
        className="surface-soft-panel"
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.5, color: 'var(--ink)', fontWeight: 600 }}>
            Every label is backed by a real quote from the email. Honest categories, no made-up deadlines, and zero cloud uploads.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <LazyButton
            variant="secondary"
            size="md"
            icon={<Plus size={18} strokeWidth={2.5} />}
            onClick={() => {
              snorlaxSound.playClick();
              setShowModal(true);
            }}
          >
            Ingest email
          </LazyButton>

          <LazyButton
            variant="primary"
            size="md"
            icon={<Brain size={18} strokeWidth={2.5} />}
            onClick={handleAnalyzeAll}
            disabled={analyzingAll}
          >
            {analyzingAll ? 'Reading with Gemma...' : 'Re-analyze with Gemma'}
          </LazyButton>
        </div>
      </div>

      {/* Ingest Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 31, 38, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '3px solid var(--border)',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: 'var(--shadow-chunky)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 900, color: 'var(--ink)', margin: 0 }}>
                Feed Snorlax an Email
              </h3>
              <button
                onClick={() => setShowModal(false)}
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

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)', marginBottom: '8px' }}>
                Quick Snack Presets:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <LazyButton variant="quiet" size="sm" type="button" icon={<BerrySpicy size={14} />} onClick={() => applyTemplate('urgent')}>
                  Urgent Incident
                </LazyButton>
                <LazyButton variant="quiet" size="sm" type="button" icon={<Sparkles size={14} />} onClick={() => applyTemplate('extension')}>
                  Orion Extension
                </LazyButton>
                <LazyButton variant="quiet" size="sm" type="button" icon={<BerryDry size={14} />} onClick={() => applyTemplate('newsletter')}>
                  Quiet Newsletter
                </LazyButton>
              </div>
            </div>

            <form onSubmit={handleCreateCustomEmail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                  From Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ciso@techcorp.internal"
                  value={newFrom}
                  onChange={(e) => setNewFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--surface-alt)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    fontSize: '15px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical patch required before 5 PM"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--surface-alt)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    fontSize: '15px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                  Email Body
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste email content here with explicit action requests or deadlines..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--surface-alt)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    resize: 'vertical',
                    fontSize: '15px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '6px' }}>
                  Thread ID (Optional, for collapsing)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank or use 'thread-orion-001'"
                  value={newThreadId}
                  onChange={(e) => setNewThreadId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--surface-alt)',
                    border: '2px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--ink)',
                    fontSize: '15px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <LazyButton variant="quiet" size="md" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </LazyButton>
                <LazyButton variant="primary" size="md" type="submit" disabled={submitting}>
                  {submitting ? 'Feeding Gemma...' : 'Ingest & triage'}
                </LazyButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && <RouteBlocked title="Inbox error" message={error} onRetry={loadMessages} />}

      {/* ============================================================
          SEARCH BOX & CLEAN FILTER CHIPS
          ============================================================ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search emails by sender, subject, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '10px 16px 10px 44px',
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-heading)',
              fontSize: '15px',
            }}
          />
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Sliding active filter chip pill */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${chipPillStyle.left}px`,
              width: `${chipPillStyle.width}px`,
              borderRadius: 'var(--radius-full)',
              background: 'var(--snorlax)',
              boxShadow: 'var(--shadow-btn)',
              transition: 'left var(--m-base, 250ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), width var(--m-base, 250ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), opacity 150ms ease',
              opacity: chipPillStyle.opacity,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {[
            { key: 'all',        label: `All`, icon: null, count: allCount },
            { key: 'urgent',     label: `Spicy • Urgent`, icon: <BerrySpicy size={15} />, count: urgentCount },
            { key: 'high',       label: `Sour • High`, icon: <BerrySour size={15} />, count: highCount },
            { key: 'newsletter', label: `Dry • Newsletter`, icon: <BerryDry size={15} />, count: newsCount },
            { key: 'unanalyzed', label: `Not analyzed`, icon: <BerryMystery size={15} />, count: unanalyzedCount },
          ].map((f) => {
            const isActive = filterCategory === f.key;
            return (
              <button
                key={f.key}
                ref={(el) => {
                  chipRefs.current[f.key] = el;
                }}
                onClick={() => {
                  snorlaxSound.playClick();
                  setFilterCategory(f.key);
                }}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '40px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive && chipPillStyle.width === 0 ? 'var(--snorlax)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--ink)',
                  border: `1.5px solid ${isActive ? 'var(--snorlax)' : 'var(--border)'}`,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
              >
                {f.icon}
                <span>{f.label}</span>
                <span
                  key={f.count}
                  style={{
                    fontSize: '12px',
                    background: isActive ? 'var(--belly)' : 'var(--surface-alt)',
                    color: isActive ? 'var(--snorlax-dark)' : 'var(--muted)',
                    padding: '1px 7px',
                    borderRadius: 'var(--radius-full)',
                    animation: 'popBadge 300ms ease-out',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                  }}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          MAIL-LIST FEEL (Dividers, handwritten day headers)
          Not a stack of identical bordered cards.
          ============================================================ */}
      {loading ? (
        <BellySkeleton
          message="Still waking up..."
          submessage="Organizing your mail list offline with Gemma."
        />
      ) : filteredMessages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px' }}>
          <div style={{ marginBottom: '14px' }}>
            <Mascot pose="sleeping" size="md" alt="Snorlax sleeping" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 900, color: 'var(--ink)', margin: '0 0 6px' }}>
            {pickCopy(EMPTY_STATES.inbox, 'inbox-empty')}
          </h3>
          <p className="font-handwriting" style={{ fontSize: '20px', color: 'var(--muted)', margin: 0 }}>
            {searchQuery ? 'Try clearing your search query.' : 'Snorlax has nothing to report here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {groupedByDay.map((group) => (
            <section key={group.day} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Day Header in Handwritten Accent Font with animated drawn squiggle */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', padding: '0 6px' }}>
                <span
                  className="font-handwriting"
                  style={{
                    fontSize: '26px',
                    color: 'var(--snorlax-dark)',
                    fontWeight: 700,
                  }}
                >
                  {group.day}
                </span>
                <SectionDoodle variant="squiggle" color="var(--border)" animateDraw />
              </div>

              {/* Mail list container with dividers and scanline sweep overlay */}
              <div
                style={{
                  position: 'relative',
                  background: 'var(--surface-alt)',
                  border: '2px solid var(--border)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                }}
              >
                {analyzingAll && <div className="scanline-sweep-overlay" aria-hidden="true" />}

                {group.messages.map((msg, mIdx) => {
                  const isExpanded = expandedId === msg.id;
                  const isHovered = hoveredId === msg.id;
                  const a = msg.analysis;
                  const isAnalyzed = !!a;
                  const senderClean = msg.from_address.split('<')[0].replace(/"/g, '').trim() || msg.from_address;
                  const isScanning = analyzingSingleId === msg.id;
                  const isLast = mIdx === group.messages.length - 1;

                  return (
                    <div
                      key={msg.id}
                      onMouseEnter={() => setHoveredId(msg.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        background: isExpanded || isHovered ? 'var(--surface)' : 'transparent',
                        borderBottom: isLast ? 'none' : '1.5px solid var(--border)',
                        transition: 'background 0.15s ease',
                        animation: isInitialLoad.current
                          ? `fadeUp 200ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) ${Math.min(mIdx, 8) * 35}ms both`
                          : 'fadeIn 150ms ease-out',
                      }}
                    >
                      {/* Collapsed Row */}
                      <div
                        onClick={() => {
                          snorlaxSound.playClick();
                          setExpandedId(isExpanded ? null : msg.id);
                        }}
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: '260px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '16px', color: 'var(--ink)', fontWeight: 800 }}>
                              {senderClean}
                            </strong>

                            <FlavorBadge
                              priority={a?.priority}
                              category={a?.category}
                              isUnanalyzed={!isAnalyzed}
                              compact
                            />

                            {!isAnalyzed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeSingle(msg.id);
                                }}
                                disabled={isScanning}
                                title="Scan this email individually with local Gemma"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 10px',
                                  background: 'var(--snorlax)',
                                  color: '#FFFFFF',
                                  borderRadius: 'var(--radius-full)',
                                  border: '1.5px solid var(--border)',
                                  fontFamily: 'var(--font-heading)',
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  cursor: isScanning ? 'wait' : 'pointer',
                                }}
                              >
                                {isScanning ? 'Scanning...' : 'Scan this one'}
                              </button>
                            )}
                          </div>

                          <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.4 }}>
                            {msg.subject}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                          <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                            {formatMessageTime(msg.received_at)}
                          </span>
                          <span
                            style={{
                              color: 'var(--muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 200ms ease',
                            }}
                          >
                            <ChevronDown size={18} />
                          </span>
                        </div>
                      </div>

                      {/* Expanded Detail Panel with Collapse */}
                      <Collapse isOpen={isExpanded}>
                        <div
                          style={{
                            borderTop: '1.5px solid var(--border)',
                            background: 'var(--surface-alt)',
                            padding: '20px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                            <div style={{ flexShrink: 0 }}>
                              <Mascot pose={isAnalyzed ? 'eating' : 'sleeping'} size="md" />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>
                                {msg.subject}
                              </h4>
                              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                                From: {msg.from_address} • Thread: <code>{msg.thread_id || 'solo'}</code>
                              </div>
                            </div>
                          </div>

                          {a ? (
                            <div
                              style={{
                                background: 'var(--surface)',
                                border: '1.5px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                animation: 'badgeFlip 350ms ease-out',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--snorlax-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Gemma 2 2B Structured Extraction
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                                  Model: {a.model_name || 'gemma2:2b'}
                                </span>
                              </div>

                              {a.action_text && (
                                <div style={{ fontSize: '15px', color: 'var(--ink)' }}>
                                  <strong style={{ color: 'var(--snorlax-dark)' }}>Action: </strong>
                                  {a.action_text}
                                </div>
                              )}

                              {a.deadline_text && (
                                <div style={{ fontSize: '15px', color: 'var(--berry-sour)' }}>
                                  <strong>Deadline: </strong>
                                  {a.deadline_text}
                                  {a.deadline_candidate_at && ` (${new Date(a.deadline_candidate_at).toLocaleDateString()})`}
                                </div>
                              )}

                              {a.evidence_text ? (
                                <div
                                  style={{
                                    background: 'var(--surface-alt)',
                                    border: '1px dashed var(--muted)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '10px 14px',
                                    fontSize: '14px',
                                    color: 'var(--muted)',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  <span style={{ fontWeight: 700, fontStyle: 'normal' }}>Quote: </span>
                                  "{a.evidence_text}"
                                </div>
                              ) : (
                                <div
                                  style={{
                                    background: 'var(--berry-sour-bg)',
                                    border: '1.5px solid var(--berry-sour)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '10px 14px',
                                    fontSize: '14px',
                                    color: 'var(--berry-sour)',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <AlertCircle size={18} />
                                  <span>No quote found, please check manually</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '14px 18px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '10px',
                              }}
                            >
                              <span style={{ fontSize: '15px', color: 'var(--muted)' }}>
                                Not analyzed yet. Snorlax hasn't tasted this email.
                              </span>
                              <LazyButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAnalyzeSingle(msg.id)}
                                disabled={isScanning}
                              >
                                {isScanning ? 'Scanning...' : 'Analyze with Gemma'}
                              </LazyButton>
                            </div>
                          )}

                          {/* Proper clean description instead of raw email clutter */}
                          {(msg.snippet || msg.body_text) && (
                            <div
                              style={{
                                background: 'var(--surface)',
                                border: '1.5px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--snorlax-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  Email Description
                                </span>
                                {msg.body_text && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowRawMap((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }));
                                    }}
                                    style={{
                                      fontSize: '12px',
                                      color: 'var(--muted)',
                                      textDecoration: 'underline',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      background: 'none',
                                      border: 'none',
                                      fontFamily: 'inherit',
                                    }}
                                  >
                                    {showRawMap[msg.id] ? 'Hide raw body' : 'View full email'}
                                  </button>
                                )}
                              </div>

                              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.55, color: 'var(--ink)' }}>
                                {getProperDescription(msg.snippet, msg.body_text)}
                              </p>

                              {showRawMap[msg.id] && msg.body_text && (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    padding: '12px',
                                    background: 'var(--surface-alt)',
                                    border: '1px dashed var(--muted)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '13px',
                                    color: 'var(--muted)',
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: '160px',
                                    overflowY: 'auto',
                                    fontFamily: 'monospace',
                                  }}
                                >
                                  {msg.body_text}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredMessages.length > visibleLimit && (
            <div style={{ textAlign: 'center' }}>
              <LazyButton
                variant="quiet"
                size="md"
                onClick={() => setVisibleLimit((prev) => prev + 25)}
              >
                Load more snacks ({filteredMessages.length - visibleLimit} remaining)
              </LazyButton>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          COLLAPSIBLE BERRY FLAVOR LEGEND (Soft Flat Panel)
          ============================================================ */}
      <div
        className="surface-soft-panel"
        style={{
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setLegendOpen((prev) => !prev)}
          style={{
            width: '100%',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} color="var(--snorlax)" />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
              Berry Flavor Guide
            </span>
          </div>
          {legendOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {legendOpen && (
          <div
            style={{
              padding: '16px 20px 22px',
              borderTop: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px 18px',
              fontSize: '14px',
            }}
          >
            {[
              { icon: <BerrySpicy size={18} />, name: 'Spicy (Cheri)', meaning: 'Urgent action' },
              { icon: <BerrySour size={18} />, name: 'Sour (Aspear)', meaning: 'High priority snack' },
              { icon: <BerrySweet size={18} />, name: 'Sweet (Pecha)', meaning: 'Routine update or FYI' },
              { icon: <BerryDry size={18} />, name: 'Dry (Rawst)', meaning: 'Batched newsletter' },
              { icon: <BerryMystery size={18} />, name: 'Mystery', meaning: 'Not analyzed yet' },
            ].map((entry) => (
              <div
                key={entry.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: 0,
                }}
              >
                <span style={{ flexShrink: 0, display: 'inline-flex' }}>{entry.icon}</span>
                <span style={{ fontSize: '13px', lineHeight: 1.3, color: 'var(--ink)' }}>
                  <strong>{entry.name}</strong>: {entry.meaning}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
