# Development Setup

## Prerequisites
- Android Studio (latest stable)
- JDK 17 (Temurin recommended)
- Node.js 18+
- PostgreSQL 15+ or Supabase account

## Quick Start

### 1. Clone & Setup
```bash
git clone <repo-url>
cd couple-os
cp .env.example .env
# Edit .env with your configuration
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
# Server running on http://localhost:3000
```

### 3. Android
Open `android/` in Android Studio, sync Gradle, and run.

## Environment Variables

See `.env.example` for all required variables.

## Build Commands

| Command | Description |
|---------|-------------|
| `cd backend && npm run dev` | Start backend (dev) |
| `cd backend && npm run build` | Build backend |
| `cd android && ./gradlew assembleDebug` | Build debug APK |
| `cd android && ./gradlew assembleRelease` | Build release APK |
| `cd android && ./gradlew bundleRelease` | Build AAB |
| `cd android && ./gradlew test` | Run Android tests |
| `cd backend && npm test` | Run backend tests |
