# Changelog

## [1.1.0] — 2026-08-21

### Fixed — data really lands on the token now
- **Root cause**: the app assumed a single Gist shared by both partners, but a
  GitHub token can only write to Gists it owns, so every partner-side write
  failed with 404 while the UI still reported "connection OK".
- Each token now owns its own `CoupleOS-SharedData` Gist; the app writes to its
  own and reads both.
- `GitHubGist.description` is nullable — GitHub returns `null` for gists without
  a description, which previously broke deserialization of the gist list.
- Truncated (>1MB) gist files are now downloaded through their `raw_url`.
- Mood saving no longer overwrites `moods.json` with a single record (this used
  to destroy the whole history on every save).
- GitHub errors surface the real status code and response body instead of a
  generic message.
- Chat messages are no longer filtered by the local `coupleId`, so messages
  pulled from the partner actually appear.
- `coupleId` is now deterministic (derived from both GitHub usernames).

### Added
- `CoupleSyncRepository`: full-snapshot push / pull / merge with last-write-wins
  conflict resolution across all 19 entity types.
- Token scope validation — warns immediately if a token lacks the `gist` scope.
- Settings screen with connection info, gist ids, last sync, last error and a
  **full end-to-end storage self test** (auth → scope → gist → write → read back).
- Background `SyncWorker` every 15 minutes, plus a sync on app unlock.
- Newly activated screens: Tasks, Wishlist, Bucket List, Countdowns, Expenses,
  Journal, Love Letters (time-locked), Surprises, Our Story timeline, Daily
  Questions, Relationship check-in, Date Planner, Profile, Global Search,
  Settings and a fully offline Assistant.
- "☁️ روی توکن / 📱 فقط لوکال" badges so persistence is visible per record.
- Shared UI toolkit (`ui/common`) and Android CI workflow.
- Documentation: `docs/FEATURES.md` and `docs/SYNC.md`.

### Changed
- All Room entities are `@Serializable`; database bumped to version 2.
- Added `RelationshipCheckinDao` and one-shot / bulk-sync DAO queries.
- ProGuard keeps for every serializable model.

## [1.0.0] — 2026-08-20

### Added
- Two-person token pairing system
- Secure couple authentication (no public registration)
- App Lock (PIN + biometric support)
- Android Keystore encrypted token storage
- Splash screen with brand identity
- RTL Persian UI with Vazirmatn typography
- Dashboard with mood cards, countdowns, daily questions, insights
- Mood system (9 moods + energy/stress/sleep/love/social sliders)
- Partner mood awareness ("شاید الان بیشتر بهت نیاز داشته باشه ❤️")
- Memory vault with create, favorite, privacy controls
- Real-time chat (local + sync-ready)
- Shared calendar with event management
- More screen with full feature navigation
- Room database with 19 entity tables
- Offline-first architecture with sync queue
- Backend REST API (Node.js + TypeScript)
- WebSocket server for real-time features
- PostgreSQL database schema with 20+ tables
- Couple isolation security middleware
- Rate limiting and input validation
- Complete API for all features
- GitHub Actions CI/CD workflows
- Comprehensive documentation
- Dark theme with Soft Rose accent
- Material 3 design system

### Security
- Android Keystore for all secrets
- Three-token architecture (GitHub/Personal/Partner)
- Server-side authorization with scope-based permissions
- Couple isolation preventing cross-couple data access
- Masked token display
- Audit logging
- Network security config (HTTPS only in production)
