package domain

import (
	"time"
)

type Priority string

const (
	PriorityUrgent  Priority = "urgent"
	PriorityHigh    Priority = "high"
	PriorityNormal  Priority = "normal"
	PriorityLow     Priority = "low"
	PriorityUnknown Priority = "unknown"
)

type Category string

const (
	CategoryActionRequired Category = "action_required"
	CategoryInformational  Category = "informational"
	CategoryNewsletter     Category = "newsletter"
	CategoryTransactional  Category = "transactional"
	CategoryUnknown        Category = "unknown"
)

type TaskStatus string

const (
	TaskStatusDetected   TaskStatus = "detected"
	TaskStatusConfirmed  TaskStatus = "confirmed"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusWaiting    TaskStatus = "waiting"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusDismissed  TaskStatus = "dismissed"
)

type NotificationKind string

const (
	NotificationKindUrgentMessage NotificationKind = "urgent_message"
	NotificationKindDeadline      NotificationKind = "deadline"
	NotificationKindFollowUp      NotificationKind = "follow_up"
	NotificationKindDailyDigest   NotificationKind = "daily_digest"
)

type Account struct {
	ID              string    `json:"id"`
	Provider        string    `json:"provider"`
	ProviderSubject string    `json:"provider_subject,omitempty"`
	EmailAddress    string    `json:"email_address"`
	Timezone        string    `json:"timezone"`
	Status          string    `json:"status"` // connected, needs_reauth, disconnected
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Message struct {
	ID              string    `json:"id"`
	AccountID       string    `json:"account_id"`
	GmailID         string    `json:"gmail_id"`
	ThreadID        string    `json:"thread_id"`
	FromAddress     string    `json:"from_address"`
	ToAddresses     []string  `json:"to_addresses"`
	CcAddresses     []string  `json:"cc_addresses"`
	Subject         string    `json:"subject"`
	ReceivedAt      time.Time `json:"received_at"`
	Snippet         string    `json:"snippet"`
	BodyText        string    `json:"body_text,omitempty"`
	BodyHash        string    `json:"body_hash,omitempty"`
	GmailLabels     []string  `json:"gmail_labels"`
	SyncStatus      string    `json:"sync_status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	// Analysis populated on detail reads
	Analysis *Analysis `json:"analysis,omitempty"`
}

type Analysis struct {
	ID                  string     `json:"id"`
	MessageID           string     `json:"message_id"`
	ModelName           string     `json:"model_name"`
	ModelDigest         string     `json:"model_digest,omitempty"`
	PromptVersion       string     `json:"prompt_version"`
	SchemaVersion       string     `json:"schema_version"`
	Status              string     `json:"status"` // pending, processing, completed, failed, needs_review
	Category            Category   `json:"category"`
	Priority            Priority   `json:"priority"`
	ActionText          string     `json:"action_text,omitempty"`
	DeadlineText        string     `json:"deadline_text,omitempty"`
	DeadlineCandidateAt *time.Time `json:"deadline_candidate_at,omitempty"`
	DeadlineTimezone    string     `json:"deadline_timezone,omitempty"`
	EvidenceText        string     `json:"evidence_text,omitempty"`
	ValidationErrors    []string   `json:"validation_errors,omitempty"`
	RawModelOutput      string     `json:"raw_model_output,omitempty"`
	IsCurrent           bool       `json:"is_current"`
	ProcessedAt         *time.Time `json:"processed_at,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
}

type Task struct {
	ID               string     `json:"id"`
	AccountID        string     `json:"account_id"`
	Title            string     `json:"title"`
	Description      string     `json:"description,omitempty"`
	Status           TaskStatus `json:"status"`
	Priority         Priority   `json:"priority"`
	DueAt            *time.Time `json:"due_at,omitempty"`
	DueDatePrecision string     `json:"due_date_precision,omitempty"` // datetime, date, unknown
	DueTimezone      string     `json:"due_timezone,omitempty"`
	OwnerState       string     `json:"owner_state"` // user_action, waiting_on_other, informational
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
	SnoozedUntil     *time.Time `json:"snoozed_until,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`

	// Linked context populated when needed
	LinkedMessages []TaskMessageInfo `json:"linked_messages,omitempty"`
}

type TaskMessageInfo struct {
	MessageID    string    `json:"message_id"`
	GmailID      string    `json:"gmail_id"`
	ThreadID     string    `json:"thread_id"`
	FromAddress  string    `json:"from_address"`
	Subject      string    `json:"subject"`
	ReceivedAt   time.Time `json:"received_at"`
	Relationship string    `json:"relationship"` // origin, follow_up, deadline_update, context, user_linked
	LinkMethod   string    `json:"link_method"`   // same_thread, user, rule, model_suggestion
}

type TaskMessage struct {
	TaskID       string    `json:"task_id"`
	MessageID    string    `json:"message_id"`
	Relationship string    `json:"relationship"`
	LinkMethod   string    `json:"link_method"`
	CreatedAt    time.Time `json:"created_at"`
}

type Notification struct {
	ID           string           `json:"id"`
	AccountID    string           `json:"account_id"`
	TaskID       *string          `json:"task_id,omitempty"`
	MessageID    *string          `json:"message_id,omitempty"`
	Kind         NotificationKind `json:"kind"`
	Title        string           `json:"title"`
	Body         string           `json:"body"`
	ScheduledAt  time.Time        `json:"scheduled_at"`
	DedupeKey    string           `json:"dedupe_key"`
	Status       string           `json:"status"` // scheduled, delivering, delivered, cancelled, failed
	AttemptCount int              `json:"attempt_count"`
	LastError    string           `json:"last_error,omitempty"`
	DeliveredAt  *time.Time       `json:"delivered_at,omitempty"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
}

type Preferences struct {
	AccountID                   string   `json:"account_id"`
	QuietHoursStart             string   `json:"quiet_hours_start"`
	QuietHoursEnd               string   `json:"quiet_hours_end"`
	DailyDigestTime             string   `json:"daily_digest_time"`
	UrgentThreshold             string   `json:"urgent_threshold"`
	VIPSenders                  []string `json:"vip_senders"`
	EnabledNotificationKinds    []string `json:"enabled_notification_kinds"`
	UpdatedAt                   time.Time `json:"updated_at"`
}

type SyncState struct {
	AccountID     string     `json:"account_id"`
	LastSuccessAt *time.Time `json:"last_success_at,omitempty"`
	HistoryID     string     `json:"history_id,omitempty"`
	NextPageToken string     `json:"next_page_token,omitempty"`
	LastError     string     `json:"last_error,omitempty"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Job struct {
	ID           string     `json:"id"`
	Kind         string     `json:"kind"`
	DedupeKey    string     `json:"dedupe_key,omitempty"`
	PayloadJSON  string     `json:"payload_json"`
	Status       string     `json:"status"` // pending, processing, completed, failed
	AttemptCount int        `json:"attempt_count"`
	RunAfter     *time.Time `json:"run_after,omitempty"`
	LockedAt     *time.Time `json:"locked_at,omitempty"`
	LastError    string     `json:"last_error,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Digest struct {
	Date            string             `json:"date"`
	GeneratedAt     time.Time          `json:"generated_at"`
	AccountID       string             `json:"account_id"`
	Headline        string             `json:"headline"`
	TotalItems      int                `json:"total_items"`
	UrgentItems     []DigestItem       `json:"urgent_items"`
	DueSoonTasks    []DigestTaskItem   `json:"due_soon_tasks"`
	PendingActions  []DigestItem       `json:"pending_actions"`
	LowPriorityNews []DigestItem       `json:"low_priority_news"`
}

type DigestItem struct {
	MessageID   string    `json:"message_id"`
	Subject     string    `json:"subject"`
	FromAddress string    `json:"from_address"`
	ReceivedAt  time.Time `json:"received_at"`
	Category    Category  `json:"category"`
	Priority    Priority  `json:"priority"`
	ActionText  string    `json:"action_text,omitempty"`
	Evidence    string    `json:"evidence,omitempty"`
}

type DigestTaskItem struct {
	TaskID      string     `json:"task_id"`
	Title       string     `json:"title"`
	Priority    Priority   `json:"priority"`
	Status      TaskStatus `json:"status"`
	DueAt       *time.Time `json:"due_at,omitempty"`
	IsOverdue   bool       `json:"is_overdue"`
	LinkedCount int        `json:"linked_count"`
}
