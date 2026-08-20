# System Architecture — Couple OS

## Overview

```
┌─────────────────────────┐
│   Android APK           │
│   (Kotlin + Compose)    │
│                         │
│   ┌─────────────────┐   │
│   │ Room Database   │   │
│   │ (Offline Data)  │   │
│   └────────┬────────┘   │
│            │             │
│   ┌────────▼────────┐   │
│   │ Sync Engine     │   │
│   └────────┬────────┘   │
│            │             │
│   ┌────────▼────────┐   │
│   │ Android Keystore│   │
│   │ (Token Storage) │   │
│   └────────┬────────┘   │
└────────────┼─────────────┘
             │ HTTPS
             ▼
┌─────────────────────────┐
│   Backend API           │
│   (Node.js + TypeScript)│
│                         │
│   ┌─────────────────┐   │
│   │ Auth Middleware  │   │
│   ├─────────────────┤   │
│   │ Couple Isolation │   │
│   ├─────────────────┤   │
│   │ REST API Routes │   │
│   ├─────────────────┤   │
│   │ WebSocket Server│   │
│   └────────┬────────┘   │
└────────────┼─────────────┘
             │
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
┌───────┐ ┌────┐ ┌──────┐
│Postgre│ │Obj │ │GitHub│
│SQL    │ │Stor│ │Gist  │
│       │ │age │ │(Bkup)│
└───────┘ └────┘ └──────┘
```

## Key Principles

1. **Offline-First**: App works without internet
2. **Two-Person Only**: No multi-user, no public registration
3. **Privacy by Default**: Everything is private unless explicitly shared
4. **Server-Side Authorization**: All access control on backend
5. **Encrypted Storage**: Tokens in Android Keystore, backups encrypted
6. **GitHub = Backup Only**: Not primary database

## Data Flow

### Write Path
```
User Action → Local Room DB → Sync Queue → Backend API → PostgreSQL
```

### Read Path
```
UI ← ViewModel ← Repository ← Room DB (local first)
                              ↑
                    Background Sync ← Backend API
```

### Conflict Resolution
```
Local Change + Remote Change →
  Compare timestamps + versions →
    Latest version wins (with conflict log)
```
