package attention

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
	"github.com/google/uuid"
)

type Engine struct {
	store *store.Store
}

func NewEngine(s *store.Store) *Engine {
	return &Engine{store: s}
}

// ProcessMessageAnalysis updates or creates a Task based on the message analysis.
// This is the core "Attention Debt" deduplication loop: multiple emails in a thread
// collapse into a single unified responsibility with an evolving timeline.
func (e *Engine) ProcessMessageAnalysis(ctx context.Context, msg *domain.Message, an *domain.Analysis) (*domain.Task, error) {
	if an == nil {
		return nil, nil
	}

	prefs, _ := e.store.GetPreferences(ctx, msg.AccountID)

	// Check if this thread already has a task
	existingTask, err := e.store.FindTaskByThreadID(ctx, msg.ThreadID)
	if err != nil {
		return nil, fmt.Errorf("finding task by thread: %w", err)
	}

	if existingTask != nil {
		// Existing task found! Evolve it rather than creating a duplicate.
		relationship := "context"
		if an.Category == domain.CategoryActionRequired {
			relationship = "follow_up"
		}

		// If this message updates the deadline
		if an.DeadlineCandidateAt != nil {
			relationship = "deadline_update"
			existingTask.DueAt = an.DeadlineCandidateAt
			existingTask.DueDatePrecision = "datetime"
			existingTask.DueTimezone = an.DeadlineTimezone
		}

		// Elevate priority if this message is urgent
		if an.Priority == domain.PriorityUrgent {
			existingTask.Priority = domain.PriorityUrgent
		} else if an.Priority == domain.PriorityHigh && existingTask.Priority != domain.PriorityUrgent {
			existingTask.Priority = domain.PriorityHigh
		}

		// Check VIP sender elevation
		if prefs != nil && isVIP(msg.FromAddress, prefs.VIPSenders) {
			if existingTask.Priority == domain.PriorityNormal || existingTask.Priority == domain.PriorityLow {
				existingTask.Priority = domain.PriorityHigh
			}
		}

		// Save updated task
		if err := e.store.SaveTask(ctx, existingTask); err != nil {
			return nil, fmt.Errorf("updating existing task: %w", err)
		}

		// Link message with provenance
		if err := e.store.LinkTaskMessage(ctx, existingTask.ID, msg.ID, relationship, "same_thread"); err != nil {
			return nil, fmt.Errorf("linking message to task: %w", err)
		}

		return existingTask, nil
	}

	// No existing task. If action is required, create a new detected task.
	if an.Category == domain.CategoryActionRequired {
		title := an.ActionText
		if title == "" {
			title = msg.Subject
		}

		priority := an.Priority
		if priority == "" || priority == domain.PriorityUnknown {
			priority = domain.PriorityNormal
		}

		// Promote priority if from VIP sender
		if prefs != nil && isVIP(msg.FromAddress, prefs.VIPSenders) {
			if priority == domain.PriorityNormal || priority == domain.PriorityLow {
				priority = domain.PriorityHigh
			}
		}

		task := &domain.Task{
			ID:               uuid.NewString(),
			AccountID:        msg.AccountID,
			Title:            title,
			Description:      fmt.Sprintf("From: %s\nSubject: %s\nEvidence: %s", msg.FromAddress, msg.Subject, an.EvidenceText),
			Status:           domain.TaskStatusDetected,
			Priority:         priority,
			DueAt:            an.DeadlineCandidateAt,
			DueDatePrecision: "datetime",
			DueTimezone:      an.DeadlineTimezone,
			OwnerState:       "user_action",
			CreatedAt:        time.Now().UTC(),
			UpdatedAt:        time.Now().UTC(),
		}

		if err := e.store.SaveTask(ctx, task); err != nil {
			return nil, fmt.Errorf("creating task: %w", err)
		}

		if err := e.store.LinkTaskMessage(ctx, task.ID, msg.ID, "origin", "ai_detection"); err != nil {
			return nil, fmt.Errorf("linking origin message: %w", err)
		}

		return task, nil
	}

	return nil, nil
}

// SyncAttentionDebt iterates through all analyzed messages for an account
// and creates/updates tasks chronologically.
func (e *Engine) SyncAttentionDebt(ctx context.Context, accountID string) (int, error) {
	// List recent messages
	msgs, err := e.store.ListMessages(ctx, accountID, 100, 0)
	if err != nil {
		return 0, fmt.Errorf("listing messages: %w", err)
	}

	// Process chronologically (oldest to newest) to maintain causality
	tasksCreatedOrUpdated := 0
	for i := len(msgs) - 1; i >= 0; i-- {
		m := msgs[i]
		if m.Analysis != nil {
			t, err := e.ProcessMessageAnalysis(ctx, m, m.Analysis)
			if err != nil {
				log.Printf("[SnoozeBox] Error syncing attention debt for msg %s: %v", m.ID, err)
				continue
			}
			if t != nil {
				tasksCreatedOrUpdated++
			}
		}
	}

	return tasksCreatedOrUpdated, nil
}

func isVIP(from string, vips []string) bool {
	lowerFrom := strings.ToLower(from)
	for _, v := range vips {
		if strings.Contains(lowerFrom, strings.ToLower(v)) {
			return true
		}
	}
	return false
}
