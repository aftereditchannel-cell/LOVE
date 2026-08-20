# API Endpoints — Couple OS

Base URL: `https://api.coupleos.local`

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/pair` | Pair device with tokens |
| POST | `/api/auth/validate` | Validate a token |
| POST | `/api/auth/unpair` | Unpair device |

## Profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile` | Get own profile |
| PUT | `/api/profile` | Update own profile |
| GET | `/api/profile/partner` | Get partner profile (limited) |

## Couple

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/couple` | Get couple info |
| PUT | `/api/couple` | Update couple info |

## Moods

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/moods` | Get mood history |
| POST | `/api/moods` | Create/update mood |
| GET | `/api/moods/partner/today` | Get partner's today mood |

## Memories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memories` | Get memories |
| POST | `/api/memories` | Create memory |
| PUT | `/api/memories/:id` | Update memory |
| DELETE | `/api/memories/:id` | Delete memory (soft) |

## Chat

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat` | Get messages |
| POST | `/api/chat` | Send message |
| PUT | `/api/chat/:id` | Edit message |
| DELETE | `/api/chat/:id` | Delete message |
| POST | `/api/chat/:id/reaction` | Add reaction |

## Calendar

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/calendar` | Get events |
| POST | `/api/calendar` | Create event |
| PUT | `/api/calendar/:id` | Update event |
| DELETE | `/api/calendar/:id` | Delete event |

## Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | Get tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/status` | Update status |
| DELETE | `/api/tasks/:id` | Delete task |

## Wishlist / Bucket List / Countdowns / Letters / Questions

Standard CRUD endpoints following the same pattern.

## Sync

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sync/push` | Push local changes |
| GET | `/api/sync/pull?since=` | Pull server changes |

## Backup

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/backup/create` | Create backup |
| GET | `/api/backup/history` | Get backup history |

## Devices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/devices` | Get paired devices |
| DELETE | `/api/devices/:id` | Revoke device |

## WebSocket

Connect: `wss://api.coupleos.local/ws?token=SESSION_TOKEN`

### Message Types
- `chat` — New chat message
- `typing` — Typing indicator
- `seen` — Message seen
- `mood_update` — Partner mood changed
- `presence` — Online/offline status
