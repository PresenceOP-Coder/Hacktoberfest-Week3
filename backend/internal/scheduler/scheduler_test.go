package scheduler_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/scheduler"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
)

func TestScheduler_CompletedTaskSuppression(t *testing.T) {
	ctx := context.Background()
	st, err := store.New(ctx, ":memory:")
	if err != nil {
		t.Fatalf("creating store: %v", err)
	}
	defer st.Close()

	migrationsDir := filepath.Join("..", "..", "migrations")
	if err := st.RunMigrations(ctx, migrationsDir); err != nil {
		t.Fatalf("running migrations: %v", err)
	}

	accountID := "acc-sched-test"
	acc := &domain.Account{
		ID:           accountID,
		Provider:     "google",
		EmailAddress: "alex@techcorp.internal",
		Timezone:     "UTC",
		Status:       "connected",
	}
	_ = st.UpsertAccount(ctx, acc)

	due := time.Now().UTC().Add(30 * time.Minute)
	task := &domain.Task{
		ID:        "task-suppress",
		AccountID: accountID,
		Title:     "Review Vendor Agreement",
		Status:    domain.TaskStatusCompleted, // COMPLETED
		Priority:  domain.PriorityHigh,
		DueAt:     &due,
	}
	_ = st.SaveTask(ctx, task)

	// Manually schedule a past notification
	past := time.Now().UTC().Add(-5 * time.Minute)
	notif := &domain.Notification{
		ID:          "notif-suppress-1",
		AccountID:   accountID,
		TaskID:      &task.ID,
		Kind:        domain.NotificationKindDeadline,
		Title:       "Review Vendor Agreement is due",
		ScheduledAt: past,
		DedupeKey:   "task-suppress:reminder",
		Status:      "scheduled",
	}
	_ = st.ScheduleNotification(ctx, notif)

	sched := scheduler.NewScheduler(st)

	// Process due notifications
	delivered, err := sched.ProcessDueNotifications(ctx, accountID)
	if err != nil {
		t.Fatalf("processing due notifications: %v", err)
	}

	// Should be suppressed (0 delivered to user) because the task is completed!
	if len(delivered) != 0 {
		t.Fatalf("expected 0 delivered notifications due to task completion suppression, got %d", len(delivered))
	}
}

func TestScheduler_IdempotentSync(t *testing.T) {
	ctx := context.Background()
	st, err := store.New(ctx, ":memory:")
	if err != nil {
		t.Fatalf("creating store: %v", err)
	}
	defer st.Close()

	migrationsDir := filepath.Join("..", "..", "migrations")
	if err := st.RunMigrations(ctx, migrationsDir); err != nil {
		t.Fatalf("running migrations: %v", err)
	}

	accountID := "acc-sched-test-2"
	acc := &domain.Account{
		ID:           accountID,
		Provider:     "google",
		EmailAddress: "alex@techcorp.internal",
		Timezone:     "UTC",
		Status:       "connected",
	}
	_ = st.UpsertAccount(ctx, acc)

	due := time.Now().UTC().Add(10 * time.Hour)
	task := &domain.Task{
		ID:        "task-idempotent",
		AccountID: accountID,
		Title:     "Renew SSL Certificate",
		Status:    domain.TaskStatusConfirmed,
		Priority:  domain.PriorityUrgent,
		DueAt:     &due,
	}
	_ = st.SaveTask(ctx, task)

	sched := scheduler.NewScheduler(st)

	// 1st sync
	c1, err := sched.SyncTaskReminders(ctx, accountID)
	if err != nil || c1 != 1 {
		t.Fatalf("expected 1 task reminder scheduled on first sync, got %d (err: %v)", c1, err)
	}

	// 2nd sync (should be idempotent with no duplicates)
	c2, err := sched.SyncTaskReminders(ctx, accountID)
	if err != nil || c2 != 1 {
		t.Fatalf("expected 1 on second sync, got %d (err: %v)", c2, err)
	}

	notifs, err := st.ListNotifications(ctx, accountID, 10)
	if err != nil {
		t.Fatalf("listing notifications: %v", err)
	}
	if len(notifs) != 1 {
		t.Fatalf("expected exactly 1 notification record in database, found %d", len(notifs))
	}
}
