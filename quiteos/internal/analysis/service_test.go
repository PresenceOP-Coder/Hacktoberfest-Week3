package analysis_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/ai"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/analysis"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/store"
)

func TestResolveDeadline_DeterministicRules(t *testing.T) {
	// Reference date: Wednesday 2026-10-21 10:00:00 UTC
	refTime := time.Date(2026, 10, 21, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name       string
		phrase     string
		wantExplicit bool
		wantVague  bool
		wantHour   int
		wantDay    int
	}{
		{
			name:         "Today at 5 PM",
			phrase:       "today at 5:00 PM UTC",
			wantExplicit: true,
			wantVague:    false,
			wantHour:     17,
			wantDay:      21,
		},
		{
			name:         "Tomorrow at 4 PM",
			phrase:       "tomorrow at 4:00 PM",
			wantExplicit: true,
			wantVague:    false,
			wantHour:     16,
			wantDay:      22,
		},
		{
			name:         "Friday 3 PM",
			phrase:       "Friday at 3:00 PM",
			wantExplicit: true,
			wantVague:    false,
			wantHour:     15,
			wantDay:      23,
		},
		{
			name:         "Explicit date October 24",
			phrase:       "October 24 at 17:00 UTC",
			wantExplicit: true,
			wantVague:    false,
			wantHour:     17,
			wantDay:      24,
		},
		{
			name:         "Vague deadline - sometime next week",
			phrase:       "sometime next week",
			wantExplicit: false,
			wantVague:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := analysis.ResolveDeadline(tt.phrase, refTime, "UTC")
			if res.IsExplicit != tt.wantExplicit {
				t.Errorf("got explicit=%v, want %v", res.IsExplicit, tt.wantExplicit)
			}
			if res.IsVague != tt.wantVague {
				t.Errorf("got vague=%v, want %v", res.IsVague, tt.wantVague)
			}
			if tt.wantExplicit && res.ResolvedAt != nil {
				if res.ResolvedAt.Day() != tt.wantDay {
					t.Errorf("got day=%d, want %d", res.ResolvedAt.Day(), tt.wantDay)
				}
				if res.ResolvedAt.Hour() != tt.wantHour {
					t.Errorf("got hour=%d, want %d", res.ResolvedAt.Hour(), tt.wantHour)
				}
			}
		})
	}
}

func TestAnalysisService_ProcessMessage(t *testing.T) {
	ctx := context.Background()
	st, err := store.New(ctx, ":memory:")
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}
	defer st.Close()

	migrationsDir := filepath.Join("..", "..", "migrations")
	if err := st.RunMigrations(ctx, migrationsDir); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
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

	msg := &domain.Message{
		ID:          "msg-sec-1",
		AccountID:   accountID,
		GmailID:     "gm-sec-1",
		ThreadID:    "th-sec",
		FromAddress: "ciso-alerts@techcorp.internal",
		Subject:     "CRITICAL: Urgent zero-day vulnerability in OpenSSL",
		ReceivedAt:  time.Date(2026, 10, 22, 8, 30, 0, 0, time.UTC),
		Snippet:     "Deadline is today at 5:00 PM UTC",
		BodyText:    "Critical zero-day. Deadline is today at 5:00 PM UTC.",
		SyncStatus:  "synced",
	}
	if err := st.SaveMessage(ctx, msg); err != nil {
		t.Fatalf("failed to save msg: %v", err)
	}

	analyzer := ai.NewFallbackRuleAnalyzer()
	svc := analysis.NewService(st, analyzer)

	an, err := svc.ProcessMessage(ctx, msg, "UTC")
	if err != nil {
		t.Fatalf("ProcessMessage failed: %v", err)
	}

	if an.Category != domain.CategoryActionRequired {
		t.Errorf("expected action_required, got %s", an.Category)
	}
	if an.Priority != domain.PriorityUrgent {
		t.Errorf("expected urgent priority, got %s", an.Priority)
	}
	if an.EvidenceText == "" {
		t.Errorf("expected non-empty evidence quote")
	}
	if an.DeadlineCandidateAt == nil {
		t.Errorf("expected resolved deadline candidate")
	} else if an.DeadlineCandidateAt.Hour() != 17 {
		t.Errorf("expected 17:00 UTC, got %d", an.DeadlineCandidateAt.Hour())
	}
}
