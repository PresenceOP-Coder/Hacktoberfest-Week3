package analysis

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/ai"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/store"
	"github.com/google/uuid"
)

type Service struct {
	store    *store.Store
	analyzer ai.EmailAnalyzer
}

func NewService(s *store.Store, analyzer ai.EmailAnalyzer) *Service {
	return &Service{
		store:    s,
		analyzer: analyzer,
	}
}

func (s *Service) ProcessMessage(ctx context.Context, msg *domain.Message, userTZ string) (*domain.Analysis, error) {
	input := ai.AnalysisInput{
		MessageID:   msg.ID,
		FromAddress: msg.FromAddress,
		Subject:     msg.Subject,
		ReceivedAt:  msg.ReceivedAt,
		Body:        msg.BodyText,
		Timezone:    userTZ,
	}

	candidate, err := s.analyzer.Analyze(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("ai analysis failed: %w", err)
	}

	var validationErrors []string

	// Validate Category
	switch candidate.Category {
	case domain.CategoryActionRequired, domain.CategoryInformational,
		domain.CategoryNewsletter, domain.CategoryTransactional, domain.CategoryUnknown:
		// valid
	default:
		validationErrors = append(validationErrors, fmt.Sprintf("invalid category '%s'", candidate.Category))
		candidate.Category = domain.CategoryUnknown
	}

	// Validate Priority
	switch candidate.PriorityCandidate {
	case domain.PriorityUrgent, domain.PriorityHigh, domain.PriorityNormal,
		domain.PriorityLow, domain.PriorityUnknown:
		// valid
	default:
		validationErrors = append(validationErrors, fmt.Sprintf("invalid priority '%s'", candidate.PriorityCandidate))
		candidate.PriorityCandidate = domain.PriorityUnknown
	}

	// Validate Evidence if action is required
	if candidate.Category == domain.CategoryActionRequired && candidate.EvidenceText == "" {
		validationErrors = append(validationErrors, "missing required evidence quote for action item")
	}

	// Resolve deadline deterministically
	var deadlineAt *time.Time
	var deadlineTZ string
	if candidate.DeadlineText != "" {
		res := ResolveDeadline(candidate.DeadlineText, msg.ReceivedAt, userTZ)
		if res.ResolvedAt != nil {
			deadlineAt = res.ResolvedAt
			deadlineTZ = res.Timezone
		}
		if res.IsVague {
			candidate.RequiresUserReview = true
			validationErrors = append(validationErrors, "deadline is vague/ambiguous; requires user confirmation")
		}
	}

	status := "completed"
	if candidate.RequiresUserReview || len(validationErrors) > 0 {
		status = "needs_review"
	}

	now := time.Now().UTC()
	analysis := &domain.Analysis{
		ID:                  uuid.NewString(),
		MessageID:           msg.ID,
		ModelName:           candidate.ModelName,
		PromptVersion:       candidate.PromptVersion,
		SchemaVersion:       candidate.SchemaVersion,
		Status:              status,
		Category:            candidate.Category,
		Priority:            candidate.PriorityCandidate,
		ActionText:          candidate.ActionText,
		DeadlineText:        candidate.DeadlineText,
		DeadlineCandidateAt: deadlineAt,
		DeadlineTimezone:    deadlineTZ,
		EvidenceText:        candidate.EvidenceText,
		ValidationErrors:    validationErrors,
		RawModelOutput:      candidate.RawOutput,
		IsCurrent:           true,
		ProcessedAt:         &now,
		CreatedAt:           now,
	}

	if err := s.store.SaveAnalysis(ctx, analysis); err != nil {
		return nil, fmt.Errorf("saving analysis: %w", err)
	}

	return analysis, nil
}

func (s *Service) AnalyzeAllMessages(ctx context.Context, accountID, userTZ string) (int, error) {
	// List messages for the account
	msgs, err := s.store.ListMessages(ctx, accountID, 100, 0)
	if err != nil {
		return 0, fmt.Errorf("listing messages: %w", err)
	}

	processedCount := 0
	for _, m := range msgs {
		// Only analyze if not analyzed yet or requested
		if m.Analysis == nil {
			fullMsg, err := s.store.GetMessage(ctx, m.ID)
			if err != nil || fullMsg == nil {
				continue
			}
			_, err = s.ProcessMessage(ctx, fullMsg, userTZ)
			if err != nil {
				log.Printf("[QuietOS] Error analyzing message %s: %v", m.ID, err)
				continue
			}
			processedCount++
		}
	}

	return processedCount, nil
}
