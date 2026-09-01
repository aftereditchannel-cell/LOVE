-- Couple OS — PostgreSQL production schema (mirror of schema.sql)
-- Applied automatically at boot when DATABASE_URL starts with postgres.
-- Timestamps are ISO strings for cross-dialect parity with the SQLite dev db.
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL, avatar_url TEXT, email_verified_at TEXT,
    verify_token_hash TEXT, reset_token_hash TEXT, reset_token_exp TEXT,
    totp_secret TEXT, totp_enabled INTEGER NOT NULL DEFAULT 0, lock_pin_hash TEXT,
    theme TEXT NOT NULL DEFAULT 'system', locale TEXT NOT NULL DEFAULT 'fa',
    last_seen_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT
  );
END $$;
-- NOTE: برای سادگی استقرار، نسخه کامل PG از schema.sql به‌صورت خودکار تبدیل می‌شود.
-- این فایل نقطه شروع است؛ adapter تابع pgSchema() را اجرا می‌کند.
