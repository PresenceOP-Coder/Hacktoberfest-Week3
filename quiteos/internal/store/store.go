package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/PresenceOP-Coder/Hacktoberfest-Week3/quiteos/internal/domain"
	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
	mu sync.RWMutex
}

func New(ctx context.Context, dsn string) (*Store, error) {
	// Ensure directory exists if dsn is a file path
	if dsn != ":memory:" && !strings.HasPrefix(dsn, "file:") {
		dir := filepath.Dir(dsn)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("creating db dir: %w", err)
		}
	}

	// SQLite connection string tuning for local-first single-process reliability
	connStr := dsn
	if !strings.Contains(connStr, "?") {
		connStr += "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)"
	}

	db, err := sql.Open("sqlite", connStr)
	if err != nil {
		return nil, fmt.Errorf("opening sqlite: %w", err)
	}

	db.SetMaxOpenConns(1) // Avoid lock contention on SQLite local file
	db.SetMaxIdleConns(1)

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("pinging sqlite: %w", err)
	}

	s := &Store{db: db}
	return s, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) DB() *sql.DB {
	return s.db
}

// RunMigrations applies SQL migrations in the given directory in alphabetical order
func (s *Store) RunMigrations(ctx context.Context, migrationsDir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		);
	`)
	if err != nil {
		return fmt.Errorf("creating migrations table: %w", err)
	}

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("reading migrations dir: %w", err)
	}

	var sqlFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") {
			sqlFiles = append(sqlFiles, f.Name())
		}
	}
	sort.Strings(sqlFiles)

	for _, name := range sqlFiles {
		var exists int
		err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM schema_migrations WHERE version = ?", name).Scan(&exists)
		if err != nil {
			return fmt.Errorf("checking migration %s: %w", name, err)
		}
		if exists > 0 {
			continue
		}

		filePath := filepath.Join(migrationsDir, name)
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("reading migration file %s: %w", name, err)
		}

		tx, err := s.db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("starting tx for migration %s: %w", name, err)
		}

		if _, err := tx.ExecContext(ctx, string(content)); err != nil {
			tx.Rollback()
			return fmt.Errorf("executing migration %s: %w", name, err)
		}

		if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", name, time.Now().UTC().Format(time.RFC3339)); err != nil {
			tx.Rollback()
			return fmt.Errorf("recording migration %s: %w", name, err)
		}

		if err := tx.Commit(); err != nil {
			return fmt.Errorf("committing migration %s: %w", name, err)
		}
	}

	return nil
}

// ---------------- Connected Accounts ----------------

func (s *Store) UpsertAccount(ctx context.Context, acc *domain.Account) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if acc.CreatedAt.IsZero() {
		acc.CreatedAt = time.Now().UTC()
	}
	acc.UpdatedAt = time.Now().UTC()

	query := `
		INSERT INTO connected_accounts (id, provider, provider_subject, email_address, timezone, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			provider_subject = excluded.provider_subject,
			email_address = excluded.email_address,
			timezone = excluded.timezone,
			status = excluded.status,
			updated_at = excluded.updated_at
	`
	_, err := s.db.ExecContext(ctx, query,
		acc.ID, acc.Provider, acc.ProviderSubject, acc.EmailAddress,
		acc.Timezone, acc.Status, acc.CreatedAt.Format(time.RFC3339), now,
	)
	return err
}

func (s *Store) GetAccount(ctx context.Context, id string) (*domain.Account, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, provider, provider_subject, email_address, timezone, status, created_at, updated_at
		FROM connected_accounts WHERE id = ?
	`, id)

	var acc domain.Account
	var ps sql.NullString
	var ca, ua string
	err := row.Scan(&acc.ID, &acc.Provider, &ps, &acc.EmailAddress, &acc.Timezone, &acc.Status, &ca, &ua)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if ps.Valid {
		acc.ProviderSubject = ps.String
	}
	acc.CreatedAt, _ = time.Parse(time.RFC3339, ca)
	acc.UpdatedAt, _ = time.Parse(time.RFC3339, ua)
	return &acc, nil
}

func (s *Store) GetDefaultAccount(ctx context.Context) (*domain.Account, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, provider, provider_subject, email_address, timezone, status, created_at, updated_at
		FROM connected_accounts ORDER BY created_at ASC LIMIT 1
	`)

	var acc domain.Account
	var ps sql.NullString
	var ca, ua string
	err := row.Scan(&acc.ID, &acc.Provider, &ps, &acc.EmailAddress, &acc.Timezone, &acc.Status, &ca, &ua)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if ps.Valid {
		acc.ProviderSubject = ps.String
	}
	acc.CreatedAt, _ = time.Parse(time.RFC3339, ca)
	acc.UpdatedAt, _ = time.Parse(time.RFC3339, ua)
	return &acc, nil
}

// ---------------- Messages ----------------

func (s *Store) SaveMessage(ctx context.Context, msg *domain.Message) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if msg.CreatedAt.IsZero() {
		msg.CreatedAt = time.Now().UTC()
	}
	msg.UpdatedAt = time.Now().UTC()

	toJson := func(v any) string {
		b, _ := json.Marshal(v)
		return string(b)
	}

	query := `
		INSERT INTO messages (
			id, account_id, gmail_id, thread_id, from_address,
			to_addresses_json, cc_addresses_json, subject, received_at,
			snippet, body_text, body_hash, gmail_labels_json, sync_status,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(account_id, gmail_id) DO UPDATE SET
			thread_id = excluded.thread_id,
			from_address = excluded.from_address,
			to_addresses_json = excluded.to_addresses_json,
			cc_addresses_json = excluded.cc_addresses_json,
			subject = excluded.subject,
			received_at = excluded.received_at,
			snippet = excluded.snippet,
			body_text = excluded.body_text,
			body_hash = excluded.body_hash,
			gmail_labels_json = excluded.gmail_labels_json,
			sync_status = excluded.sync_status,
			updated_at = excluded.updated_at
	`
	_, err := s.db.ExecContext(ctx, query,
		msg.ID, msg.AccountID, msg.GmailID, msg.ThreadID, msg.FromAddress,
		toJson(msg.ToAddresses), toJson(msg.CcAddresses), msg.Subject,
		msg.ReceivedAt.UTC().Format(time.RFC3339), msg.Snippet, msg.BodyText, msg.BodyHash,
		toJson(msg.GmailLabels), msg.SyncStatus,
		msg.CreatedAt.Format(time.RFC3339), now,
	)
	return err
}

func (s *Store) ListMessages(ctx context.Context, accountID string, limit int, offset int) ([]*domain.Message, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT m.id, m.account_id, m.gmail_id, m.thread_id, m.from_address,
		       m.to_addresses_json, m.cc_addresses_json, m.subject, m.received_at,
		       m.snippet, m.body_text, m.body_hash, m.gmail_labels_json, m.sync_status,
		       m.created_at, m.updated_at,
		       a.id, a.model_name, a.status, a.category, a.priority, a.action_text,
		       a.deadline_text, a.deadline_candidate_at, a.evidence_text
		FROM messages m
		LEFT JOIN analyses a ON m.id = a.message_id AND a.is_current = 1
		WHERE m.account_id = ?
		ORDER BY m.received_at DESC
		LIMIT ? OFFSET ?
	`
	rows, err := s.db.QueryContext(ctx, query, accountID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*domain.Message
	for rows.Next() {
		var m domain.Message
		var toJ, ccJ, labelsJ, recAt, crAt, upAt string
		var bodyText, bodyHash sql.NullString

		var anID, anModel, anStatus, anCat, anPri, anAction, anDlText, anDlCand, anEvidence sql.NullString

		err := rows.Scan(
			&m.ID, &m.AccountID, &m.GmailID, &m.ThreadID, &m.FromAddress,
			&toJ, &ccJ, &m.Subject, &recAt,
			&m.Snippet, &bodyText, &bodyHash, &labelsJ, &m.SyncStatus,
			&crAt, &upAt,
			&anID, &anModel, &anStatus, &anCat, &anPri, &anAction, &anDlText, &anDlCand, &anEvidence,
		)
		if err != nil {
			return nil, err
		}

		_ = json.Unmarshal([]byte(toJ), &m.ToAddresses)
		_ = json.Unmarshal([]byte(ccJ), &m.CcAddresses)
		_ = json.Unmarshal([]byte(labelsJ), &m.GmailLabels)
		m.ReceivedAt, _ = time.Parse(time.RFC3339, recAt)
		m.CreatedAt, _ = time.Parse(time.RFC3339, crAt)
		m.UpdatedAt, _ = time.Parse(time.RFC3339, upAt)
		if bodyText.Valid {
			m.BodyText = bodyText.String
		}
		if bodyHash.Valid {
			m.BodyHash = bodyHash.String
		}

		if anID.Valid {
			an := &domain.Analysis{
				ID:           anID.String,
				MessageID:    m.ID,
				ModelName:    anModel.String,
				Status:       anStatus.String,
				Category:     domain.Category(anCat.String),
				Priority:     domain.Priority(anPri.String),
				ActionText:   anAction.String,
				DeadlineText: anDlText.String,
				EvidenceText: anEvidence.String,
			}
			if anDlCand.Valid && anDlCand.String != "" {
				t, err := time.Parse(time.RFC3339, anDlCand.String)
				if err == nil {
					an.DeadlineCandidateAt = &t
				}
			}
			m.Analysis = an
		}

		messages = append(messages, &m)
	}

	return messages, nil
}

func (s *Store) GetMessage(ctx context.Context, id string) (*domain.Message, error) {
	query := `
		SELECT m.id, m.account_id, m.gmail_id, m.thread_id, m.from_address,
		       m.to_addresses_json, m.cc_addresses_json, m.subject, m.received_at,
		       m.snippet, m.body_text, m.body_hash, m.gmail_labels_json, m.sync_status,
		       m.created_at, m.updated_at,
		       a.id, a.model_name, a.prompt_version, a.schema_version, a.status,
		       a.category, a.priority, a.action_text, a.deadline_text, a.deadline_candidate_at,
		       a.deadline_timezone, a.evidence_text, a.validation_errors_json, a.raw_model_output
		FROM messages m
		LEFT JOIN analyses a ON m.id = a.message_id AND a.is_current = 1
		WHERE m.id = ?
	`
	row := s.db.QueryRowContext(ctx, query, id)

	var m domain.Message
	var toJ, ccJ, labelsJ, recAt, crAt, upAt string
	var bodyText, bodyHash sql.NullString
	var anID, anModel, anPromptV, anSchemaV, anStatus, anCat, anPri, anAction, anDlText, anDlCand, anDlTz, anEvidence, anValErrors, anRaw sql.NullString

	err := row.Scan(
		&m.ID, &m.AccountID, &m.GmailID, &m.ThreadID, &m.FromAddress,
		&toJ, &ccJ, &m.Subject, &recAt,
		&m.Snippet, &bodyText, &bodyHash, &labelsJ, &m.SyncStatus,
		&crAt, &upAt,
		&anID, &anModel, &anPromptV, &anSchemaV, &anStatus,
		&anCat, &anPri, &anAction, &anDlText, &anDlCand, &anDlTz, &anEvidence, &anValErrors, &anRaw,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	_ = json.Unmarshal([]byte(toJ), &m.ToAddresses)
	_ = json.Unmarshal([]byte(ccJ), &m.CcAddresses)
	_ = json.Unmarshal([]byte(labelsJ), &m.GmailLabels)
	m.ReceivedAt, _ = time.Parse(time.RFC3339, recAt)
	m.CreatedAt, _ = time.Parse(time.RFC3339, crAt)
	m.UpdatedAt, _ = time.Parse(time.RFC3339, upAt)
	if bodyText.Valid {
		m.BodyText = bodyText.String
	}
	if bodyHash.Valid {
		m.BodyHash = bodyHash.String
	}

	if anID.Valid {
		an := &domain.Analysis{
			ID:               anID.String,
			MessageID:        m.ID,
			ModelName:        anModel.String,
			PromptVersion:    anPromptV.String,
			SchemaVersion:    anSchemaV.String,
			Status:           anStatus.String,
			Category:         domain.Category(anCat.String),
			Priority:         domain.Priority(anPri.String),
			ActionText:       anAction.String,
			DeadlineText:     anDlText.String,
			DeadlineTimezone: anDlTz.String,
			EvidenceText:     anEvidence.String,
			RawModelOutput:   anRaw.String,
			IsCurrent:        true,
		}
		if anDlCand.Valid && anDlCand.String != "" {
			t, err := time.Parse(time.RFC3339, anDlCand.String)
			if err == nil {
				an.DeadlineCandidateAt = &t
			}
		}
		if anValErrors.Valid && anValErrors.String != "" {
			_ = json.Unmarshal([]byte(anValErrors.String), &an.ValidationErrors)
		}
		m.Analysis = an
	}

	return &m, nil
}

// ---------------- Analyses ----------------

func (s *Store) SaveAnalysis(ctx context.Context, a *domain.Analysis) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Demote older current analyses for this message
	_, err = tx.ExecContext(ctx, "UPDATE analyses SET is_current = 0 WHERE message_id = ?", a.MessageID)
	if err != nil {
		return fmt.Errorf("demoting old analyses: %w", err)
	}

	toJson := func(v any) string {
		b, _ := json.Marshal(v)
		return string(b)
	}

	var dlCandStr sql.NullString
	if a.DeadlineCandidateAt != nil {
		dlCandStr = sql.NullString{String: a.DeadlineCandidateAt.UTC().Format(time.RFC3339), Valid: true}
	}

	now := time.Now().UTC().Format(time.RFC3339)
	if a.CreatedAt.IsZero() {
		a.CreatedAt = time.Now().UTC()
	}

	query := `
		INSERT INTO analyses (
			id, message_id, model_name, model_digest, prompt_version,
			schema_version, status, category, priority, action_text,
			deadline_text, deadline_candidate_at, deadline_timezone,
			evidence_text, validation_errors_json, raw_model_output,
			is_current, processed_at, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
	`
	_, err = tx.ExecContext(ctx, query,
		a.ID, a.MessageID, a.ModelName, a.ModelDigest, a.PromptVersion,
		a.SchemaVersion, a.Status, string(a.Category), string(a.Priority), a.ActionText,
		a.DeadlineText, dlCandStr, a.DeadlineTimezone,
		a.EvidenceText, toJson(a.ValidationErrors), a.RawModelOutput,
		now, a.CreatedAt.Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("inserting analysis: %w", err)
	}

	return tx.Commit()
}

// ---------------- Tasks & Attention Debt ----------------

func (s *Store) SaveTask(ctx context.Context, t *domain.Task) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if t.CreatedAt.IsZero() {
		t.CreatedAt = time.Now().UTC()
	}
	t.UpdatedAt = time.Now().UTC()

	var dueStr, compStr, snoozeStr sql.NullString
	if t.DueAt != nil {
		dueStr = sql.NullString{String: t.DueAt.UTC().Format(time.RFC3339), Valid: true}
	}
	if t.CompletedAt != nil {
		compStr = sql.NullString{String: t.CompletedAt.UTC().Format(time.RFC3339), Valid: true}
	}
	if t.SnoozedUntil != nil {
		snoozeStr = sql.NullString{String: t.SnoozedUntil.UTC().Format(time.RFC3339), Valid: true}
	}

	query := `
		INSERT INTO tasks (
			id, account_id, title, description, status, priority,
			due_at, due_date_precision, due_timezone, owner_state,
			completed_at, snoozed_until, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			title = excluded.title,
			description = excluded.description,
			status = excluded.status,
			priority = excluded.priority,
			due_at = excluded.due_at,
			due_date_precision = excluded.due_date_precision,
			due_timezone = excluded.due_timezone,
			owner_state = excluded.owner_state,
			completed_at = excluded.completed_at,
			snoozed_until = excluded.snoozed_until,
			updated_at = excluded.updated_at
	`
	_, err := s.db.ExecContext(ctx, query,
		t.ID, t.AccountID, t.Title, t.Description, string(t.Status), string(t.Priority),
		dueStr, t.DueDatePrecision, t.DueTimezone, t.OwnerState,
		compStr, snoozeStr, t.CreatedAt.Format(time.RFC3339), now,
	)
	return err
}

func (s *Store) LinkTaskMessage(ctx context.Context, taskID, messageID, relationship, linkMethod string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	query := `
		INSERT INTO task_messages (task_id, message_id, relationship, link_method, created_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(task_id, message_id) DO UPDATE SET
			relationship = excluded.relationship,
			link_method = excluded.link_method
	`
	_, err := s.db.ExecContext(ctx, query, taskID, messageID, relationship, linkMethod, now)
	return err
}

func (s *Store) FindTaskByThreadID(ctx context.Context, threadID string) (*domain.Task, error) {
	query := `
		SELECT t.id, t.account_id, t.title, t.description, t.status, t.priority,
		       t.due_at, t.due_date_precision, t.due_timezone, t.owner_state,
		       t.completed_at, t.snoozed_until, t.created_at, t.updated_at
		FROM tasks t
		JOIN task_messages tm ON t.id = tm.task_id
		JOIN messages m ON tm.message_id = m.id
		WHERE m.thread_id = ?
		LIMIT 1
	`
	row := s.db.QueryRowContext(ctx, query, threadID)
	return s.scanTask(row)
}

func (s *Store) ListTasks(ctx context.Context, accountID string, status string) ([]*domain.Task, error) {
	query := `
		SELECT t.id, t.account_id, t.title, t.description, t.status, t.priority,
		       t.due_at, t.due_date_precision, t.due_timezone, t.owner_state,
		       t.completed_at, t.snoozed_until, t.created_at, t.updated_at
		FROM tasks t
		WHERE t.account_id = ?
	`
	var args []any
	args = append(args, accountID)

	if status != "" {
		query += " AND t.status = ?"
		args = append(args, status)
	}

	query += " ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, t.due_at ASC"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*domain.Task
	for rows.Next() {
		t, err := s.scanTaskRow(rows)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}

	// Fetch linked messages for each task
	for _, t := range tasks {
		links, err := s.GetTaskLinkedMessages(ctx, t.ID)
		if err == nil {
			t.LinkedMessages = links
		}
	}

	return tasks, nil
}

func (s *Store) GetTask(ctx context.Context, id string) (*domain.Task, error) {
	query := `
		SELECT t.id, t.account_id, t.title, t.description, t.status, t.priority,
		       t.due_at, t.due_date_precision, t.due_timezone, t.owner_state,
		       t.completed_at, t.snoozed_until, t.created_at, t.updated_at
		FROM tasks t
		WHERE t.id = ?
	`
	row := s.db.QueryRowContext(ctx, query, id)
	t, err := s.scanTask(row)
	if err != nil || t == nil {
		return t, err
	}

	links, err := s.GetTaskLinkedMessages(ctx, t.ID)
	if err == nil {
		t.LinkedMessages = links
	}
	return t, nil
}

func (s *Store) GetTaskLinkedMessages(ctx context.Context, taskID string) ([]domain.TaskMessageInfo, error) {
	query := `
		SELECT m.id, m.gmail_id, m.thread_id, m.from_address, m.subject, m.received_at,
		       tm.relationship, tm.link_method
		FROM task_messages tm
		JOIN messages m ON tm.message_id = m.id
		WHERE tm.task_id = ?
		ORDER BY m.received_at ASC
	`
	rows, err := s.db.QueryContext(ctx, query, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var infos []domain.TaskMessageInfo
	for rows.Next() {
		var info domain.TaskMessageInfo
		var recAt string
		err := rows.Scan(
			&info.MessageID, &info.GmailID, &info.ThreadID, &info.FromAddress,
			&info.Subject, &recAt, &info.Relationship, &info.LinkMethod,
		)
		if err != nil {
			return nil, err
		}
		info.ReceivedAt, _ = time.Parse(time.RFC3339, recAt)
		infos = append(infos, info)
	}
	return infos, nil
}

func (s *Store) scanTask(row *sql.Row) (*domain.Task, error) {
	var t domain.Task
	var desc, dueAt, compAt, snoozeAt, tz sql.NullString
	var ca, ua string
	err := row.Scan(
		&t.ID, &t.AccountID, &t.Title, &desc, &t.Status, &t.Priority,
		&dueAt, &t.DueDatePrecision, &tz, &t.OwnerState,
		&compAt, &snoozeAt, &ca, &ua,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if desc.Valid {
		t.Description = desc.String
	}
	if dueAt.Valid && dueAt.String != "" {
		parsed, _ := time.Parse(time.RFC3339, dueAt.String)
		t.DueAt = &parsed
	}
	if compAt.Valid && compAt.String != "" {
		parsed, _ := time.Parse(time.RFC3339, compAt.String)
		t.CompletedAt = &parsed
	}
	if snoozeAt.Valid && snoozeAt.String != "" {
		parsed, _ := time.Parse(time.RFC3339, snoozeAt.String)
		t.SnoozedUntil = &parsed
	}
	if tz.Valid {
		t.DueTimezone = tz.String
	}
	t.CreatedAt, _ = time.Parse(time.RFC3339, ca)
	t.UpdatedAt, _ = time.Parse(time.RFC3339, ua)
	return &t, nil
}

func (s *Store) scanTaskRow(rows *sql.Rows) (*domain.Task, error) {
	var t domain.Task
	var desc, dueAt, compAt, snoozeAt, tz sql.NullString
	var ca, ua string
	err := rows.Scan(
		&t.ID, &t.AccountID, &t.Title, &desc, &t.Status, &t.Priority,
		&dueAt, &t.DueDatePrecision, &tz, &t.OwnerState,
		&compAt, &snoozeAt, &ca, &ua,
	)
	if err != nil {
		return nil, err
	}
	if desc.Valid {
		t.Description = desc.String
	}
	if dueAt.Valid && dueAt.String != "" {
		parsed, _ := time.Parse(time.RFC3339, dueAt.String)
		t.DueAt = &parsed
	}
	if compAt.Valid && compAt.String != "" {
		parsed, _ := time.Parse(time.RFC3339, compAt.String)
		t.CompletedAt = &parsed
	}
	if snoozeAt.Valid && snoozeAt.String != "" {
		parsed, _ := time.Parse(time.RFC3339, snoozeAt.String)
		t.SnoozedUntil = &parsed
	}
	if tz.Valid {
		t.DueTimezone = tz.String
	}
	t.CreatedAt, _ = time.Parse(time.RFC3339, ca)
	t.UpdatedAt, _ = time.Parse(time.RFC3339, ua)
	return &t, nil
}

// ---------------- Notifications ----------------

func (s *Store) ScheduleNotification(ctx context.Context, n *domain.Notification) error {
	now := time.Now().UTC().Format(time.RFC3339)
	if n.CreatedAt.IsZero() {
		n.CreatedAt = time.Now().UTC()
	}
	n.UpdatedAt = time.Now().UTC()

	query := `
		INSERT INTO notifications (
			id, account_id, task_id, message_id, kind, title, body,
			scheduled_at, dedupe_key, status, attempt_count, last_error,
			delivered_at, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(dedupe_key) DO UPDATE SET
			title = excluded.title,
			body = excluded.body,
			scheduled_at = excluded.scheduled_at,
			updated_at = excluded.updated_at
	`
	_, err := s.db.ExecContext(ctx, query,
		n.ID, n.AccountID, n.TaskID, n.MessageID, string(n.Kind), n.Title, n.Body,
		n.ScheduledAt.UTC().Format(time.RFC3339), n.DedupeKey, n.Status,
		n.AttemptCount, n.LastError, nil,
		n.CreatedAt.Format(time.RFC3339), now,
	)
	return err
}

func (s *Store) ClaimDueNotifications(ctx context.Context, before time.Time, limit int) ([]*domain.Notification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `
		SELECT id, account_id, task_id, message_id, kind, title, body,
		       scheduled_at, dedupe_key, status, attempt_count, last_error,
		       delivered_at, created_at, updated_at
		FROM notifications
		WHERE status = 'scheduled' AND scheduled_at <= ?
		ORDER BY scheduled_at ASC
		LIMIT ?
	`
	rows, err := tx.QueryContext(ctx, query, before.UTC().Format(time.RFC3339), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []*domain.Notification
	var idsToClaim []string

	for rows.Next() {
		var n domain.Notification
		var tID, mID, lErr, delAt sql.NullString
		var schedAt, crAt, upAt string

		err := rows.Scan(
			&n.ID, &n.AccountID, &tID, &mID, &n.Kind, &n.Title, &n.Body,
			&schedAt, &n.DedupeKey, &n.Status, &n.AttemptCount, &lErr,
			&delAt, &crAt, &upAt,
		)
		if err != nil {
			return nil, err
		}

		if tID.Valid {
			n.TaskID = &tID.String
		}
		if mID.Valid {
			n.MessageID = &mID.String
		}
		if lErr.Valid {
			n.LastError = lErr.String
		}
		n.ScheduledAt, _ = time.Parse(time.RFC3339, schedAt)
		n.CreatedAt, _ = time.Parse(time.RFC3339, crAt)
		n.UpdatedAt, _ = time.Parse(time.RFC3339, upAt)

		notifs = append(notifs, &n)
		idsToClaim = append(idsToClaim, n.ID)
	}

	if len(idsToClaim) > 0 {
		for _, id := range idsToClaim {
			_, err = tx.ExecContext(ctx, "UPDATE notifications SET status = 'delivering', updated_at = ? WHERE id = ?", time.Now().UTC().Format(time.RFC3339), id)
			if err != nil {
				return nil, err
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return notifs, nil
}

func (s *Store) MarkNotificationDelivered(ctx context.Context, id string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.ExecContext(ctx, `
		UPDATE notifications SET status = 'delivered', delivered_at = ?, updated_at = ?
		WHERE id = ?
	`, now, now, id)
	return err
}

func (s *Store) ListNotifications(ctx context.Context, accountID string, limit int) ([]*domain.Notification, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, account_id, task_id, message_id, kind, title, body,
		       scheduled_at, dedupe_key, status, attempt_count, last_error,
		       delivered_at, created_at, updated_at
		FROM notifications
		WHERE account_id = ?
		ORDER BY scheduled_at DESC
		LIMIT ?
	`
	rows, err := s.db.QueryContext(ctx, query, accountID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []*domain.Notification
	for rows.Next() {
		var n domain.Notification
		var tID, mID, lErr, delAt sql.NullString
		var schedAt, crAt, upAt string

		err := rows.Scan(
			&n.ID, &n.AccountID, &tID, &mID, &n.Kind, &n.Title, &n.Body,
			&schedAt, &n.DedupeKey, &n.Status, &n.AttemptCount, &lErr,
			&delAt, &crAt, &upAt,
		)
		if err != nil {
			return nil, err
		}

		if tID.Valid {
			n.TaskID = &tID.String
		}
		if mID.Valid {
			n.MessageID = &mID.String
		}
		if lErr.Valid {
			n.LastError = lErr.String
		}
		if delAt.Valid && delAt.String != "" {
			t, _ := time.Parse(time.RFC3339, delAt.String)
			n.DeliveredAt = &t
		}
		n.ScheduledAt, _ = time.Parse(time.RFC3339, schedAt)
		n.CreatedAt, _ = time.Parse(time.RFC3339, crAt)
		n.UpdatedAt, _ = time.Parse(time.RFC3339, upAt)

		notifs = append(notifs, &n)
	}
	return notifs, nil
}

// ---------------- Preferences ----------------

func (s *Store) GetPreferences(ctx context.Context, accountID string) (*domain.Preferences, error) {
	query := `
		SELECT account_id, quiet_hours_start, quiet_hours_end, daily_digest_time,
		       urgent_threshold, vip_senders_json, enabled_notification_kinds_json, updated_at
		FROM preferences WHERE account_id = ?
	`
	row := s.db.QueryRowContext(ctx, query, accountID)

	var p domain.Preferences
	var vipsJ, kindsJ, upAt string
	err := row.Scan(&p.AccountID, &p.QuietHoursStart, &p.QuietHoursEnd, &p.DailyDigestTime,
		&p.UrgentThreshold, &vipsJ, &kindsJ, &upAt)
	if err == sql.ErrNoRows {
		// Default preferences
		return &domain.Preferences{
			AccountID:                accountID,
			QuietHoursStart:          "22:00",
			QuietHoursEnd:            "08:00",
			DailyDigestTime:          "08:30",
			UrgentThreshold:          "high",
			VIPSenders:               []string{},
			EnabledNotificationKinds: []string{"urgent_message", "deadline", "daily_digest"},
			UpdatedAt:                time.Now().UTC(),
		}, nil
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal([]byte(vipsJ), &p.VIPSenders)
	_ = json.Unmarshal([]byte(kindsJ), &p.EnabledNotificationKinds)
	p.UpdatedAt, _ = time.Parse(time.RFC3339, upAt)
	return &p, nil
}

func (s *Store) SavePreferences(ctx context.Context, p *domain.Preferences) error {
	toJson := func(v any) string {
		b, _ := json.Marshal(v)
		return string(b)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	p.UpdatedAt = time.Now().UTC()

	query := `
		INSERT INTO preferences (
			account_id, quiet_hours_start, quiet_hours_end, daily_digest_time,
			urgent_threshold, vip_senders_json, enabled_notification_kinds_json, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(account_id) DO UPDATE SET
			quiet_hours_start = excluded.quiet_hours_start,
			quiet_hours_end = excluded.quiet_hours_end,
			daily_digest_time = excluded.daily_digest_time,
			urgent_threshold = excluded.urgent_threshold,
			vip_senders_json = excluded.vip_senders_json,
			enabled_notification_kinds_json = excluded.enabled_notification_kinds_json,
			updated_at = excluded.updated_at
	`
	_, err := s.db.ExecContext(ctx, query,
		p.AccountID, p.QuietHoursStart, p.QuietHoursEnd, p.DailyDigestTime,
		p.UrgentThreshold, toJson(p.VIPSenders), toJson(p.EnabledNotificationKinds), now,
	)
	return err
}

// ---------------- Fixture Importer ----------------

type FixtureMessage struct {
	ID          string   `json:"id"`
	GmailID     string   `json:"gmail_id"`
	ThreadID    string   `json:"thread_id"`
	FromAddress string   `json:"from_address"`
	ToAddresses []string `json:"to_addresses"`
	CcAddresses []string `json:"cc_addresses"`
	Subject     string   `json:"subject"`
	ReceivedAt  string   `json:"received_at"`
	Snippet     string   `json:"snippet"`
	BodyText    string   `json:"body_text"`
	GmailLabels []string `json:"gmail_labels"`
}

func (s *Store) ImportFixtures(ctx context.Context, accountID, fixturesFilePath string) (int, error) {
	data, err := os.ReadFile(fixturesFilePath)
	if err != nil {
		return 0, fmt.Errorf("reading fixtures file: %w", err)
	}

	var fixtures []FixtureMessage
	if err := json.Unmarshal(data, &fixtures); err != nil {
		return 0, fmt.Errorf("parsing fixtures: %w", err)
	}

	count := 0
	for _, f := range fixtures {
		recAt, err := time.Parse(time.RFC3339, f.ReceivedAt)
		if err != nil {
			recAt = time.Now().UTC()
		}

		msg := &domain.Message{
			ID:          f.ID,
			AccountID:   accountID,
			GmailID:     f.GmailID,
			ThreadID:    f.ThreadID,
			FromAddress: f.FromAddress,
			ToAddresses: f.ToAddresses,
			CcAddresses: f.CcAddresses,
			Subject:     f.Subject,
			ReceivedAt:  recAt,
			Snippet:     f.Snippet,
			BodyText:    f.BodyText,
			GmailLabels: f.GmailLabels,
			SyncStatus:  "synced",
		}

		if err := s.SaveMessage(ctx, msg); err != nil {
			return count, fmt.Errorf("saving fixture message %s: %w", f.ID, err)
		}
		count++
	}

	return count, nil
}
