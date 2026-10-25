import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { Task } from '../types';
import { api } from '../api';
import { Collapse } from './motion/Collapse';
import {
  Mascot,
  NapMeter,
  LazyButton,
  PokeFluteButton,
  ConfirmSheet,
  MunchToast,
  RouteBlocked,
  BellySkeleton,
  snorlaxSound,
} from './snorlax';
import {
  pluralize,
  pickCopy,
  EMPTY_STATES,
} from '../utils/humanCopy';
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  Check,
  Moon,
  Trash2,
  Sparkles,
} from 'lucide-react';

export const AttentionDebtView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newlySyncedIds, setNewlySyncedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'soonest' | 'newest'>('soonest');
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  // Tab sliding indicator measurement
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updatePill = () => {
      const activeBtn = tabRefs.current[statusFilter];
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
  }, [statusFilter]);

  // Exiting items animation tracker (taskId -> 'munch' | 'snooze' | 'dismiss')
  const [exitingItems, setExitingItems] = useState<{ [id: string]: 'munch' | 'snooze' | 'dismiss' }>({});

  // Dismiss / Confirm Sheet modal
  const [taskToDismiss, setTaskToDismiss] = useState<Task | null>(null);

  // Munch Toast with Undo (action: done | snooze | dismiss)
  const [munchToast, setMunchToast] = useState<{ id: string; title: string; action: 'done' | 'snooze' | 'dismiss' } | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTasks(undefined);
      setTasks(res?.tasks || []);
    } catch (err: unknown) {
      console.error('Failed to load tasks:', err);
      const msg = err instanceof Error ? err.message : "Couldn't load tasks.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAttention = async () => {
    try {
      setSyncing(true);
      snorlaxSound.playFlute();
      setError(null);
      const prevIds = new Set(tasks.map((t) => t.id));
      await api.syncAttentionDebt();
      const res = await api.getTasks(undefined);
      const freshTasks = res?.tasks || [];
      const newIds = new Set(freshTasks.filter((t) => !prevIds.has(t.id)).map((t) => t.id));
      setNewlySyncedIds(newIds);
      setTasks(freshTasks);
      setTimeout(() => setNewlySyncedIds(new Set()), 1500);
    } catch (err: unknown) {
      console.error('Error syncing attention debt:', err);
      const msg = err instanceof Error ? err.message : "Couldn't sync tasks.";
      setError(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleAccept = async (task: Task) => {
    try {
      snorlaxSound.playClick();
      setOpenMenuTaskId(null);
      await api.updateTask(task.id, { status: 'confirmed' });
      await loadTasks();
    } catch (err) {
      console.error('Error accepting task:', err);
    }
  };

  const handleDone = async (task: Task) => {
    try {
      snorlaxSound.playMunch();
      setOpenMenuTaskId(null);
      setExitingItems((prev) => ({ ...prev, [task.id]: 'munch' }));
      setMunchToast({ id: task.id, title: task.title, action: 'done' });
      
      setTimeout(async () => {
        try {
          await api.updateTask(task.id, { status: 'completed' });
          await loadTasks();
        } finally {
          setExitingItems((prev) => {
            const next = { ...prev };
            delete next[task.id];
            return next;
          });
        }
      }, 320);
    } catch (err) {
      console.error('Error completing task:', err);
      setExitingItems((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    }
  };

  const handleSnooze = async (task: Task) => {
    try {
      snorlaxSound.playClick();
      setOpenMenuTaskId(null);
      setExitingItems((prev) => ({ ...prev, [task.id]: 'snooze' }));
      setMunchToast({ id: task.id, title: task.title, action: 'snooze' });
      
      setTimeout(async () => {
        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await api.snoozeTask(task.id, tomorrow.toISOString());
          await loadTasks();
        } finally {
          setExitingItems((prev) => {
            const next = { ...prev };
            delete next[task.id];
            return next;
          });
        }
      }, 280);
    } catch (err) {
      console.error('Error snoozing task:', err);
      setExitingItems((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    }
  };

  const handleConfirmDismiss = async () => {
    if (!taskToDismiss) return;
    try {
      snorlaxSound.playClick();
      const dismissing = taskToDismiss;
      setExitingItems((prev) => ({ ...prev, [dismissing.id]: 'dismiss' }));
      setMunchToast({ id: dismissing.id, title: dismissing.title, action: 'dismiss' });
      setTaskToDismiss(null);
      
      setTimeout(async () => {
        try {
          await api.updateTask(dismissing.id, { status: 'dismissed' });
          await loadTasks();
        } finally {
          setExitingItems((prev) => {
            const next = { ...prev };
            delete next[dismissing.id];
            return next;
          });
        }
      }, 280);
    } catch (err) {
      console.error('Error dismissing task:', err);
      if (taskToDismiss) {
        setExitingItems((prev) => {
          const next = { ...prev };
          delete next[taskToDismiss.id];
          return next;
        });
      }
    }
  };

  const handleUndo = async () => {
    if (!munchToast) return;
    try {
      snorlaxSound.playClick();
      await api.updateTask(munchToast.id, { status: 'detected' });
      setMunchToast(null);
      await loadTasks();
    } catch (err) {
      console.error('Error undoing task:', err);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Close overflow menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.task-menu-container')) {
        setOpenMenuTaskId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Tab counts calculated across all loaded tasks
  const detectedCount = tasks.filter((t) => t.status === 'detected').length;
  const confirmedCount = tasks.filter((t) => t.status === 'confirmed' || t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const activeAllCount = tasks.filter((t) => t.status !== 'dismissed').length;

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'detected' && task.status !== 'detected') return false;
    if (statusFilter === 'confirmed' && task.status !== 'confirmed' && task.status !== 'in_progress') return false;
    if (statusFilter === 'completed' && task.status !== 'completed') return false;
    if (statusFilter === 'all' && task.status === 'dismissed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(q);
      const descMatch = task.description?.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }

    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'soonest') {
      const aDue = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const bDue = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return aDue - bDue;
    } else {
      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      return bCreated - aCreated;
    }
  });

  const TASK_TABS = [
    { key: 'all',       label: 'All',       count: activeAllCount },
    { key: 'detected',  label: 'Spotted',   count: detectedCount },
    { key: 'confirmed', label: 'Accepted',  count: confirmedCount },
    { key: 'completed', label: 'Leftovers', count: completedCount },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {/* Munch Toast with 5s Undo (Bottom-Center) */}
      {munchToast && (
        <MunchToast
          taskTitle={munchToast.title}
          action={munchToast.action}
          onUndo={handleUndo}
          onDismiss={() => setMunchToast(null)}
        />
      )}

      {/* Confirm Sheet for Dismissing ("Let it go") with Focus Trapping */}
      <ConfirmSheet
        isOpen={!!taskToDismiss}
        title="Let this task go?"
        message={`Are you sure you want to dismiss "${taskToDismiss?.title}"? Snorlax will ignore this task so you can stay cozy.`}
        confirmLabel="Yes, let it go"
        cancelLabel="Keep in tasks"
        onConfirm={handleConfirmDismiss}
        onCancel={() => setTaskToDismiss(null)}
        variant="danger"
      />

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
            One task per thread. Snorlax merged follow-up emails, attachments, and extensions into single responsibilities.
          </p>
        </div>

        <PokeFluteButton
          label="Sync tasks"
          tooltip="Check local threads for new updates"
          onClick={handleSyncAttention}
          loading={syncing}
          variant="secondary"
          size="md"
        />
      </div>

      {/* Error alert */}
      {error && <RouteBlocked title="Error syncing tasks" message={error} onRetry={loadTasks} />}

      {/* ============================================================
          SEGMENTED TABS WITH COUNTS ON ALL TABS + CLEAN BORDERS
          ============================================================ */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          gap: '8px',
          background: 'var(--surface-alt)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-full)',
          padding: '4px',
          overflowX: 'auto',
        }}
      >
        {/* Sliding active highlight pill indicator */}
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
        />

        {TASK_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              onClick={() => {
                snorlaxSound.playClick();
                setStatusFilter(tab.key);
              }}
              style={{
                position: 'relative',
                zIndex: 2,
                flex: 1,
                minWidth: '100px',
                minHeight: '44px',
                borderRadius: 'var(--radius-full)',
                background: isActive && pillStyle.width === 0 ? 'var(--snorlax)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--ink)',
                fontFamily: 'var(--font-heading)',
                fontSize: '15px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'color 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              <span
                key={tab.count}
                style={{
                  fontSize: '12px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  background: isActive ? 'var(--belly)' : 'var(--surface)',
                  color: isActive ? 'var(--snorlax-dark)' : 'var(--muted)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${isActive ? 'var(--snorlax-dark)' : 'var(--border)'}`,
                  animation: 'popBadge 300ms ease-out',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============================================================
          SEARCH FIELD & SORT
          ============================================================ */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            flex: 1,
            minWidth: '240px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '8px 14px 8px 42px',
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-heading)',
              fontSize: '14px',
            }}
          />
        </div>

        <button
          onClick={() => setSortBy((prev) => (prev === 'soonest' ? 'newest' : 'soonest'))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '44px',
            padding: '0 14px',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          <ArrowUpDown size={16} strokeWidth={2.5} />
          <span>{sortBy === 'soonest' ? 'Soonest deadline' : 'Newest created'}</span>
        </button>
      </div>

      {/* ============================================================
          LOOSER, LISTY TASK CONTAINER (Not boxed individually)
          Single container with dividers.
          Only hovered or expanded row gets the elevated card treatment.
          ============================================================ */}
      {loading ? (
        <BellySkeleton
          message="Still waking up..."
          submessage="Sorting your tasks into single responsibilities."
        />
      ) : sortedTasks.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '14px' }}>
            <Mascot pose="sleeping" size="md" alt="Snorlax sleeping" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '22px',
              fontWeight: 900,
              color: 'var(--ink)',
              margin: '0 0 6px',
            }}
          >
            {pickCopy(EMPTY_STATES.tasks, 'tasks-empty')}
          </h3>
          <p
            className="font-handwriting"
            style={{
              fontSize: '20px',
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            {searchQuery ? 'Try clearing your search query.' : 'Snorlax approves. Enjoy the quiet.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface-alt)',
            border: '2px solid var(--border)',
            borderRadius: '20px',
            overflow: 'visible',
          }}
        >
          {sortedTasks.map((task, idx) => {
            const isExpanded = expandedTaskId === task.id;
            const isHovered = hoveredTaskId === task.id;
            const isMenuOpen = openMenuTaskId === task.id;
            const isCompleted = task.status === 'completed';
            const linkedMessages = task.linked_messages || [];
            const hasMultipleLinked = linkedMessages.length > 1;
            const isFirst = idx === 0;
            const isLast = idx === sortedTasks.length - 1;
            const exitType = exitingItems[task.id];
            const isNewlySynced = newlySyncedIds.has(task.id);

            let rowAnimation: string | undefined = undefined;
            if (exitType === 'munch') {
              rowAnimation = 'cardMunchOut 350ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) forwards';
            } else if (exitType === 'snooze' || exitType === 'dismiss') {
              rowAnimation = 'cardSnoozeOut 280ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) forwards';
            } else {
              rowAnimation = `fadeUp 200ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) ${Math.min(idx, 8) * 35}ms both`;
            }

            return (
              <div
                key={task.id}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                className={isNewlySynced ? 'task-highlight-fade' : ''}
                style={{
                  background: isExpanded || isHovered ? 'var(--surface)' : 'transparent',
                  borderBottom: isLast ? 'none' : '1.5px solid var(--border)',
                  borderTopLeftRadius: isFirst ? '18px' : '0',
                  borderTopRightRadius: isFirst ? '18px' : '0',
                  borderBottomLeftRadius: isLast && !isExpanded ? '18px' : '0',
                  borderBottomRightRadius: isLast && !isExpanded ? '18px' : '0',
                  boxShadow: isExpanded || isHovered ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'background 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative',
                  zIndex: isMenuOpen ? 50 : 1,
                  animation: rowAnimation,
                  pointerEvents: exitType ? 'none' : 'auto',
                }}
              >
                {/* Task Row */}
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Left Column: Status Chip + Title + NapMeter */}
                  <div
                    style={{ flex: 1, minWidth: '260px', cursor: 'pointer' }}
                    onClick={() => {
                      snorlaxSound.playClick();
                      setExpandedTaskId(isExpanded ? null : task.id);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span
                        className="badge-calm"
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: isCompleted
                            ? 'var(--berry-dry-bg)'
                            : task.status === 'confirmed'
                            ? 'var(--berry-sweet-bg)'
                            : 'var(--surface)',
                          color: isCompleted
                            ? 'var(--berry-dry)'
                            : task.status === 'confirmed'
                            ? 'var(--snorlax)'
                            : 'var(--muted)',
                          border: '1.5px solid currentColor',
                        }}
                      >
                        {isCompleted
                          ? 'Leftover'
                          : task.status === 'confirmed'
                          ? 'Accepted'
                          : 'Spotted'}
                      </span>

                      <NapMeter dueAt={task.due_at} compact />

                      {hasMultipleLinked && (
                        <span
                          title="Friendship: +1 (Merged follow-up emails into one task)"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: 'var(--belly)',
                            color: 'var(--snorlax-dark)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '12px',
                            fontWeight: 800,
                            border: '1px solid var(--border)',
                          }}
                        >
                          <Sparkles size={12} />
                          <span>Friendship: +1</span>
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '17px',
                        fontWeight: 800,
                        color: 'var(--ink)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        opacity: isCompleted ? 0.65 : 1,
                      }}
                    >
                      {task.title}
                    </div>
                  </div>

                  {/* Right Column: ONE Primary "Done" Button + "..." Overflow Menu */}
                  <div
                    className="task-menu-container"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {!isCompleted && (
                      <LazyButton
                        variant="primary"
                        size="sm"
                        icon={<Check size={16} strokeWidth={2.5} />}
                        title="Body Slam? Nope. Munch."
                        onClick={() => handleDone(task)}
                      >
                        Done
                      </LazyButton>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        snorlaxSound.playClick();
                        setOpenMenuTaskId(isMenuOpen ? null : task.id);
                      }}
                      aria-label="More task options"
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        minWidth: '44px',
                        minHeight: '44px',
                        background: 'transparent',
                        border: '1.5px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--ink)',
                        cursor: 'pointer',
                      }}
                    >
                      <MoreHorizontal size={20} strokeWidth={2.5} />
                    </button>

                    {/* Overflow Dropdown */}
                    {isMenuOpen && (
                      <div
                        role="menu"
                        style={{
                          position: 'absolute',
                          top: '50px',
                          right: 0,
                          zIndex: 1000,
                          background: 'var(--surface)',
                          border: '2px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: '0 8px 24px rgba(0, 50, 63, 0.18)',
                          minWidth: '180px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          animation: 'popIn 0.15s var(--ease-spring, ease-out)',
                        }}
                      >
                        {task.status !== 'confirmed' && !isCompleted && (
                          <button
                            role="menuitem"
                            onClick={() => handleAccept(task)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              minHeight: '40px',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'transparent',
                              color: 'var(--ink)',
                              fontFamily: 'var(--font-heading)',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <Check size={16} color="var(--snorlax)" />
                            <span>Accept</span>
                          </button>
                        )}

                        {!isCompleted && (
                          <button
                            role="menuitem"
                            title="Rest"
                            onClick={() => handleSnooze(task)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              minHeight: '40px',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'transparent',
                              color: 'var(--ink)',
                              fontFamily: 'var(--font-heading)',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <Moon size={16} color="var(--sun)" />
                            <span>Back to sleep</span>
                          </button>
                        )}

                        <button
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuTaskId(null);
                            setTaskToDismiss(task);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            minHeight: '40px',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'transparent',
                            color: 'var(--berry-spicy)',
                            fontFamily: 'var(--font-heading)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <Trash2 size={16} />
                          <span>Let it go</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Timeline: Growth chain (Munchlax -> Snorlax) */}
                <Collapse isOpen={isExpanded}>
                  <div
                    style={{
                      borderTop: '1.5px solid var(--border)',
                      borderBottomLeftRadius: isLast ? '18px' : '0',
                      borderBottomRightRadius: isLast ? '18px' : '0',
                      background: 'var(--surface-alt)',
                      padding: '20px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Mascot pose="munchlax" size="sm" />
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--muted)' }}>➔</span>
                        <div style={{ filter: isCompleted ? 'none' : 'drop-shadow(0 0 6px rgba(255, 210, 63, 0.5))' }}>
                          <Mascot pose={isCompleted ? 'eating' : 'sleeping'} size="sm" />
                        </div>
                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>
                          Growth Chain ({pluralize(linkedMessages.length, 'update', 'updates')})
                        </span>
                      </div>

                      {task.due_at && (
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>
                          <span className="strike-through-draw" style={{ color: 'var(--muted)', marginRight: '8px' }}>
                            Original deadline
                          </span>
                          <span
                            className="deadline-sweep"
                            style={{
                              color: 'var(--berry-sour)',
                              background: 'var(--berry-sour-bg)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              display: 'inline-block',
                            }}
                          >
                            Updated: {new Date(task.due_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {task.description && (
                      <p style={{ fontSize: '15px', color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
                        {task.description}
                      </p>
                    )}

                    {linkedMessages.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>
                          Merged into this responsibility:
                        </div>
                        {linkedMessages.map((msg, mIdx) => (
                          <div
                            key={msg.message_id || mIdx}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              fontSize: '14px',
                            }}
                          >
                            <div>
                              <strong style={{ color: 'var(--ink)' }}>{msg.subject || 'Thread update'}</strong>
                              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>From: {msg.from_address}</div>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                              {msg.received_at ? new Date(msg.received_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Collapse>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
