-- 001_initial_schema.sql
-- QuietOS SQLite Schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS connected_accounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_subject TEXT,
    email_address TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    gmail_id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    from_address TEXT,
    to_addresses_json TEXT NOT NULL DEFAULT '[]',
    cc_addresses_json TEXT NOT NULL DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    received_at TEXT NOT NULL,
    snippet TEXT NOT NULL DEFAULT '',
    body_text TEXT,
    body_hash TEXT,
    gmail_labels_json TEXT NOT NULL DEFAULT '[]',
    sync_status TEXT NOT NULL DEFAULT 'synced',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(account_id, gmail_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_account_received ON messages (account_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (account_id, thread_id);

CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    model_digest TEXT,
    prompt_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    status TEXT NOT NULL,
    category TEXT,
    priority TEXT,
    action_text TEXT,
    deadline_text TEXT,
    deadline_candidate_at TEXT,
    deadline_timezone TEXT,
    evidence_text TEXT,
    validation_errors_json TEXT NOT NULL DEFAULT '[]',
    raw_model_output TEXT,
    is_current INTEGER NOT NULL DEFAULT 1,
    processed_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analyses_message_id ON analyses (message_id);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_at TEXT,
    due_date_precision TEXT,
    due_timezone TEXT,
    owner_state TEXT NOT NULL DEFAULT 'user_action',
    completed_at TEXT,
    snoozed_until TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_account_status ON tasks (account_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks (account_id, due_at);

CREATE TABLE IF NOT EXISTS task_messages (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL,
    link_method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (task_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_task_messages_msg ON task_messages (message_id);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES connected_accounts(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    scheduled_at TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications (status, scheduled_at);

CREATE TABLE IF NOT EXISTS preferences (
    account_id TEXT PRIMARY KEY REFERENCES connected_accounts(id) ON DELETE CASCADE,
    quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
    quiet_hours_end TEXT NOT NULL DEFAULT '08:00',
    daily_digest_time TEXT NOT NULL DEFAULT '08:30',
    urgent_threshold TEXT NOT NULL DEFAULT 'high',
    vip_senders_json TEXT NOT NULL DEFAULT '[]',
    enabled_notification_kinds_json TEXT NOT NULL DEFAULT '["urgent_message", "deadline", "daily_digest"]',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_state (
    account_id TEXT PRIMARY KEY REFERENCES connected_accounts(id) ON DELETE CASCADE,
    last_success_at TEXT,
    history_id TEXT,
    next_page_token TEXT,
    last_error TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    dedupe_key TEXT UNIQUE,
    payload_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    run_after TEXT,
    locked_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status_run_after ON jobs (status, run_after);
