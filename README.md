# ❤️ دنیای کوچیک ما — Couple OS

**دنیای کوچیک دوتایی ما**

A private, secure Android application built exclusively for two people — a digital home for your shared memories, conversations, plans, and everything in between.

---

## 🏗️ Architecture

```
Android APK (Kotlin + Jetpack Compose)
      │
      ▼
Secure REST API (Node.js + TypeScript)
      │
      ├──────────► PostgreSQL (Supabase)
      │
      ├──────────► Object Storage (Supabase Storage)
      │
      ├──────────► Google Drive (Photos)
      │
      └──────────► Backup Worker
                       │
                       ▼
                  GitHub Gist (Encrypted)
```

---

## 📱 Features

### Core
- **Two-Person Token Pairing** — No public registration
- **App Lock** — PIN / Biometric
- **Offline-First** — Works without internet
- **Encrypted Storage** — Android Keystore
- **Secure Sync** — Conflict resolution with versioning

### Shared Space (دنیای ما)
- 💬 Real-time Chat
- 📸 Photo Memories & Timeline
- 📅 Shared Calendar
- ✅ Couple Tasks
- 💝 Love Letters (time-locked)
- 🎁 Surprises
- 📝 Shared Journal
- 🎯 Bucket List
- ⭐ Wishlist
- ⏱️ Countdowns
- 💰 Shared Expenses

### Personal Space (فضای من)
- 📓 Private Journal
- 🔒 Private Notes
- 😊 Daily Mood Tracking
- 🤝 Relationship Reflections

### Smart Features
- 📊 Couple Statistics
- 💡 Smart Dashboard Insights
- ❓ Daily Questions
- 🗓️ Anniversary Generator
- 🎂 Birthday System
- 🤖 AI Assistant (optional)

---

## 🔐 Security Model

### Three-Token Architecture

| Token | Purpose | Storage |
|-------|---------|---------|
| **GitHub Server Token** | Backup, Gist API | Backend env only |
| **Personal Couple Token** | User A authentication | Android Keystore |
| **Partner Couple Token** | User B authentication | Android Keystore |

### Security Features
- TLS/HTTPS only
- Token-scoped permissions
- Couple isolation (no cross-couple access)
- Server-side authorization
- Rate limiting
- Input validation
- Audit logging
- Device management

---

## 📂 Project Structure

```
couple-os/
├── android/          # Android app (Kotlin + Compose)
│   ├── app/
│   │   └── src/main/java/com/coupleos/app/
│   │       ├── core/        # DI, utilities
│   │       ├── data/        # Room DB, API, repositories
│   │       ├── domain/      # Models, use cases
│   │       ├── ui/          # Compose screens
│   │       ├── security/    # Keystore, crypto
│   │       ├── sync/        # Offline sync engine
│   │       └── network/     # Interceptors, WebSocket
│   └── build.gradle.kts
├── backend/          # API server (Node.js + TypeScript)
│   └── src/
│       ├── api/         # Route handlers
│       ├── middleware/   # Auth, isolation, errors
│       ├── database/    # Schema, migrations
│       └── workers/     # WebSocket, backup
├── docs/             # Documentation
├── tests/            # Test suites
├── assets/           # Brand, icons
├── .github/workflows # CI/CD
└── .env.example      # Config template
```

---

## 🚀 Getting Started

### Prerequisites
- Android Studio (Hedgehog or newer)
- JDK 17
- Node.js 18+
- PostgreSQL (or Supabase account)

### Backend Setup

```bash
cd backend
cp ../.env.example .env
# Edit .env with your database URL and secrets
npm install
npm run db:migrate
npm run dev
```

### Android Setup

1. Open `android/` in Android Studio
2. Create `android/local.properties`:
   ```
   sdk.dir=/path/to/android/sdk
   API_BASE_URL=http://10.0.2.2:3000
   ```
3. Download [Vazirmatn font](https://github.com/rastikerdar/vazirmatn/releases) and place `.ttf` files in `android/app/src/main/res/font/`
4. Build & Run

### Build APK

```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Build AAB

```bash
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

---

## 🔑 First Launch

1. Open the app → Splash screen
2. **"تو کدومی؟"** → Select your identity
3. Enter your personal token
4. Enter your partner's token
5. Device pairing completes
6. Set up PIN lock
7. Dashboard ready ❤️

---

## 📊 Project Status

| Feature | Status |
|---------|--------|
| Core Architecture | ✅ |
| Token Pairing | ✅ |
| App Lock (PIN) | ✅ |
| Secure Storage | ✅ |
| Dashboard | ✅ |
| Mood System | ✅ |
| Memories | ✅ |
| Chat (local) | ✅ |
| Calendar | ✅ |
| Room Database | ✅ |
| Backend API | ✅ |
| WebSocket | ✅ |
| Sync Engine | ✅ |
| Tasks | 🚧 |
| Wishlist | 🚧 |
| Bucket List | 🚧 |
| Love Letters | 🚧 |
| Surprises | 🚧 |
| Google Drive | 🚧 |
| GitHub Backup | 🚧 |
| AI Assistant | 🚧 |

---

## 🛡️ Security

See [SECURITY.md](SECURITY.md) for detailed security documentation.

**Important:**
- Never commit `.env`, tokens, or keys to Git
- GitHub Token is ONLY for the backend server
- APK must not contain any secrets
- All tokens stored in Android Keystore

---

## 📝 License

MIT License — See [LICENSE](LICENSE)

---

## ❤️ Built with love for two people

**دنیای کوچیک ما** — Because your love story deserves its own private space.
