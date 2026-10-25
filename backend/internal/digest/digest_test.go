package digest_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/digest"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
)

func TestDigestGenerator_DeterministicSelection(t *testing.T) {
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

	accountID := "acc-digest-test"
	acc := &domain.Account{
		ID:           accountID,
		Provider:     "google",
		EmailAddress: "alex@techcorp.internal",
		Timezone:     "UTC",
		Status:       "connected",
	}
	_ = st.UpsertAccount(ctx, acc)

	// Create urgent message
	msg1 := &domain.Message{
		ID:          "msg-crit",
		AccountID:   accountID,
		GmailID:     "gm-crit",
		ThreadID:    "th-crit",
		FromAddress: "ciso@techcorp.internal",
		Subject:     "CRITICAL Security Alert",
		ReceivedAt:  time.Now().UTC(),
		SyncStatus:  "synced",
	}
	_ = st.SaveMessage(ctx, msg1)
	_ = st.SaveAnalysis(ctx, &domain.Analysis{
		ID:           "an-crit",
		MessageID:    msg1.ID,
		Category:     domain.CategoryActionRequired,
		Priority:     domain.PriorityUrgent,
		ActionText:   "Apply zero-day patch",
		EvidenceText: "Critical vulnerability detected",
	})

	// Create task due in 12 hours
	dueSoon := time.Now().UTC().Add(12 * time.Hour)
	task1 := &domain.Task{
		ID:        "task-1",
		AccountID: accountID,
		Title:     "Submit SOC2 rotation logs",
		Status:    domain.TaskStatusConfirmed,
		Priority:  domain.PriorityHigh,
		DueAt:     &dueSoon,
	}
	_ = st.SaveTask(ctx, task1)

	generator := digest.NewGenerator(st)
	d, err := generator.GenerateDailyDigest(ctx, accountID, "2026-10-22")
	if err != nil {
		t.Fatalf("generating digest: %v", err)
	}

	if len(d.UrgentItems) != 1 {
		t.Errorf("expected 1 urgent item, got %d", len(d.UrgentItems))
	}
	if len(d.DueSoonTasks) != 1 {
		t.Errorf("expected 1 due soon task, got %d", len(d.DueSoonTasks))
	}
	if d.TotalItems < 2 {
		t.Errorf("expected at least 2 total items, got %d", d.TotalItems)
	}
}
