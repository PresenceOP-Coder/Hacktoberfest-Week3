export type Priority = 'urgent' | 'high' | 'normal' | 'low' | 'unknown';
export type Category = 'action_required' | 'informational' | 'newsletter' | 'transactional' | 'unknown';
export type TaskStatus = 'detected' | 'confirmed' | 'in_progress' | 'waiting' | 'completed' | 'dismissed';

export interface Analysis {
  id: string;
  message_id: string;
  model_name: string;
  status: string;
  category: Category;
  priority: Priority;
  action_text?: string;
  deadline_text?: string;
  deadline_candidate_at?: string;
  deadline_timezone?: string;
  evidence_text?: string;
  validation_errors?: string[];
}

export interface TaskMessageInfo {
  message_id: string;
  gmail_id: string;
  thread_id: string;
  from_address: string;
  subject: string;
  received_at: string;
  relationship: string;
  link_method: string;
}

export interface Task {
  id: string;
  account_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  due_at?: string;
  due_date_precision?: string;
  due_timezone?: string;
  owner_state: string;
  completed_at?: string;
  snoozed_until?: string;
  created_at: string;
  updated_at: string;
  linked_messages?: TaskMessageInfo[];
}

export interface Message {
  id: string;
  account_id: string;
  gmail_id: string;
  thread_id: string;
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  received_at: string;
  snippet: string;
  body_text?: string;
  gmail_labels: string[];
  sync_status: string;
  analysis?: Analysis;
}

export interface DigestItem {
  message_id: string;
  subject: string;
  from_address: string;
  received_at: string;
  category: Category;
  priority: Priority;
  action_text?: string;
  evidence?: string;
}

export interface DigestTaskItem {
  task_id: string;
  title: string;
  priority: Priority;
  status: TaskStatus;
  due_at?: string;
  is_overdue: boolean;
  linked_count: number;
}

export interface Digest {
  date: string;
  generated_at: string;
  account_id: string;
  headline: string;
  total_items: number;
  urgent_items: DigestItem[];
  due_soon_tasks: DigestTaskItem[];
  pending_actions: DigestItem[];
  low_priority_news: DigestItem[];
}

export interface Notification {
  id: string;
  task_id?: string;
  message_id?: string;
  kind: string;
  title: string;
  body: string;
  scheduled_at: string;
  status: string;
  delivered_at?: string;
}

export interface Preferences {
  account_id: string;
  quiet_hours_start: string;
  quiet_hours_end: string;
  daily_digest_time: string;
  urgent_threshold: string;
  vip_senders: string[];
  enabled_notification_kinds: string[];
}

export interface RuntimeStatus {
  model_configured: string;
  ollama_url: string;
  account_id: string;
  account_status: string;
  has_messages: boolean;
  tasks_count: number;
  timestamp: string;
}
