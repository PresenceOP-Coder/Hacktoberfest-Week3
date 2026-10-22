package store_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/store"
)

func setupTestStore(t *testing.T) (*store.Store, string) {
	ctx := context.Background()
	s, err := store.New(ctx, ":memory:")
	if err != nil {
		t.Fatalf("failed to create in-memory store: %v", err)
	}

	migrationsDir := filepath.Join("..", "..", "migrations")
	if err := s.RunMigrations(ctx, migrationsDir); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	accountID := "acc-test-1"
	acc := &domain.Account{
		ID:           accountID,
		Provider:     "google",
		EmailAddress: "tester@techcorp.internal",
		Timezone:     "UTC",
		Status:       "connected",
	}
	if err := s.UpsertAccount(ctx, acc); err != nil {
		t.Fatalf("failed to upsert account: %v", err)
	}

	return s, accountID
}

func TestStore_AccountLifecycle(t *testing.T) {
	s, accountID := setupTestStore(t)
	defer s.Close()
	ctx := context.Background()

	acc, err := s.GetAccount(ctx, accountID)
	if err != nil {
		t.Fatalf("GetAccount failed: %v", err)
	}
	if acc == nil || acc.EmailAddress != "tester@techcorp.internal" {
		t.Fatalf("unexpected account: %+v", acc)
	}
}

func TestStore_ImportFixturesAndList(t *testing.T) {
	s, accountID := setupTestStore(t)
	defer s.Close()
	ctx := context.Background()

	fixturesPath := filepath.Join("..", "..", "testdata", "emails", "fixtures.json")
	count, err := s.ImportFixtures(ctx, accountID, fixturesPath)
	if err != nil {
		t.Fatalf("failed to import fixtures: %v", err)
	}
	if count < 25 {
		t.Fatalf("expected at least 25 fixtures imported, got %d", count)
	}

	// Idempotency test: importing again should succeed without error
	count2, err := s.ImportFixtures(ctx, accountID, fixturesPath)
	if err != nil {
		t.Fatalf("second import should be idempotent, failed: %v", err)
	}
	if count2 != count {
		t.Fatalf("expected %d on second import, got %d", count, count2)
	}

	msgs, err := s.ListMessages(ctx, accountID, 10, 0)
	if err != nil {
		t.Fatalf("failed to list messages: %v", err)
	}
	if len(msgs) != 10 {
		t.Fatalf("expected 10 messages, got %d", len(msgs))
	}
}

func TestStore_TaskAndMessageLinking(t *testing.T) {
	s, accountID := setupTestStore(t)
	defer s.Close()
	ctx := context.Background()

	msg1 := &domain.Message{
		ID:          "msg-orion-1",
		AccountID:   accountID,
		GmailID:     "gm-o1",
		ThreadID:    "th-orion",
		FromAddress: "sarah@techcorp.internal",
		Subject:     "Project Orion QA Sign-off",
		ReceivedAt:  time.Now().UTC().Add(-2 * time.Hour),
		Snippet:     "Please sign off by Friday",
		SyncStatus:  "synced",
	}
	if err := s.SaveMessage(ctx, msg1); err != nil {
		t.Fatalf("failed to save msg1: %v", err)
	}

	due := time.Now().UTC().Add(48 * time.Hour)
	task := &domain.Task{
		ID:               "task-orion",
		AccountID:        accountID,
		Title:            "Review Orion QA report and sign off",
		Status:           domain.TaskStatusDetected,
		Priority:         domain.PriorityHigh,
		DueAt:            &due,
		DueDatePrecision: "datetime",
		OwnerState:       "user_action",
	}
	if err := s.SaveTask(ctx, task); err != nil {
		t.Fatalf("failed to save task: %v", err)
	}

	if err := s.LinkTaskMessage(ctx, task.ID, msg1.ID, "origin", "rule"); err != nil {
		t.Fatalf("failed to link task message: %v", err)
	}

	foundTask, err := s.FindTaskByThreadID(ctx, "th-orion")
	if err != nil {
		t.Fatalf("failed to find task by thread id: %v", err)
	}
	if foundTask == nil || foundTask.ID != task.ID {
		t.Fatalf("expected task %s, got %+v", task.ID, foundTask)
	}

	// Link a follow-up message to the same task
	msg2 := &domain.Message{
		ID:          "msg-orion-2",
		AccountID:   accountID,
		GmailID:     "gm-o2",
		ThreadID:    "th-orion",
		FromAddress: "sarah@techcorp.internal",
		Subject:     "Re: Project Orion QA Sign-off - Extension",
		ReceivedAt:  time.Now().UTC().Add(-1 * time.Hour),
		Snippet:     "Deadline extended",
		SyncStatus:  "synced",
	}
	if err := s.SaveMessage(ctx, msg2); err != nil {
		t.Fatalf("failed to save msg2: %v", err)
	}
	if err := s.LinkTaskMessage(ctx, task.ID, msg2.ID, "deadline_update", "same_thread"); err != nil {
		t.Fatalf("failed to link msg2: %v", err)
	}

	loadedTask, err := s.GetTask(ctx, task.ID)
	if err != nil {
		t.Fatalf("failed to get task: %v", err)
	}
	if len(loadedTask.LinkedMessages) != 2 {
		t.Fatalf("expected 2 linked messages on task, got %d", len(loadedTask.LinkedMessages))
	}
}

func TestStore_NotificationClaiming(t *testing.T) {
	s, accountID := setupTestStore(t)
	defer s.Close()
	ctx := context.Background()

	past := time.Now().UTC().Add(-5 * time.Minute)
	notif := &domain.Notification{
		ID:          "notif-1",
		AccountID:   accountID,
		Kind:        domain.NotificationKindDeadline,
		Title:       "Upcoming Deadline: Orion Release",
		Body:        "QA sign-off is due soon",
		ScheduledAt: past,
		DedupeKey:   "task-orion:deadline:2026-10-23",
		Status:      "scheduled",
	}

	if err := s.ScheduleNotification(ctx, notif); err != nil {
		t.Fatalf("failed to schedule notification: %v", err)
	}

	// Claim due notifications
	claimed, err := s.ClaimDueNotifications(ctx, time.Now().UTC(), 10)
	if err != nil {
		t.Fatalf("failed to claim: %v", err)
	}
	if len(claimed) != 1 {
		t.Fatalf("expected 1 claimed notification, got %d", len(claimed))
	}
	if claimed[0].ID != "notif-1" {
		t.Fatalf("unexpected claimed id: %s", claimed[0].ID)
	}

	// Double claim should return 0 (atomic claim changed status to 'delivering')
	claimed2, err := s.ClaimDueNotifications(ctx, time.Now().UTC(), 10)
	if err != nil {
		t.Fatalf("failed to claim 2: %v", err)
	}
	if len(claimed2) != 0 {
		t.Fatalf("expected 0 claimed on second attempt, got %d", len(claimed2))
	}

	// Mark delivered
	if err := s.MarkNotificationDelivered(ctx, "notif-1"); err != nil {
		t.Fatalf("failed to mark delivered: %v", err)
	}
}
