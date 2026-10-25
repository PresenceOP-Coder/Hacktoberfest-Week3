package scheduler

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
	"github.com/google/uuid"
)

type Scheduler struct {
	store     *store.Store
	ticker    *time.Ticker
	stopChan  chan struct{}
	mu        sync.Mutex
	isRunning bool
}

func NewScheduler(s *store.Store) *Scheduler {
	return &Scheduler{
		store:    s,
		stopChan: make(chan struct{}),
	}
}

// SyncTaskReminders schedules persistent reminder records for tasks with due dates.
// Deduplication keys ensure idempotent scheduling with zero duplicates on application restart.
func (s *Scheduler) SyncTaskReminders(ctx context.Context, accountID string) (int, error) {
	tasks, err := s.store.ListTasks(ctx, accountID, "")
	if err != nil {
		return 0, fmt.Errorf("listing tasks: %w", err)
	}

	scheduledCount := 0
	for _, t := range tasks {
		if t.Status == domain.TaskStatusCompleted || t.Status == domain.TaskStatusDismissed {
			continue
		}
		if t.DueAt == nil {
			continue
		}

		// Schedule reminder 1 hour before due date, or immediate if already close
		reminderTime := t.DueAt.Add(-1 * time.Hour)
		if reminderTime.Before(t.CreatedAt) {
			reminderTime = t.CreatedAt.Add(5 * time.Minute)
		}

		dedupeKey := fmt.Sprintf("task:%s:deadline:%s", t.ID, t.DueAt.UTC().Format("2006-01-02-15-04"))
		notif := &domain.Notification{
			ID:          uuid.NewString(),
			AccountID:   accountID,
			TaskID:      &t.ID,
			Kind:        domain.NotificationKindDeadline,
			Title:       fmt.Sprintf("Upcoming Deadline: %s", t.Title),
			Body:        fmt.Sprintf("Responsibility is due on %s", t.DueAt.Format(time.RFC822)),
			ScheduledAt: reminderTime,
			DedupeKey:   dedupeKey,
			Status:      "scheduled",
		}

		if err := s.store.ScheduleNotification(ctx, notif); err != nil {
			log.Printf("[SnoozeBox Scheduler] Error scheduling reminder for task %s: %v", t.ID, err)
			continue
		}
		scheduledCount++
	}

	return scheduledCount, nil
}

// ProcessDueNotifications claims due notifications atomically and processes them,
// respecting quiet hours and suppressing reminders for already-completed tasks.
func (s *Scheduler) ProcessDueNotifications(ctx context.Context, accountID string) ([]*domain.Notification, error) {
	now := time.Now().UTC()
	claimed, err := s.store.ClaimDueNotifications(ctx, now, 20)
	if err != nil {
		return nil, fmt.Errorf("claiming due notifications: %w", err)
	}

	prefs, _ := s.store.GetPreferences(ctx, accountID)
	acc, _ := s.store.GetAccount(ctx, accountID)
	userLoc := time.UTC
	if acc != nil && acc.Timezone != "" {
		if l, err := time.LoadLocation(acc.Timezone); err == nil {
			userLoc = l
		}
	}

	var delivered []*domain.Notification

	for _, n := range claimed {
		// 1. Suppression check: If related task is completed or dismissed, suppress reminder!
		if n.TaskID != nil {
			task, err := s.store.GetTask(ctx, *n.TaskID)
			if err == nil && task != nil {
				if task.Status == domain.TaskStatusCompleted || task.Status == domain.TaskStatusDismissed {
					log.Printf("[SnoozeBox Scheduler] Suppressing reminder %s for completed task %s", n.ID, task.ID)
					_ = s.store.MarkNotificationDelivered(ctx, n.ID)
					continue
				}
				// Also check if task was snoozed past current time
				if task.SnoozedUntil != nil && task.SnoozedUntil.After(now) {
					log.Printf("[SnoozeBox Scheduler] Deferring reminder %s because task %s is snoozed", n.ID, task.ID)
					n.ScheduledAt = *task.SnoozedUntil
					n.Status = "scheduled"
					_ = s.store.ScheduleNotification(ctx, n)
					continue
				}
			}
		}

		// 2. Quiet Hours check
		if prefs != nil && n.Kind != domain.NotificationKindUrgentMessage {
			if isInQuietHours(now.In(userLoc), prefs.QuietHoursStart, prefs.QuietHoursEnd) {
				log.Printf("[SnoozeBox Scheduler] Deferring notification %s: currently in quiet hours (%s - %s)",
					n.ID, prefs.QuietHoursStart, prefs.QuietHoursEnd)
				// Reschedule for quiet hours end
				rescheduledAt := calculateQuietHoursEnd(now.In(userLoc), prefs.QuietHoursEnd).UTC()
				n.ScheduledAt = rescheduledAt
				n.Status = "scheduled"
				_ = s.store.ScheduleNotification(ctx, n)
				continue
			}
		}

		// 3. Mark delivered
		if err := s.store.MarkNotificationDelivered(ctx, n.ID); err != nil {
			log.Printf("[SnoozeBox Scheduler] Error marking delivered %s: %v", n.ID, err)
			continue
		}

		delivered = append(delivered, n)
		log.Printf("[SnoozeBox Notification] Delivered [%s] %s: %s", n.Kind, n.Title, n.Body)
	}

	return delivered, nil
}

// Start begins the background periodic check loop
func (s *Scheduler) Start(accountID string) {
	s.mu.Lock()
	if s.isRunning {
		s.mu.Unlock()
		return
	}
	s.isRunning = true
	s.ticker = time.NewTicker(30 * time.Second)
	s.mu.Unlock()

	go func() {
		for {
			select {
			case <-s.stopChan:
				return
			case <-s.ticker.C:
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				_, _ = s.SyncTaskReminders(ctx, accountID)
				_, _ = s.ProcessDueNotifications(ctx, accountID)
				cancel()
			}
		}
	}()
}

func (s *Scheduler) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.isRunning {
		return
	}
	s.isRunning = false
	if s.ticker != nil {
		s.ticker.Stop()
	}
	close(s.stopChan)
}

func isInQuietHours(now time.Time, startStr, endStr string) bool {
	parseHourMinute := func(s string) (int, int) {
		parts := strings.Split(s, ":")
		if len(parts) == 2 {
			h, _ := strconv.Atoi(parts[0])
			m, _ := strconv.Atoi(parts[1])
			return h, m
		}
		return 22, 0
	}

	sH, sM := parseHourMinute(startStr)
	eH, eM := parseHourMinute(endStr)

	currMinutes := now.Hour()*60 + now.Minute()
	startMinutes := sH*60 + sM
	endMinutes := eH*60 + eM

	if startMinutes > endMinutes {
		// Spans midnight (e.g. 22:00 to 08:00)
		return currMinutes >= startMinutes || currMinutes < endMinutes
	}
	return currMinutes >= startMinutes && currMinutes < endMinutes
}

func calculateQuietHoursEnd(now time.Time, endStr string) time.Time {
	parts := strings.Split(endStr, ":")
	h := 8
	m := 0
	if len(parts) == 2 {
		h, _ = strconv.Atoi(parts[0])
		m, _ = strconv.Atoi(parts[1])
	}

	target := time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, now.Location())
	if target.Before(now) {
		target = target.AddDate(0, 0, 1)
	}
	return target
}
