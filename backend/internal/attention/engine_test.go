package attention_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/attention"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
)

func TestAttentionEngine_MultiMessageThreadDeduplication(t *testing.T) {
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

	accountID := "acc-test"
	acc := &domain.Account{
		ID:           accountID,
		Provider:     "google",
		EmailAddress: "alex@techcorp.internal",
		Timezone:     "UTC",
		Status:       "connected",
	}
	_ = st.UpsertAccount(ctx, acc)

	engine := attention.NewEngine(st)

	// Email 1: Initial request (Deadline Thursday 12:00)
	t1 := time.Date(2026, 10, 23, 12, 0, 0, 0, time.UTC)
	msg1 := &domain.Message{
		ID:          "msg-orion-1",
		AccountID:   accountID,
		GmailID:     "gm-1",
		ThreadID:    "th-orion-launch",
		FromAddress: "sarah.lead@techcorp.internal",
		Subject:     "Project Orion: QA sign-off",
		ReceivedAt:  time.Date(2026, 10, 21, 9, 15, 0, 0, time.UTC),
		Snippet:     "Sign off by Thursday noon",
		SyncStatus:  "synced",
	}
	_ = st.SaveMessage(ctx, msg1)

	an1 := &domain.Analysis{
		ID:                  "an-1",
		MessageID:           msg1.ID,
		Category:            domain.CategoryActionRequired,
		Priority:            domain.PriorityHigh,
		ActionText:          "Review staging QA regression report and sign off",
		DeadlineText:        "Thursday noon",
		DeadlineCandidateAt: &t1,
		EvidenceText:        "provide sign-off by Thursday noon",
	}
	_ = st.SaveAnalysis(ctx, an1)

	task1, err := engine.ProcessMessageAnalysis(ctx, msg1, an1)
	if err != nil {
		t.Fatalf("processing msg1: %v", err)
	}
	if task1 == nil {
		t.Fatalf("expected task created for msg1")
	}
	if task1.Status != domain.TaskStatusDetected {
		t.Errorf("expected detected status, got %s", task1.Status)
	}
	if task1.DueAt == nil || task1.DueAt.Hour() != 12 {
		t.Errorf("expected due at 12:00, got %v", task1.DueAt)
	}

	// Email 2: Follow-up with deadline extension (Deadline Friday 15:00)
	t2 := time.Date(2026, 10, 24, 15, 0, 0, 0, time.UTC)
	msg2 := &domain.Message{
		ID:          "msg-orion-2",
		AccountID:   accountID,
		GmailID:     "gm-2",
		ThreadID:    "th-orion-launch", // SAME THREAD
		FromAddress: "sarah.lead@techcorp.internal",
		Subject:     "Re: Project Orion: QA sign-off - Deadline extension",
		ReceivedAt:  time.Date(2026, 10, 21, 16, 45, 0, 0, time.UTC),
		Snippet:     "Extending deadline to Friday 3 PM",
		SyncStatus:  "synced",
	}
	_ = st.SaveMessage(ctx, msg2)

	an2 := &domain.Analysis{
		ID:                  "an-2",
		MessageID:           msg2.ID,
		Category:            domain.CategoryActionRequired,
		Priority:            domain.PriorityHigh,
		ActionText:          "Review staging QA regression report (Extended)",
		DeadlineText:        "Friday at 3:00 PM",
		DeadlineCandidateAt: &t2,
		EvidenceText:        "extending the sign-off deadline to Friday at 3:00 PM",
	}
	_ = st.SaveAnalysis(ctx, an2)

	task2, err := engine.ProcessMessageAnalysis(ctx, msg2, an2)
	if err != nil {
		t.Fatalf("processing msg2: %v", err)
	}
	if task2 == nil {
		t.Fatalf("expected task returned for msg2")
	}

	// VERIFY ATTENTION DEBT CRITERION: Task ID must be IDENTICAL (single responsibility)
	if task2.ID != task1.ID {
		t.Fatalf("Attention Debt failure: created duplicate task %s instead of updating %s", task2.ID, task1.ID)
	}

	// VERIFY DEADLINE EVOLUTION: DueAt updated to Friday 15:00
	if task2.DueAt == nil || task2.DueAt.Day() != 24 || task2.DueAt.Hour() != 15 {
		t.Errorf("expected due date updated to Friday 15:00, got %v", task2.DueAt)
	}

	// Verify total tasks in database for this account is exactly 1
	allTasks, err := st.ListTasks(ctx, accountID, "")
	if err != nil {
		t.Fatalf("listing tasks: %v", err)
	}
	if len(allTasks) != 1 {
		t.Fatalf("expected exactly 1 task in database, found %d", len(allTasks))
	}

	// Verify timeline of linked messages
	linkedTask := allTasks[0]
	if len(linkedTask.LinkedMessages) != 2 {
		t.Fatalf("expected 2 linked messages on task timeline, got %d", len(linkedTask.LinkedMessages))
	}
}
