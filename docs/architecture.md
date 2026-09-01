# معماری Couple OS

```
┌──────────────────────────── Clients ─────────────────────────────┐
│  Web (PWA)     Android APK/AAB (Tauri)     Windows EXE (Tauri)   │
│  React+TS/Tailwind/Framer — همان کدبیس برای هر سه                │
└──────────────┬───────────────────────────────────────┬───────────┘
               │ HTTPS /api (cookies + CSRF)           │
┌──────────────▼───────────────────────────────────────▼───────────┐
│                       Backend (Node/Express/TS)                  │
│  Auth(JWT+refresh+2FA) │ Couple Authorization │ Rate-limit/CORS  │
│      ┌─────────────────┴───────────────────────┐                 │
│      │ Encryption Layer (AES-256-GCM)          │                 │
│      │ journal/letters/chat/period/backup      │                 │
│      └───────┬───────────────────────┬─────────┘                 │
│   DB (SQLite dev / PostgreSQL prod)   Object Storage (S3/local)  │
│      ۳۰ جدول: FK + Index + Soft-delete                           │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Manual / Debounced auto backup
                 Data → Serialize → Encrypt → GitHub Gist (secret)
```

## اصول
- **کلیدها فقط سمت سرور** (env): AUTH_SECRET, BACKUP_ENCRYPTION_KEY, COUPLE_OS_GITHUB_TOKEN.
- **Couple Authorization سرور-side**: شناسه‌ی Couple همیشه از عضویت کاربر خوانده می‌شود، نه از ورودی کاربر.
- **فایل‌ها در Object Storage**؛ دیتابیس فقط metadata نگه می‌دارد.
- **بکاپ همیشه قبل از خروج رمز می‌شود**؛ Gist فقط متن رمزشده را می‌بیند.
- **Outbox آفلاین** سمت کلاینت + debounce سمت سرور برای مصرف کم GitHub API.
