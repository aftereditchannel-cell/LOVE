# Database Schema — Couple OS

## Tables

### Core
| Table | Description |
|-------|-------------|
| `users` | Person A and Person B profiles |
| `couples` | Couple relationship data |
| `access_tokens` | Hashed authentication tokens |
| `devices` | Paired devices |
| `sessions` | Active sessions |

### Content
| Table | Description |
|-------|-------------|
| `moods` | Daily mood entries |
| `memories` | Shared/private memories |
| `journal_entries` | Journal/diary entries |
| `messages` | Chat messages |
| `calendar_events` | Calendar events |
| `tasks` | Shared tasks |
| `wishlists` | Wishlist items |
| `bucket_items` | Bucket list items |
| `love_letters` | Time-locked love letters |
| `surprises` | Surprise messages |
| `daily_questions` | Daily couple questions |
| `question_answers` | Answers to daily questions |
| `countdowns` | Countdown timers |
| `expenses` | Shared expenses |
| `timeline_events` | Relationship timeline |
| `relationship_checkins` | Relationship health checks |

### System
| Table | Description |
|-------|-------------|
| `backup_jobs` | Backup history |
| `audit_logs` | Security audit trail |

## Common Fields

Every content table includes:
- `id` UUID PRIMARY KEY
- `couple_id` UUID (couple isolation)
- `created_by` UUID (creator)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ
- `deleted_at` TIMESTAMPTZ (soft delete)
- `version` INT (conflict resolution)

## Indexes
- All `couple_id` columns are indexed
- `moods(user_id, date)` for daily mood lookup
- `messages(couple_id)` with `is_deleted = FALSE` filter
- `audit_logs(couple_id)` for security review
