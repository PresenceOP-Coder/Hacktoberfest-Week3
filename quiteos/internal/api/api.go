package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/analysis"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/attention"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/config"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/digest"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/domain"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/scheduler"
	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/store"
	"github.com/google/uuid"
)

type Server struct {
	cfg          *config.Config
	store        *store.Store
	analysisSvc  *analysis.Service
	attentionEng *attention.Engine
	digestGen    *digest.Generator
	scheduler    *scheduler.Scheduler
	mux          *http.ServeMux
}

type ResponseEnvelope struct {
	Data      any       `json:"data"`
	Error     *APIError `json:"error"`
	RequestID string    `json:"request_id"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func NewServer(
	cfg *config.Config,
	s *store.Store,
	analysisSvc *analysis.Service,
	attentionEng *attention.Engine,
	digestGen *digest.Generator,
	sched *scheduler.Scheduler,
) *Server {
	srv := &Server{
		cfg:          cfg,
		store:        s,
		analysisSvc:  analysisSvc,
		attentionEng: attentionEng,
		digestGen:    digestGen,
		scheduler:    sched,
		mux:          http.NewServeMux(),
	}
	srv.registerRoutes()
	return srv
}

func (s *Server) Handler() http.Handler {
	return s.corsMiddleware(s.mux)
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		// Allow local development frontends (Vite, Next, localhost)
		if origin != "" && (strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:")) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) respond(w http.ResponseWriter, status int, data any, apiErr *APIError) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ResponseEnvelope{
		Data:      data,
		Error:     apiErr,
		RequestID: uuid.NewString(),
	})
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("GET /api/v1/health", s.handleHealth)
	s.mux.HandleFunc("GET /api/v1/runtime", s.handleRuntime)
	s.mux.HandleFunc("GET /api/v1/account", s.handleGetAccount)
	s.mux.HandleFunc("GET /api/v1/messages", s.handleListMessages)
	s.mux.HandleFunc("GET /api/v1/messages/{id}", s.handleGetMessage)
	s.mux.HandleFunc("POST /api/v1/messages/{id}/analyze", s.handleAnalyzeMessage)
	s.mux.HandleFunc("POST /api/v1/analyze/all", s.handleAnalyzeAll)
	s.mux.HandleFunc("POST /api/v1/fixtures/import", s.handleImportFixtures)

	// Task and Attention Debt routes
	s.mux.HandleFunc("GET /api/v1/tasks", s.handleListTasks)
	s.mux.HandleFunc("GET /api/v1/tasks/{id}", s.handleGetTask)
	s.mux.HandleFunc("POST /api/v1/tasks", s.handleCreateTask)
	s.mux.HandleFunc("PATCH /api/v1/tasks/{id}", s.handleUpdateTask)
	s.mux.HandleFunc("POST /api/v1/tasks/{id}/snooze", s.handleSnoozeTask)
	s.mux.HandleFunc("POST /api/v1/attention/sync", s.handleSyncAttentionDebt)

	// Digest and Notification routes
	s.mux.HandleFunc("GET /api/v1/digest", s.handleGetDigest)
	s.mux.HandleFunc("POST /api/v1/digest/generate", s.handleGenerateDigest)
	s.mux.HandleFunc("GET /api/v1/notifications", s.handleListNotifications)
	s.mux.HandleFunc("GET /api/v1/settings", s.handleGetSettings)
	s.mux.HandleFunc("PUT /api/v1/settings", s.handleUpdateSettings)

	// Static frontend serving if dist directory exists
	for _, dir := range []string{"../frontend/dist", "frontend/dist", "./dist"} {
		if stat, err := os.Stat(dir); err == nil && stat.IsDir() {
			fs := http.FileServer(http.Dir(dir))
			s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
				if strings.HasPrefix(r.URL.Path, "/api/") {
					http.NotFound(w, r)
					return
				}
				fs.ServeHTTP(w, r)
			})
			break
		}
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := s.store.DB().PingContext(ctx); err != nil {
		s.respond(w, http.StatusServiceUnavailable, nil, &APIError{
			Code:    "DATABASE_UNAVAILABLE",
			Message: "SQLite database ping failed",
		})
		return
	}

	s.respond(w, http.StatusOK, map[string]any{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"version":   "1.0.0",
	}, nil)
}

func (s *Server) handleRuntime(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acc, _ := s.store.GetDefaultAccount(ctx)
	msgs, _ := s.store.ListMessages(ctx, s.cfg.DefaultAccountID, 1, 0)
	tasks, _ := s.store.ListTasks(ctx, s.cfg.DefaultAccountID, "")

	s.respond(w, http.StatusOK, map[string]any{
		"model_configured": s.cfg.OllamaModel,
		"ollama_url":       s.cfg.OllamaURL,
		"account_id":       s.cfg.DefaultAccountID,
		"account_status": func() string {
			if acc != nil {
				return acc.Status
			}
			return "uninitialized"
		}(),
		"has_messages": len(msgs) > 0,
		"tasks_count":  len(tasks),
		"timestamp":    time.Now().UTC().Format(time.RFC3339),
	}, nil)
}

func (s *Server) handleGetAccount(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	acc, err := s.store.GetAccount(ctx, s.cfg.DefaultAccountID)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}
	if acc == nil {
		s.respond(w, http.StatusNotFound, nil, &APIError{
			Code:    "ACCOUNT_NOT_FOUND",
			Message: "Default account not initialized",
		})
		return
	}

	prefs, _ := s.store.GetPreferences(ctx, acc.ID)

	s.respond(w, http.StatusOK, map[string]any{
		"account":     acc,
		"preferences": prefs,
	}, nil)
}

func (s *Server) handleListMessages(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 30
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	offset := 0
	if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
		offset = o
	}

	msgs, err := s.store.ListMessages(ctx, s.cfg.DefaultAccountID, limit, offset)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}
	if msgs == nil {
		msgs = []*domain.Message{}
	}

	s.respond(w, http.StatusOK, map[string]any{
		"messages": msgs,
		"limit":    limit,
		"offset":   offset,
		"count":    len(msgs),
	}, nil)
}

func (s *Server) handleGetMessage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_ID",
			Message: "Message ID is required",
		})
		return
	}

	msg, err := s.store.GetMessage(ctx, id)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}
	if msg == nil {
		s.respond(w, http.StatusNotFound, nil, &APIError{
			Code:    "MESSAGE_NOT_FOUND",
			Message: "Message not found",
		})
		return
	}

	s.respond(w, http.StatusOK, msg, nil)
}

func (s *Server) handleAnalyzeMessage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_ID",
			Message: "Message ID is required",
		})
		return
	}

	if s.analysisSvc == nil {
		s.respond(w, http.StatusServiceUnavailable, nil, &APIError{
			Code:    "ANALYSIS_UNAVAILABLE",
			Message: "Analysis service is not configured",
		})
		return
	}

	msg, err := s.store.GetMessage(ctx, id)
	if err != nil || msg == nil {
		s.respond(w, http.StatusNotFound, nil, &APIError{
			Code:    "MESSAGE_NOT_FOUND",
			Message: "Message not found",
		})
		return
	}

	acc, _ := s.store.GetAccount(ctx, msg.AccountID)
	tz := "UTC"
	if acc != nil && acc.Timezone != "" {
		tz = acc.Timezone
	}

	analysisResult, err := s.analysisSvc.ProcessMessage(ctx, msg, tz)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "ANALYSIS_FAILED",
			Message: err.Error(),
		})
		return
	}

	// Update attention debt if engine is configured
	if s.attentionEng != nil {
		_, _ = s.attentionEng.ProcessMessageAnalysis(ctx, msg, analysisResult)
	}

	s.respond(w, http.StatusOK, analysisResult, nil)
}

func (s *Server) handleAnalyzeAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if s.analysisSvc == nil {
		s.respond(w, http.StatusServiceUnavailable, nil, &APIError{
			Code:    "ANALYSIS_UNAVAILABLE",
			Message: "Analysis service is not configured",
		})
		return
	}

	acc, _ := s.store.GetAccount(ctx, s.cfg.DefaultAccountID)
	tz := "UTC"
	if acc != nil && acc.Timezone != "" {
		tz = acc.Timezone
	}

	count, err := s.analysisSvc.AnalyzeAllMessages(ctx, s.cfg.DefaultAccountID, tz)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "BATCH_ANALYSIS_FAILED",
			Message: err.Error(),
		})
		return
	}

	if s.attentionEng != nil {
		_, _ = s.attentionEng.SyncAttentionDebt(ctx, s.cfg.DefaultAccountID)
	}

	s.respond(w, http.StatusOK, map[string]any{
		"processed_count": count,
		"account_id":      s.cfg.DefaultAccountID,
	}, nil)
}

func (s *Server) handleImportFixtures(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	count, err := s.store.ImportFixtures(ctx, s.cfg.DefaultAccountID, s.cfg.FixturesFile)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "IMPORT_FAILED",
			Message: err.Error(),
		})
		return
	}

	s.respond(w, http.StatusOK, map[string]any{
		"imported_count": count,
		"account_id":     s.cfg.DefaultAccountID,
		"source":         s.cfg.FixturesFile,
	}, nil)
}

// ---------------- Task / Attention Debt Handlers ----------------

func (s *Server) handleListTasks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	status := r.URL.Query().Get("status")

	tasks, err := s.store.ListTasks(ctx, s.cfg.DefaultAccountID, status)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}
	if tasks == nil {
		tasks = []*domain.Task{}
	}

	s.respond(w, http.StatusOK, map[string]any{
		"tasks": tasks,
		"count": len(tasks),
	}, nil)
}

func (s *Server) handleGetTask(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_ID",
			Message: "Task ID is required",
		})
		return
	}

	task, err := s.store.GetTask(ctx, id)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}
	if task == nil {
		s.respond(w, http.StatusNotFound, nil, &APIError{
			Code:    "TASK_NOT_FOUND",
			Message: "Task not found",
		})
		return
	}

	s.respond(w, http.StatusOK, task, nil)
}

type CreateTaskPayload struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	DueAt       string `json:"due_at"`
}

func (s *Server) handleCreateTask(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var payload CreateTaskPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_JSON",
			Message: "Invalid request payload",
		})
		return
	}

	if payload.Title == "" {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "VALIDATION_ERROR",
			Message: "Title is required",
		})
		return
	}

	priority := domain.Priority(payload.Priority)
	if priority == "" {
		priority = domain.PriorityNormal
	}

	var dueAt *time.Time
	if payload.DueAt != "" {
		t, err := time.Parse(time.RFC3339, payload.DueAt)
		if err == nil {
			dueAt = &t
		}
	}

	task := &domain.Task{
		ID:               uuid.NewString(),
		AccountID:        s.cfg.DefaultAccountID,
		Title:            payload.Title,
		Description:      payload.Description,
		Status:           domain.TaskStatusConfirmed,
		Priority:         priority,
		DueAt:            dueAt,
		DueDatePrecision: "datetime",
		OwnerState:       "user_action",
	}

	if err := s.store.SaveTask(ctx, task); err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}

	s.respond(w, http.StatusCreated, task, nil)
}

type UpdateTaskPayload struct {
	Title       *string            `json:"title"`
	Description *string            `json:"description"`
	Status      *domain.TaskStatus `json:"status"`
	Priority    *domain.Priority   `json:"priority"`
	DueAt       *string            `json:"due_at"`
	OwnerState  *string            `json:"owner_state"`
}

func (s *Server) handleUpdateTask(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_ID",
			Message: "Task ID is required",
		})
		return
	}

	task, err := s.store.GetTask(ctx, id)
	if err != nil || task == nil {
		s.respond(w, http.StatusNotFound, nil, &APIError{
			Code:    "TASK_NOT_FOUND",
			Message: "Task not found",
		})
		return
	}

	var payload UpdateTaskPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_JSON",
			Message: "Invalid JSON body",
		})
		return
	}

	if payload.Title != nil && *payload.Title != "" {
		task.Title = *payload.Title
	}
	if payload.Description != nil {
		task.Description = *payload.Description
	}
	if payload.Priority != nil {
		task.Priority = *payload.Priority
	}
	if payload.OwnerState != nil {
		task.OwnerState = *payload.OwnerState
	}
	if payload.DueAt != nil {
		if *payload.DueAt == "" {
			task.DueAt = nil
		} else if t, err := time.Parse(time.RFC3339, *payload.DueAt); err == nil {
			task.DueAt = &t
		}
	}

	if payload.Status != nil {
		task.Status = *payload.Status
		if *payload.Status == domain.TaskStatusCompleted {
			now := time.Now().UTC()
			task.CompletedAt = &now
		} else {
			task.CompletedAt = nil
		}
	}

	if err := s.store.SaveTask(ctx, task); err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}

	s.respond(w, http.StatusOK, task, nil)
}

type SnoozePayload struct {
	Until string `json:"until"` // RFC3339 timestamp
}

func (s *Server) handleSnoozeTask(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_ID",
			Message: "Task ID is required",
		})
		return
	}

	task, err := s.store.GetTask(ctx, id)
	if err != nil || task == nil {
		s.respond(w, http.StatusNotFound, nil, &APIError{
			Code:    "TASK_NOT_FOUND",
			Message: "Task not found",
		})
		return
	}

	var payload SnoozePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_JSON",
			Message: "Invalid JSON body",
		})
		return
	}

	parsed, err := time.Parse(time.RFC3339, payload.Until)
	if err != nil {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_TIMESTAMP",
			Message: "Timestamp must be RFC3339",
		})
		return
	}

	task.SnoozedUntil = &parsed
	if err := s.store.SaveTask(ctx, task); err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}

	s.respond(w, http.StatusOK, task, nil)
}

func (s *Server) handleSyncAttentionDebt(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	if s.attentionEng == nil {
		s.respond(w, http.StatusServiceUnavailable, nil, &APIError{
			Code:    "ATTENTION_ENGINE_UNAVAILABLE",
			Message: "Attention Engine is not configured",
		})
		return
	}

	count, err := s.attentionEng.SyncAttentionDebt(ctx, s.cfg.DefaultAccountID)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "SYNC_FAILED",
			Message: err.Error(),
		})
		return
	}

	tasks, _ := s.store.ListTasks(ctx, s.cfg.DefaultAccountID, "")

	s.respond(w, http.StatusOK, map[string]any{
		"synced_count": count,
		"total_tasks":  len(tasks),
		"account_id":   s.cfg.DefaultAccountID,
	}, nil)
}

// ---------------- Digest and Notification Handlers ----------------

func (s *Server) handleGetDigest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	date := r.URL.Query().Get("date")

	if s.digestGen == nil {
		s.respond(w, http.StatusServiceUnavailable, nil, &APIError{
			Code:    "DIGEST_UNAVAILABLE",
			Message: "Digest generator is not configured",
		})
		return
	}

	d, err := s.digestGen.GenerateDailyDigest(ctx, s.cfg.DefaultAccountID, date)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "DIGEST_ERROR",
			Message: err.Error(),
		})
		return
	}

	s.respond(w, http.StatusOK, d, nil)
}

func (s *Server) handleGenerateDigest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	d, err := s.digestGen.GenerateDailyDigest(ctx, s.cfg.DefaultAccountID, "")
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "DIGEST_ERROR",
			Message: err.Error(),
		})
		return
	}
	s.respond(w, http.StatusOK, d, nil)
}

func (s *Server) handleListNotifications(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	notifs, err := s.store.ListNotifications(ctx, s.cfg.DefaultAccountID, 30)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}
	if notifs == nil {
		notifs = []*domain.Notification{}
	}

	s.respond(w, http.StatusOK, map[string]any{
		"notifications": notifs,
		"count":         len(notifs),
	}, nil)
}

func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	prefs, err := s.store.GetPreferences(ctx, s.cfg.DefaultAccountID)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}
	s.respond(w, http.StatusOK, prefs, nil)
}

type UpdateSettingsPayload struct {
	QuietHoursStart *string   `json:"quiet_hours_start"`
	QuietHoursEnd   *string   `json:"quiet_hours_end"`
	DailyDigestTime *string   `json:"daily_digest_time"`
	UrgentThreshold *string   `json:"urgent_threshold"`
	VIPSenders      *[]string `json:"vip_senders"`
}

func (s *Server) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	prefs, err := s.store.GetPreferences(ctx, s.cfg.DefaultAccountID)
	if err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}

	var payload UpdateSettingsPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.respond(w, http.StatusBadRequest, nil, &APIError{
			Code:    "INVALID_JSON",
			Message: "Invalid JSON body",
		})
		return
	}

	if payload.QuietHoursStart != nil {
		prefs.QuietHoursStart = *payload.QuietHoursStart
	}
	if payload.QuietHoursEnd != nil {
		prefs.QuietHoursEnd = *payload.QuietHoursEnd
	}
	if payload.DailyDigestTime != nil {
		prefs.DailyDigestTime = *payload.DailyDigestTime
	}
	if payload.UrgentThreshold != nil {
		prefs.UrgentThreshold = *payload.UrgentThreshold
	}
	if payload.VIPSenders != nil {
		prefs.VIPSenders = *payload.VIPSenders
	}

	if err := s.store.SavePreferences(ctx, prefs); err != nil {
		s.respond(w, http.StatusInternalServerError, nil, &APIError{
			Code:    "STORE_ERROR",
			Message: err.Error(),
		})
		return
	}

	s.respond(w, http.StatusOK, prefs, nil)
}
