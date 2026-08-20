<div dir="rtl">

# Couple OS ❤️

> **«دنیای کوچیک دوتایی ما»** — فضای خصوصی، زیبا و کاملاً شخصی برای مدیریت زندگی، رابطه، خاطرات و ارتباط دونفره.

چیزی بین Couple App + Private Journal + Dashboard رابطه + تقویم مشترک + Mood Tracker + Memory Vault + چت خصوصی + Planner + دستیار دونفره.

![stack](https://img.shields.io/badge/stack-React%2018%20%2B%20TS%20%2B%20Tailwind%20%2B%20Express%20%2B%20SQLite%2FPG-8b5cf6)
![pwa](https://img.shields.io/badge/PWA-ready-ec4899) ![tests](https://img.shields.io/badge/tests-24%20passing-4ade80)

---

## ⚠️ قبل از هر چیز — قانون امنیتی طلایی

**هیچ Secret (GitHub Token / کلید رمزنگاری / AUTH_SECRET) هرگز داخل این کد، Frontend، APK، EXE، Git یا Gist قرار نمی‌گیرد.**

- همه‌ی Secretها فقط در Environment Variable **سمت Backend** خوانده می‌شوند (`apps/api/.env` که در `.gitignore` است).
- **اگر توکنی را جایی (چت/ایمیل/کد) paste کرده‌ای، آن توکن «افشاشده» است** — فوراً آن را در GitHub → Settings → Developer settings → Personal access tokens **Revoke** کن و توکن جدید بساز. این پروژه با هیچ توکن افشاشده‌ای کار نمی‌کند.
- نام متغیر توکن عمداً `COUPLE_OS_GITHUB_TOKEN` است تا با توکن‌های محیطی/بیلد (مثل `GITHUB_TOKEN` رایج CI) اشتباه گرفته نشود.

---

## 🚀 شروع سریع (Dev)

```bash
npm install          # نصب همه‌ی workspaceها
npm run setup        # ساخت .env با Secretهای تصادفی + seed دیتابیس
npm run dev          # اجرای هم‌زمان API (:4000) و Web (:5173)
```

- **Web:** http://localhost:5173 (پروکسی `/api` → بک‌اند)
- **API:** http://localhost:4000
- داده‌ی دمو (مشخصاً با برچسب «(دمو)»): کاربران `arman@demo.local` / `niloofar@demo.local` با رمز `Demo1234!` — در Production حتماً `SEED_DEMO=false`.

اجرای تست‌ها:

```bash
npm test             # 24 تست: Auth، 2FA، CSRF، Rate-limit، ایزوله‌سازی Coupleها، Backup/Restore، رمزنگاری، آپلود
```

---

## 🧩 معماری

`docs/architecture.md` را ببین. خلاصه:

| لایه | تکنولوژی |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind + Framer Motion + Lucide (RTL کامل، فارسی، فونت Vazirmatn) |
| Backend | Node + Express + TypeScript (REST API) |
| Database | **Dev:** SQLite (`node:sqlite`، بدون وابستگی native) — **Prod:** PostgreSQL (آداپتور آماده + `docker-compose`) |
| Storage | دیسک محلی (dev) / هر S3-compatible (Supabase Storage, MinIO, S3) — فایل‌ها در DB ذخیره نمی‌شوند |
| Auth | کوکی HttpOnly + Access/Refresh Token + چرخش نشست + **2FA واقعی (TOTP)** + bcrypt |
| Backup | GitHub Gist خصوصی، **رمزنگاری‌شده و نسخه‌دار** (AES-256-GCM) با صف Debounce |
| Native | **Tauri v2** → Android APK/AAB + Windows EXE/MSI (دلیل انتخاب: `docs/android.md`) |

ساختار پوشه‌ها:

```
apps/
  api/        Backend Express (src/routes, src/services, src/db, tests)
  web/        فرانت React (src/pages ×36 صفحه، layout، ui، offline outbox)
  desktop/    شل نیتیو Tauri (Windows/Android)
docs/           معماری + راهنمای بیلد اندروید/ویندوز
scripts/        setup.mjs / dev.mjs
```

---

## 🔐 Environment Variables

فایل `.env.example` نمونه است؛ مقادیر واقعی در `apps/api/.env` (تولیدشده توسط `npm run setup` — هرگز commit نمی‌شود).

| متغیر | کاربرد |
|---|---|
| `DATABASE_URL` | `file:./dev.db` (dev) یا `postgresql://user:pass@host:5432/coupleos` (prod) |
| `AUTH_SECRET` | امضای JWT/سشن‌ها — تصادفی ۶۴ کاراکتری |
| `BACKUP_ENCRYPTION_KEY` | کلید رمزنگاری فیلدها + بکاپ (AES-256-GCM / scrypt) — **هیچ‌وقت جایی کپی نمی‌شود** |
| `COUPLE_OS_GITHUB_TOKEN` | توکن Gist فقط سمت سرور — از مرورگر دوری می‌کند |
| `GITHUB_GIST_ID` | اختیاری؛ اگر خالی باشد اولین بکاپ یک Secret Gist جدید می‌سازد |
| `PORT` / `WEB_ORIGIN` | پورت API و اوریجن مجاز CORS |
| `STORAGE_*` | اتصال S3-compatible در Production (خالی = دیسک محلی dev) |
| `MAIL_*` | SMTP برای تأیید ایمیل/فراموشی رمز (خالی = لینک‌ها در لاگ سرور چاپ می‌شوند — dev) |
| `SEED_DEMO` | ساخت داده‌ی دمو (`true` فقط برای dev) |

---

## ☁️ راه‌اندازی بکاپ GitHub Gist

1. توکن قدیمی/افشاشده را **Revoke** کن (مهم!).
2. روی https://github.com/settings/tokens → **Generate new token (classic)** بزن.
3. **فقط scope = `gist`** بده (دسترسی بیشتر لازم نیست).
4. در `apps/api/.env` بگذار: `COUPLE_OS_GITHUB_TOKEN="ghp_..."` و سرور را ری‌استارت کن.
5. از صفحه‌ی **تنظیمات → بکاپ** دکمه‌ی «بکاپ دستی» را بزن یا «بکاپ خودکار» را روشن کن.

جریان داده:

```
دیتابیس → Serialize (JSON ماژول‌به‌ماژول) → Encrypt(AES-256-GCM)
        → GitHub API → Secret Gist: couple-os/backup_v<N>.enc.json (+ manifest.json نسخه‌ها)
```

- **Versioned**: هر بکاپ نسخه‌ی جدید است؛ نگهداری پیش‌فرض ۱۰ نسخه (`couple_settings.keep_versions`).
- **Restore**: انتخاب نسخه → دانلود → Decrypt → Validate → جایگزینی تراکنشی داده‌های Couple.
- **هرگز** در بکاپ نمی‌آیند: رمزها، سشن‌ها، توکن‌ها، پین قفل، کلید رمزنگاری، TOTP secret. (تست خودکار: `secrets never enter the backup payload`)
- **Debounce**: تغییرات ۳۰–۶۰ ثانیه دسته‌بندی و سپس یک بکاپ خودکار (مصرف کم GitHub API).

---

## 🗄️ دیتابیس

- **Dev (پیش‌فرض):** SQLite در `apps/api/dev.db` — اسکیما هنگام بوت اعمال می‌شود.
- **Production:** PostgreSQL (یا Supabase):

```bash
docker compose up -d db
DATABASE_URL="postgresql://couple:pass@localhost:5432/coupleos" npm run start -w couple-os-api
```

اسکیما ۳۰ جدول با FK، Index، Timestamp و Soft‌-delete است: `users, couples, couple_members, profiles, moods, period_cycles, period_symptoms, journal_entries, memories, memory_media, albums, photos, messages, message_attachments, message_reactions, calendar_events, tasks, wishlist_items, bucket_items, expenses, love_letters, daily_questions, question_answers, love_languages, relationship_checkins, countdowns, notifications, compliments, story_chapters, backup_jobs, backup_versions, user_sessions, audit_logs, user_settings, couple_settings`.

---

## 🛡️ مدل امنیتی (پیاده‌سازی‌شده)

- **Couple Authorization سرور-side**: هیچ APIای coupleId را از کلاینت نمی‌گیرد؛ Membership از DB خوانده می‌شود ⇒ کاربر دیگری با تغییر ID به داده‌ی شما نمی‌رسد (تست‌شده: `couple B can never read couple A data`).
- Password Hashing (bcrypt ×12) • Session Rotation • Revoke دستگاه‌ها
- **2FA TOTP واقعی** (RFC 6238، بدون وابستگی خارجی — تست با بردارهای RFC)
- **CSRF**: Double-submit cookie + چک Origin/Sec-Fetch-Site برای همه‌ی mutationها
- **Rate Limiting** روی لاگین/ثبت‌نام/آپلود/بکاپ/Export
- Helmet (XSS/Clickjacking/nosniff) • CORS با اوریجن مجاز • کوکی‌های HttpOnly/SameSite=Lax
- **File Upload**: Allowlist MIME، سقف حجم ۲۵MB، path-traversal safe، سرو فایل فقط با احراز هویت و فقط اعضای همان Couple
- **Audit Logs** برای رویدادهای حساس • Soft-delete + خروجی کامل داده‌ها (Export) + حذف حساب/فضا
- اعتبارسنجی ورودی با Zod روی تمام endpointها • تمام کوئری‌ها Parameterized (ضد SQLi)
- **رمزنگاری فیلدهای حساس** (journal/chat/نامه/period notes) با کلید سرور
- قفل اپ با PIN (فقط هش bcrypt روی سرور؛ Auto-lock با بی‌فعالی) — آماده برای افزودن Biometric در نسخه‌ی نیتیو

---

## 📱 PWA

- `manifest.webmanifest` + Service Worker آفلاین‌محور (cache-first شل، network-first API، بدون کش mutationها)
- Install Prompt در «تنظیمات → فضای ذخیره‌سازی»
- **PWA تنها خروجی نیست** — شل‌های نیتیو Tauri با همان Backend: `docs/android.md` و `docs/windows.md`

---

## 🌐 APIها

`/api/auth /api/couple /api/profile /api/moods /api/period /api/journal /api/memories /api/photos /api/albums /api/files /api/chat /api/calendar /api/countdowns /api/tasks /api/wishlist /api/bucket-list /api/expenses /api/love-letters /api/questions /api/love-language /api/relationship /api/compliments /api/story /api/notifications /api/search /api/dashboard /api/date-planner /api/ai /api/backup /api/settings /api/export /api/health`

نام پروژه: **Couple OS** و لوگوی Placeholder از آدرس مرکزی `/assets/brand/logo.svg` خوانده می‌شود — با جایگزین‌کردن همان یک فایل، لوگوی کل اپ (وب + PWA + آیکون‌ها) عوض می‌شود.

---

## ✅ چک‌لیست قابلیت‌ها

**کامل و کاربردی (تست‌شده):**
احراز هویت کامل (ثبت‌نام/ورود/خروج/Refresh/Reset رمز/تأیید ایمیل/2FA TOTP/مدیریت نشست‌ها) • Onboarding ساخت فضای دونفره با کد دعوت • Dashboard با چک‌این حال • سیستم Mood کامل (۹ حال + ۵ شاخص + آرزوی حمایت + نمودار دونفره) • چت خصوصی (متن/فایل/Reply/Reaction/Pin/Edit/Delete/Typing/Seen) • Journal رمزنگاری‌شده با دید private/shared • Memories با Grid/Timeline/Polaroid + مدیا • Photos + Albums + Favorites • تقویم دونفره ماهانه • Countdown • Wishlist • Bucket List با Progress • Tasks با Assign/Priority • Expenses با محاسبه‌ی بدهی • Love Letters با مُهر زمانی • سؤال روزانه با قانون «تا جواب ندی، جوابش فاش نمی‌شه» • زبان عشق + پیشنهاد عمل • Relationship Health (۶ محور + روند) • قدردانی/تعریف • داستان ما (۷ فصل) • Period/PMS Tracker خصوصی، رمزنگاری‌شده با پیش‌بینی تقریبی (**بدون ادعای پزشکی**) • دستیار دونفره (سروور-ساید، بدون سرویس خارجی، **بدون ادعای درمانی**) • Notification Center + یادآوری‌های زنده (تولد/سالگرد/PMS/…) • جستجوی سراسری • Export کامل JSON • Privacy/Security Center • بکاپ Gist نسخه‌دار رمزنگاری‌شده + بازیابی + تاریخچه • صف آفلاین (Outbox) + PWA + SW • RTL فارسی کامل + تم dark/light/system • Empty Stateها و Toastهای فارسی • Responsive واقعی (BottomNav موبایل / Sidebar دسکتاپ / FAB) • ۲۴ تست خودکار سبز.

**نیازمند تنظیم Environment (کد آماده است، فقط ENV می‌خواهد):**
1. `COUPLE_OS_GITHUB_TOKEN` → فعال‌شدن بکاپ واقعی روی Gist.
2. `MAIL_*` → ارسال واقعی ایمیل (بدون آن لینک‌ها در لاگ سرور چاپ می‌شوند).
3. `STORAGE_*` → آپلود روی S3 در Production (پیش‌فرض dev دیسک محلی است).
4. `DATABASE_URL=postgresql://…` → سوئیچ به Postgres برای Production.
5. بیلد APK/EXE → پیش‌نیازهای `docs/android.md` / `docs/windows.md` (Rust/SDK) — روی دستگاه خودت.

**نکته‌ی سلامت:** بخش‌های Period/PMS و Relationship صرفاً ابزار پیگیری/خودارزیابی‌اند و هیچ‌گونه ادعای تشخیص پزشکی یا روان‌شناختی ندارند.

---

## 📜 لایسنس

خصوصی — برای شما دو نفر ساخته شده ❤️

</div>
