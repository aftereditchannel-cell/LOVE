PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  email_verified_at TEXT,
  verify_token_hash TEXT,
  reset_token_hash TEXT,
  reset_token_exp TEXT,
  totp_secret TEXT,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  lock_pin_hash TEXT,
  theme TEXT NOT NULL DEFAULT 'system',
  locale TEXT NOT NULL DEFAULT 'fa',
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  nickname TEXT,
  birthday TEXT,
  favorite_color TEXT,
  favorite_things TEXT,
  bio TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS couples (
  id TEXT PRIMARY KEY,
  title TEXT,
  start_date TEXT,
  invite_code TEXT UNIQUE,
  gist_id TEXT,
  gist_token_enc TEXT,
  pending_partner TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS couple_members (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'partner',
  nickname TEXT,
  last_read_message_at TEXT,
  joined_at TEXT NOT NULL,
  UNIQUE (couple_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_user ON couple_members(user_id);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash TEXT NOT NULL UNIQUE,
  device_name TEXT,
  user_agent TEXT,
  ip TEXT,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  couple_id TEXT,
  action TEXT NOT NULL,
  meta TEXT,
  ip TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_couple ON audit_logs(couple_id, created_at);

CREATE TABLE IF NOT EXISTS moods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  mood TEXT NOT NULL,
  energy INTEGER NOT NULL DEFAULT 5,
  stress INTEGER NOT NULL DEFAULT 5,
  sleep INTEGER NOT NULL DEFAULT 5,
  love_level INTEGER NOT NULL DEFAULT 5,
  social_battery INTEGER NOT NULL DEFAULT 5,
  support_wish TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_moods_couple ON moods(couple_id, date);

CREATE TABLE IF NOT EXISTS period_cycles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  end_date TEXT,
  cycle_length INTEGER NOT NULL DEFAULT 28,
  notes_enc TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cycles_user ON period_cycles(user_id, start_date);

CREATE TABLE IF NOT EXISTS period_symptoms (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL REFERENCES period_cycles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  pain INTEGER NOT NULL DEFAULT 0,
  energy INTEGER NOT NULL DEFAULT 5,
  mood TEXT,
  cravings TEXT,
  sleep INTEGER NOT NULL DEFAULT 5,
  headache INTEGER NOT NULL DEFAULT 0,
  bloating INTEGER NOT NULL DEFAULT 0,
  skin TEXT,
  notes_enc TEXT
);
CREATE INDEX IF NOT EXISTS idx_symptoms_cycle ON period_symptoms(cycle_id, date);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_enc TEXT NOT NULL,
  mood TEXT,
  location TEXT,
  tags TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'shared',
  entry_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_journal_couple ON journal_entries(couple_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_author ON journal_entries(author_id);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  description TEXT,
  tags TEXT NOT NULL DEFAULT '',
  milestone TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_memories_couple ON memories(couple_id, date);

CREATE TABLE IF NOT EXISTS memory_media (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_albums_couple ON albums(couple_id);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  favorite INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '',
  caption TEXT,
  taken_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_photos_couple ON photos(couple_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_enc TEXT NOT NULL,
  reply_to_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  edited_at TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_couple ON messages(couple_id, created_at);

CREATE TABLE IF NOT EXISTS message_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  description TEXT,
  reminder_minutes INTEGER,
  color TEXT NOT NULL DEFAULT 'rose',
  kind TEXT NOT NULL DEFAULT 'event',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_couple ON calendar_events(couple_id, date);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  assignee TEXT NOT NULL DEFAULT 'both',
  priority TEXT NOT NULL DEFAULT 'medium',
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  due_date TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_couple ON tasks(couple_id, done);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  owner_id TEXT,
  category TEXT NOT NULL DEFAULT 'things_i_want',
  title TEXT NOT NULL,
  image_url TEXT,
  price REAL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  link TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'wanted',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_wish_couple ON wishlist_items(couple_id, category);

CREATE TABLE IF NOT EXISTS bucket_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  done_at TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_bucket_couple ON bucket_items(couple_id);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  paid_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT NOT NULL DEFAULT 'general',
  split TEXT NOT NULL DEFAULT 'equal',
  note TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_expenses_couple ON expenses(couple_id, date);

CREATE TABLE IF NOT EXISTS love_letters (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_enc TEXT NOT NULL,
  open_at TEXT,
  opened_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_letters_couple ON love_letters(couple_id, created_at);

CREATE TABLE IF NOT EXISTS daily_questions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL UNIQUE,
  tags TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS question_answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (question_id, user_id, couple_id)
);
CREATE INDEX IF NOT EXISTS idx_answers_couple ON question_answers(couple_id);

CREATE TABLE IF NOT EXISTS love_languages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  primary_lang TEXT NOT NULL,
  secondary_lang TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationship_checkins (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  communication INTEGER NOT NULL,
  trust INTEGER NOT NULL,
  quality_time INTEGER NOT NULL,
  affection INTEGER NOT NULL,
  fun INTEGER NOT NULL,
  support INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rel_couple ON relationship_checkins(couple_id, created_at);

CREATE TABLE IF NOT EXISTS countdowns (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  target_date TEXT NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_countdowns_couple ON countdowns(couple_id, target_date);

CREATE TABLE IF NOT EXISTS compliments (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'compliment',
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_compliments_couple ON compliments(couple_id, created_at);

CREATE TABLE IF NOT EXISTS story_chapters (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  title TEXT NOT NULL,
  content_enc TEXT,
  memory_ids TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE (couple_id, key)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read_at);

CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  notif_birthday INTEGER NOT NULL DEFAULT 1,
  notif_anniversary INTEGER NOT NULL DEFAULT 1,
  notif_period INTEGER NOT NULL DEFAULT 0,
  notif_pms INTEGER NOT NULL DEFAULT 0,
  notif_calendar INTEGER NOT NULL DEFAULT 1,
  notif_task INTEGER NOT NULL DEFAULT 1,
  notif_memory INTEGER NOT NULL DEFAULT 1,
  notif_letter INTEGER NOT NULL DEFAULT 1,
  notif_question INTEGER NOT NULL DEFAULT 1,
  notif_mood INTEGER NOT NULL DEFAULT 1,
  period_tracking_enabled INTEGER NOT NULL DEFAULT 0,
  auto_backup INTEGER NOT NULL DEFAULT 0,
  lock_enabled INTEGER NOT NULL DEFAULT 0,
  lock_timeout_minutes INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS couple_settings (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL UNIQUE REFERENCES couples(id) ON DELETE CASCADE,
  backup_debounce_sec INTEGER NOT NULL DEFAULT 60,
  keep_versions INTEGER NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS backup_jobs (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  error TEXT,
  version_id TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_couple ON backup_jobs(couple_id, started_at);

CREATE TABLE IF NOT EXISTS backup_versions (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  gist_id TEXT,
  file_name TEXT,
  size_bytes INTEGER,
  sha TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (couple_id, version)
);
CREATE INDEX IF NOT EXISTS idx_versions_couple ON backup_versions(couple_id, created_at);
