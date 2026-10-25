package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/ai"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/analysis"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/api"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/attention"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/config"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/digest"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/scheduler"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/backend/internal/store"
)

func setupTestServer(t *testing.T) (*api.Server, *store.Store, *config.Config) {
	ctx := context.Background()
	st, err := store.New(ctx, ":memory:")
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	migrationsDir := filepath.Join("..", "..", "migrations")
	if err := st.RunMigrations(ctx, migrationsDir); err != nil {
		t.Fatalf("failed to run migrations: %v", err)
	}

	cfg := &config.Config{
		ServerPort:          "8080",
		DefaultAccountID:    "acc-test-1",
		DefaultAccountEmail: "alex@techcorp.internal",
		FixturesFile:        filepath.Join("..", "..", "testdata", "emails", "fixtures.json"),
		OllamaModel:         "gemma2:2b",
		OllamaURL:           "http://localhost:11434",
	}

	acc := &domain.Account{
		ID:           cfg.DefaultAccountID,
		Provider:     "google",
		EmailAddress: cfg.DefaultAccountEmail,
		Timezone:     "UTC",
		Status:       "connected",
	}
	_ = st.UpsertAccount(ctx, acc)
	_, _ = st.ImportFixtures(ctx, cfg.DefaultAccountID, cfg.FixturesFile)

	analyzer := ai.NewFallbackRuleAnalyzer()
	analysisSvc := analysis.NewService(st, analyzer)
	attentionEng := attention.NewEngine(st)
	digestGen := digest.NewGenerator(st)
	sched := scheduler.NewScheduler(st)

	srv := api.NewServer(cfg, st, analysisSvc, attentionEng, digestGen, sched)
	return srv, st, cfg
}

func TestAPI_Health(t *testing.T) {
	srv, st, _ := setupTestServer(t)
	defer st.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp api.ResponseEnvelope
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if resp.Error != nil {
		t.Fatalf("unexpected error: %+v", resp.Error)
	}
}

func TestAPI_ListAndGetMessages(t *testing.T) {
	srv, st, _ := setupTestServer(t)
	defer st.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages?limit=5", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data struct {
			Messages []*domain.Message `json:"messages"`
			Count    int               `json:"count"`
		} `json:"data"`
		Error *api.APIError `json:"error"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if resp.Data.Count != 5 {
		t.Fatalf("expected 5 messages, got %d", resp.Data.Count)
	}

	// Test getting specific message
	firstID := resp.Data.Messages[0].ID
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/messages/"+firstID, nil)
	w2 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 for message detail, got %d", w2.Code)
	}
}

func TestAPI_AnalyzeAndAttentionEndpoints(t *testing.T) {
	srv, st, _ := setupTestServer(t)
	defer st.Close()

	// 1. Single message analyze (msg-001 is critical OpenSSL patch)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/messages/msg-001/analyze", nil)
	w := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for message analyze, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Batch analyze all & sync attention debt
	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/analyze/all", nil)
	w2 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 for batch analyze, got %d", w2.Code)
	}

	// 3. List tasks (Attention Debt)
	req3 := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	w3 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w3, req3)

	if w3.Code != http.StatusOK {
		t.Fatalf("expected 200 for list tasks, got %d", w3.Code)
	}

	var taskResp struct {
		Data struct {
			Tasks []*domain.Task `json:"tasks"`
			Count int            `json:"count"`
		} `json:"data"`
	}
	if err := json.Unmarshal(w3.Body.Bytes(), &taskResp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if taskResp.Data.Count == 0 {
		t.Fatalf("expected tasks created from action-required emails, found 0")
	}

	firstTask := taskResp.Data.Tasks[0]

	// 4. Update task (user confirmation / status transition)
	completedStatus := domain.TaskStatusCompleted
	updateBody, _ := json.Marshal(map[string]any{
		"status": completedStatus,
	})
	req4 := httptest.NewRequest(http.MethodPatch, "/api/v1/tasks/"+firstTask.ID, bytes.NewReader(updateBody))
	w4 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w4, req4)

	if w4.Code != http.StatusOK {
		t.Fatalf("expected 200 for update task, got %d", w4.Code)
	}

	// 5. Snooze task
	snoozeBody, _ := json.Marshal(map[string]any{
		"until": time.Now().UTC().Add(24 * time.Hour).Format(time.RFC3339),
	})
	req5 := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+firstTask.ID+"/snooze", bytes.NewReader(snoozeBody))
	w5 := httptest.NewRecorder()
	srv.Handler().ServeHTTP(w5, req5)

	if w5.Code != http.StatusOK {
		t.Fatalf("expected 200 for snooze task, got %d", w5.Code)
	}
}

func TestAPI_DigestAndSettingsEndpoints(t *testing.T) {
	srv, st, _ := setupTestServer(t)
	defer st.Close()

	// 1. Analyze messages first so digest has data
	reqInit := httptest.NewRequest(http.MethodPost, "/api/v1/analyze/all", nil)
	wInit := httptest.NewRecorder()
	srv.Handler().ServeHTTP(wInit, reqInit)

	// 2. GET /api/v1/digest
	reqDigest := httptest.NewRequest(http.MethodGet, "/api/v1/digest?date=2026-10-22", nil)
	wDigest := httptest.NewRecorder()
	srv.Handler().ServeHTTP(wDigest, reqDigest)

	if wDigest.Code != http.StatusOK {
		t.Fatalf("expected 200 for digest, got %d", wDigest.Code)
	}

	var digestResp struct {
		Data *domain.Digest `json:"data"`
	}
	if err := json.Unmarshal(wDigest.Body.Bytes(), &digestResp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if digestResp.Data == nil || digestResp.Data.Headline == "" {
		t.Fatalf("expected non-empty digest headline")
	}

	// 3. GET /api/v1/settings
	reqSettings := httptest.NewRequest(http.MethodGet, "/api/v1/settings", nil)
	wSettings := httptest.NewRecorder()
	srv.Handler().ServeHTTP(wSettings, reqSettings)

	if wSettings.Code != http.StatusOK {
		t.Fatalf("expected 200 for settings, got %d", wSettings.Code)
	}

	// 4. PUT /api/v1/settings
	newStart := "23:00"
	newEnd := "07:30"
	updateSettings, _ := json.Marshal(map[string]any{
		"quiet_hours_start": newStart,
		"quiet_hours_end":   newEnd,
		"vip_senders":       []string{"ciso@techcorp.internal", "sarah@techcorp.internal"},
	})
	reqPut := httptest.NewRequest(http.MethodPut, "/api/v1/settings", bytes.NewReader(updateSettings))
	wPut := httptest.NewRecorder()
	srv.Handler().ServeHTTP(wPut, reqPut)

	if wPut.Code != http.StatusOK {
		t.Fatalf("expected 200 for update settings, got %d", wPut.Code)
	}

	// 5. GET /api/v1/notifications
	reqNotifs := httptest.NewRequest(http.MethodGet, "/api/v1/notifications", nil)
	wNotifs := httptest.NewRecorder()
	srv.Handler().ServeHTTP(wNotifs, reqNotifs)

	if wNotifs.Code != http.StatusOK {
		t.Fatalf("expected 200 for notifications, got %d", wNotifs.Code)
	}
}
