package digest

import (
	"context"
	"fmt"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
)

type Generator struct {
	store *store.Store
}

func NewGenerator(s *store.Store) *Generator {
	return &Generator{store: s}
}

// GenerateDailyDigest compiles a quiet, focused daily summary based on deterministic facts:
// 1. Critical & Urgent items backed by evidence.
// 2. Tasks Due Soon or Overdue (due within 48h).
// 3. Open Action Items needing attention.
// 4. Low-priority newsletters / noise batched at the bottom.
func (g *Generator) GenerateDailyDigest(ctx context.Context, accountID string, targetDate string) (*domain.Digest, error) {
	acc, err := g.store.GetAccount(ctx, accountID)
	if err != nil || acc == nil {
		return nil, fmt.Errorf("account not found: %w", err)
	}

	loc := time.UTC
	if acc.Timezone != "" {
		if l, err := time.LoadLocation(acc.Timezone); err == nil {
			loc = l
		}
	}

	now := time.Now().In(loc)
	if targetDate == "" {
		targetDate = now.Format("2006-01-02")
	}

	// 1. Fetch messages
	msgs, err := g.store.ListMessages(ctx, accountID, 100, 0)
	if err != nil {
		return nil, fmt.Errorf("listing messages for digest: %w", err)
	}

	// 2. Fetch active tasks
	tasks, err := g.store.ListTasks(ctx, accountID, "")
	if err != nil {
		return nil, fmt.Errorf("listing tasks for digest: %w", err)
	}

	var urgentItems []domain.DigestItem
	var pendingActions []domain.DigestItem
	var lowPriorityNews []domain.DigestItem
	var dueSoonTasks []domain.DigestTaskItem

	// Categorize messages
	for _, m := range msgs {
		if m.Analysis == nil {
			continue
		}

		item := domain.DigestItem{
			MessageID:   m.ID,
			Subject:     m.Subject,
			FromAddress: m.FromAddress,
			ReceivedAt:  m.ReceivedAt,
			Category:    m.Analysis.Category,
			Priority:    m.Analysis.Priority,
			ActionText:  m.Analysis.ActionText,
			Evidence:    m.Analysis.EvidenceText,
		}

		if m.Analysis.Priority == domain.PriorityUrgent {
			urgentItems = append(urgentItems, item)
		} else if m.Analysis.Category == domain.CategoryActionRequired {
			pendingActions = append(pendingActions, item)
		} else if m.Analysis.Category == domain.CategoryNewsletter || m.Analysis.Priority == domain.PriorityLow {
			if len(lowPriorityNews) < 5 { // Capped batch for low priority
				lowPriorityNews = append(lowPriorityNews, item)
			}
		}
	}

	// Categorize tasks (Due Soon / Overdue)
	horizon := now.Add(48 * time.Hour)
	for _, t := range tasks {
		if t.Status == domain.TaskStatusCompleted || t.Status == domain.TaskStatusDismissed {
			continue
		}

		isOverdue := t.DueAt != nil && t.DueAt.Before(now.UTC())
		isDueSoon := t.DueAt != nil && (t.DueAt.Before(horizon.UTC()) || isOverdue)

		if isDueSoon || t.Priority == domain.PriorityUrgent {
			dueSoonTasks = append(dueSoonTasks, domain.DigestTaskItem{
				TaskID:      t.ID,
				Title:       t.Title,
				Priority:    t.Priority,
				Status:      t.Status,
				DueAt:       t.DueAt,
				IsOverdue:   isOverdue,
				LinkedCount: len(t.LinkedMessages),
			})
		}
	}

	totalCount := len(urgentItems) + len(dueSoonTasks) + len(pendingActions)
	headline := fmt.Sprintf("SnoozeBox Morning Digest: %d urgent items, %d tasks due soon.", len(urgentItems), len(dueSoonTasks))
	if len(urgentItems) == 0 && len(dueSoonTasks) == 0 {
		headline = "All quiet: No urgent emails or imminent deadlines today."
	}

	return &domain.Digest{
		Date:            targetDate,
		GeneratedAt:     time.Now().UTC(),
		AccountID:       accountID,
		Headline:        headline,
		TotalItems:      totalCount,
		UrgentItems:     urgentItems,
		DueSoonTasks:    dueSoonTasks,
		PendingActions:  pendingActions,
		LowPriorityNews: lowPriorityNews,
	}, nil
}
