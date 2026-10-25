package analysis_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/ai"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/analysis"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/store"
)

type GroundTruthData struct {
	SampleCount int `json:"sample_count"`
	Annotations map[string]struct {
		Category            string `json:"category"`
		Priority            string `json:"priority"`
		ActionText          string `json:"action_text"`
		HasExplicitDeadline bool   `json:"has_explicit_deadline"`
		DeadlineText        string `json:"deadline_text"`
		EvidenceSnippet     string `json:"evidence_snippet"`
	} `json:"annotations"`
}

func TestEvaluationHarness_GroundTruthMetrics(t *testing.T) {
	ctx := context.Background()
	gtPath := filepath.Join("..", "..", "testdata", "labels", "ground_truth.json")
	gtBytes, err := os.ReadFile(gtPath)
	if err != nil {
		t.Fatalf("reading ground truth: %v", err)
	}

	var gt GroundTruthData
	if err := json.Unmarshal(gtBytes, &gt); err != nil {
		t.Fatalf("parsing ground truth: %v", err)
	}

	fixturesPath := filepath.Join("..", "..", "testdata", "emails", "fixtures.json")
	fixBytes, err := os.ReadFile(fixturesPath)
	if err != nil {
		t.Fatalf("reading fixtures: %v", err)
	}
	var fixtures []store.FixtureMessage
	if err := json.Unmarshal(fixBytes, &fixtures); err != nil {
		t.Fatalf("parsing fixtures: %v", err)
	}

	analyzer := ai.NewFallbackRuleAnalyzer()

	var (
		totalUrgentTruth    int
		detectedUrgent      int
		trueUrgentDetected  int
		totalDeadlinesTruth int
		deadlinesCorrect    int
	)

	for _, f := range fixtures {
		ann, ok := gt.Annotations[f.ID]
		if !ok {
			continue
		}

		recAt, _ := time.Parse(time.RFC3339, f.ReceivedAt)
		cand, err := analyzer.Analyze(ctx, ai.AnalysisInput{
			MessageID:   f.ID,
			FromAddress: f.FromAddress,
			Subject:     f.Subject,
			ReceivedAt:  recAt,
			Body:        f.BodyText,
		})
		if err != nil {
			t.Errorf("error analyzing %s: %v", f.ID, err)
			continue
		}

		// Urgent recall & precision
		isActuallyUrgent := ann.Priority == "urgent"
		isPredictedUrgent := cand.PriorityCandidate == domain.PriorityUrgent

		if isActuallyUrgent {
			totalUrgentTruth++
			if isPredictedUrgent {
				trueUrgentDetected++
			}
		}
		if isPredictedUrgent {
			detectedUrgent++
		}

		// Deadline check
		if ann.HasExplicitDeadline {
			totalDeadlinesTruth++
			if cand.DeadlineIsExplicit && cand.DeadlineText != "" {
				res := analysis.ResolveDeadline(cand.DeadlineText, recAt, "UTC")
				if res.IsExplicit && res.ResolvedAt != nil {
					deadlinesCorrect++
				}
			}
		}
	}

	urgentRecall := float64(trueUrgentDetected) / float64(totalUrgentTruth)
	urgentPrecision := float64(trueUrgentDetected) / float64(detectedUrgent)
	deadlineAccuracy := float64(deadlinesCorrect) / float64(totalDeadlinesTruth)

	t.Logf("=== SnoozeBox Evaluation Results (%d emails) ===", len(fixtures))
	t.Logf("Urgent Recall:     %.1f%% (%d/%d)", urgentRecall*100, trueUrgentDetected, totalUrgentTruth)
	t.Logf("Urgent Precision:  %.1f%% (%d/%d)", urgentPrecision*100, trueUrgentDetected, detectedUrgent)
	t.Logf("Deadline Exactness: %.1f%% (%d/%d)", deadlineAccuracy*100, deadlinesCorrect, totalDeadlinesTruth)

	if urgentRecall < 0.90 {
		t.Errorf("urgent recall too low: got %.2f, target >= 0.90", urgentRecall)
	}
	if urgentPrecision < 0.70 {
		t.Errorf("urgent precision too low: got %.2f, target >= 0.70", urgentPrecision)
	}
}
