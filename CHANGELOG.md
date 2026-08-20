# Changelog

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
