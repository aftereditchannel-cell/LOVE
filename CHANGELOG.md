# Changelog

## [1.3.0] — 2026-09-02

### Added
- **همه قابلیت‌های کیوت حالا روی توکن گیت ذخیره می‌شن**: بوس‌شمار، حیوون دونفره،
  شیشه تعریف، یخچال عشق، عادت‌ها، آهنگ‌ها، برنامه قرار، بازی‌ها و کامپلیمنت‌ها
  دیگه فقط لوکال نیستن — داخل `extras.json` و `photos.json` روی هر دو Gist ثبت می‌شن
  و موقع باز شدن اپ همگام‌سازی می‌شن (last-write-wins با rev).
- گالری عکس واقعی: عکس با انتخاب از گالری، کوچک‌شده و base64 روی توکن ذخیره می‌شه
  (دسترسی persistable + حذف عکس).
- بوس لمسی (Thumb Kiss) مثل اپ Between — هر دو نفر هم‌زمان انگشت رو نگه می‌دارن.
- عشق‌سنج 💘 روی داشبورد (امتیاز رابطه از روزهای باهم، حال، کارها و خاطرات).
- پس‌زمینه گرادیانی رز + قلب‌های شناور + داشبورد و منوی «بیشتر» جدید و گوگولی.

### Fixed
- قابلیت‌های کیوت قبلاً فقط لوکال بودن و روی توکن ثبت نمی‌شدن.

## [1.2.0] — 2026-09-01

### Added
- Kiss counter with floating hearts
- Couple pet (feed + pet + cute faces)
- Compliment jar
- Daily love fortune
- Love capsules
- Chat sticker tray
- Candy and peach cute themes
- Good morning / good night shortcuts

## [1.1.0] — 2026-09-01

### Added
- Working fingerprint unlock (Android BiometricPrompt + WebAuthn / local scan)
- Pull-to-refresh on dashboard, chat, memories, and web screens
- Glassmorphism UI with floating hearts and theme palettes
- In-app customization (theme, accent, glass blur, font, stickers, title)
- Date planner, love fridge notes, couple games, habits, playlist, our story
- Real photo gallery and real search across memories/chat/journal/tasks
- Interactive web PWA so every feature can be used and tested in the browser

### Fixed
- Stub screens (photos, search, date planner, our story) now fully active
- Dashboard quick actions for journal and tasks
- Lock screen biometric no longer unlocks without a real prompt

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
