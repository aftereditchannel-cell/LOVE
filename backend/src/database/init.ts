import { Pool } from 'pg';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function initDatabase() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID,
      role VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      nickname VARCHAR(100) DEFAULT '',
      birthday VARCHAR(20) DEFAULT '',
      photo_url TEXT DEFAULT '',
      favorite_color VARCHAR(50) DEFAULT '',
      favorite_things TEXT DEFAULT '',
      love_language VARCHAR(50) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS couples (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) DEFAULT '',
      start_date VARCHAR(20) DEFAULT '',
      couple_photo TEXT DEFAULT '',
      anniversary VARCHAR(20) DEFAULT '',
      favorite_place VARCHAR(200) DEFAULT '',
      favorite_song VARCHAR(200) DEFAULT '',
      our_story TEXT DEFAULT '',
      person_a_id UUID REFERENCES users(id),
      person_b_id UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS access_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      token_hash VARCHAR(256) NOT NULL,
      role VARCHAR(20) NOT NULL,
      scopes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      device_name VARCHAR(200) NOT NULL,
      device_id VARCHAR(200) NOT NULL UNIQUE,
      platform VARCHAR(50) DEFAULT 'android',
      last_seen TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      device_id UUID REFERENCES devices(id),
      token_hash VARCHAR(256) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS moods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      couple_id UUID,
      mood VARCHAR(50) NOT NULL,
      energy INT DEFAULT 5,
      stress INT DEFAULT 5,
      sleep INT DEFAULT 5,
      love_level INT DEFAULT 5,
      social_battery INT DEFAULT 5,
      note TEXT DEFAULT '',
      date VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT DEFAULT '',
      date VARCHAR(20) NOT NULL,
      location VARCHAR(500) DEFAULT '',
      tags JSONB DEFAULT '[]',
      mood VARCHAR(50) DEFAULT '',
      privacy VARCHAR(20) DEFAULT 'SHARED',
      created_by UUID REFERENCES users(id),
      media_urls JSONB DEFAULT '[]',
      is_favorite BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      mood VARCHAR(50) DEFAULT '',
      date VARCHAR(20) NOT NULL,
      tags JSONB DEFAULT '[]',
      photos JSONB DEFAULT '[]',
      privacy VARCHAR(20) DEFAULT 'PRIVATE',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      sender_id UUID REFERENCES users(id),
      content TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'TEXT',
      reply_to_id UUID,
      reactions JSONB DEFAULT '[]',
      is_pinned BOOLEAN DEFAULT FALSE,
      is_edited BOOLEAN DEFAULT FALSE,
      is_deleted BOOLEAN DEFAULT FALSE,
      seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT DEFAULT '',
      date VARCHAR(20) NOT NULL,
      end_date VARCHAR(20) DEFAULT '',
      type VARCHAR(50) DEFAULT 'CUSTOM',
      is_recurring BOOLEAN DEFAULT FALSE,
      has_reminder BOOLEAN DEFAULT TRUE,
      reminder_minutes INT DEFAULT 30,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT DEFAULT '',
      due_date VARCHAR(20) DEFAULT '',
      priority VARCHAR(20) DEFAULT 'MEDIUM',
      assigned_to VARCHAR(20) DEFAULT 'BOTH',
      status VARCHAR(20) DEFAULT 'TODO',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT DEFAULT '',
      category VARCHAR(100) DEFAULT '',
      privacy VARCHAR(20) DEFAULT 'SHARED',
      is_completed BOOLEAN DEFAULT FALSE,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS bucket_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT DEFAULT '',
      is_completed BOOLEAN DEFAULT FALSE,
      completed_date VARCHAR(20) DEFAULT '',
      photo_url TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS love_letters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      open_on_date VARCHAR(20) DEFAULT '',
      is_opened BOOLEAN DEFAULT FALSE,
      created_by UUID REFERENCES users(id),
      recipient_id UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS surprises (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      content TEXT NOT NULL,
      trigger_type VARCHAR(50) DEFAULT '',
      trigger_value VARCHAR(200) DEFAULT '',
      is_revealed BOOLEAN DEFAULT FALSE,
      created_by UUID REFERENCES users(id),
      recipient_id UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS daily_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      question TEXT NOT NULL,
      date VARCHAR(20) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS question_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id UUID REFERENCES daily_questions(id),
      user_id UUID REFERENCES users(id),
      couple_id UUID NOT NULL,
      answer TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS countdowns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      target_date VARCHAR(20) NOT NULL,
      emoji VARCHAR(10) DEFAULT '❤️',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      amount DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'IRR',
      category VARCHAR(100) DEFAULT '',
      paid_by UUID REFERENCES users(id),
      split_type VARCHAR(50) DEFAULT 'equal',
      date VARCHAR(20) NOT NULL,
      note TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      title VARCHAR(500) NOT NULL,
      date VARCHAR(20) NOT NULL,
      description TEXT DEFAULT '',
      type VARCHAR(50) DEFAULT '',
      photo_url TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS relationship_checkins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      couple_id UUID NOT NULL,
      communication INT DEFAULT 5,
      trust INT DEFAULT 5,
      quality_time INT DEFAULT 5,
      affection INT DEFAULT 5,
      fun_score INT DEFAULT 5,
      support INT DEFAULT 5,
      date VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      version INT DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS backup_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_id UUID NOT NULL,
      version_id VARCHAR(100),
      status VARCHAR(50) DEFAULT 'PENDING',
      size BIGINT DEFAULT 0,
      hash VARCHAR(256) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      couple_id UUID,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100),
      resource_id UUID,
      ip_address VARCHAR(50),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_memories_couple ON memories(couple_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_messages_couple ON messages(couple_id) WHERE is_deleted = FALSE;
    CREATE INDEX IF NOT EXISTS idx_calendar_events_couple ON calendar_events(couple_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_couple ON tasks(couple_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_couple ON audit_logs(couple_id);
  `);

  console.log('Database tables created/verified');
}
