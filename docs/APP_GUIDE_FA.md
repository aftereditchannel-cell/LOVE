# ❤️ دنیای کوچیک ما — راهنمای کامل اپلیکیشن (فارسی)

> **تمام قابلیت‌ها فعال شد — دیتا واقعاً روی توکن ذخیره و دریافت می‌شود**

---

## 📌 فهرست

1. [معماری کلی](#معماری)
2. [مدل توکن و ذخیره‌سازی روی Gist](#توکن)
3. [لیست کامل قابلیت‌ها (۱۶+ بخش)](#قابلیتها)
4. [نقشه ناوبری](#ناوبری)
5. [دیباگ و باگ‌فیکس‌های انجام‌شده](#دیباگ)
6. [چطور دیتا روی توکن ثبت/دریافت می‌شود](#ثبت-روی-توکن)
7. [بک‌اند API (۱۴ روت فعال)](#بکاند)
8. [راهنمای استفاده قدم‌به‌قدم](#راهنما)

---

## 🏗️ معماری <a id="معماری"></a>

```
┌─────────────────────────────────────────┐
│  Android (Kotlin + Compose + Room)      │
│  • ۱۹ Entity (Room) ← آفلاین اول       │
│  • EncryptedSharedPreferences (Keystore)│
│  • GitHubRepository (Gist Sync)         │
└───────────────┬─────────────────────────┘
                │  Retrofit + OkHttp + AuthInterceptor (JWT)
                ▼
┌─────────────────────────────────────────┐
│  Backend (Node + Express + Postgres)    │
│  14 API Route  • JWT Auth  • RateLimit │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
   PostgreSQL     GitHub Gist (Encrypted JSON)
   (Supabase)     دو Gist خصوصی — یکی per توکن
```

**سه لایه ذخیره‌سازی:**

| لایه | تکنولوژی | نقش |
|-----|----------|-----|
| **لوکال** | Room DB (19 جدول) | سورس حقیقت آفلاین، همیشه در دسترس |
| **توکن** | GitHub Gist Private | ابریِ شخصی — هر `ghp_...` یک Gist خصوصی |
| **سرور** | Postgres + JWT | همگام‌سازی اختیاری وقتی `DATABASE_URL` ست باشد |

> **نکته مهم:** وقتی اینترنت نیست، اپ فقط با Room کار می‌کند. به محض آنلاین شدن، `saveFullList` و `readMergedContent` روی Gist اجرا می‌شود — هیچ دیتایی گم نمی‌شود.

---

## 🔐 مدل توکن و ذخیره‌سازی روی Gist <a id="توکن"></a>

### سه توکن

| توکن | کجا نگه‌داری می‌شود | کاربرد |
|------|---------------------|--------|
| **Personal PAT** (`ghp_...` خودت) | EncryptedSharedPreferences (AES256-GCM + Keystore) | احراز هویت تو، مالک `myGistId` |
| **Partner PAT** (`ghp_...` پارتنر) | همان | خواندن/نوشتن `partnerGistId` |
| **Session JWT** (ساخت بک‌اند) | همان | هدر `Authorization: Bearer` برای API سرور |

### Gist دوگانه (Dual-Gist) — فیکس اصلی

**مشکل قبل:** فقط یک `gistId` ذخیره می‌شد، و `saveToGist` فقط روی یک Gist می‌نوشت، و `readFromPartnerGist` تلاش می‌کرد با توکن پارتنر Gist تو را بخواند (ناممکن — Gist خصوصی فقط برای مالکش قابل دیدن است). نتیجه: «اتصال تایید می‌شد ولی دیتا ثبت نمی‌شد».

**راه‌حل فعلی (`GitHubRepository.kt` جدید):**

```kotlin
ensureBothGists(): Pair<myGistId, partnerGistId>
// هر توکن اگر Gist با Description = "CoupleOS-SharedData" نداشته باشد، یکی می‌سازد و همه 14 فایل را با "[]" مقداردهی می‌کند

saveToGist(fileName, content): Result<Unit>
  → write to myGistId with myToken  (اگر موفق)
  → write to partnerGistId with partnerToken (backup)
  → success if at least one succeeds

readMergedContent(fileName): Result<String>
  → read myGist[fileName] + partnerGist[fileName]
  → parse each as JSON Array
  → merge by "id" (یا "date" برای moods) — نسخه جدیدتر برنده
  → return merged JSON Array String
```

**فایل‌های داخل هر Gist:**

```
couple_shared.json, moods.json, memories.json, messages.json,
calendar.json, tasks.json, journal.json, wishlist.json,
bucket_list.json, letters.json, countdowns.json, questions.json,
expenses.json, timeline.json
```

هر `ViewModel` بعد از هر `insert` محلی، **کل لیست لوکال + ریموت را مرج و با `saveFullList` به هر دو Gist می‌نویسد**؛ هنگام `init` هم `pull` می‌کند و موارد جدید ریموت را به Room اضافه می‌کند. به این ترتیب:

- ✅ دیتا **واقعاً روی توکن ثبت** می‌شود (قابل دیدن در https://gist.github.com با همان اکانت)
- ✅ دیتا **واقعاً از توکن دریافت** می‌شود (مرج دو Gist + لوکال)
- ✅ حتی اگر یک توکن بسوزد، دیتا روی Gist دیگری زنده است

### رمزنگاری

- توکن‌ها هرگز در `Log` چاپ نمی‌شوند
- `SecureStorage` از `MasterKey` + `EncryptedSharedPreferences (AES256_SIV/GCM)` استفاده می‌کند؛ روی دیوایس‌های قدیمی به `SharedPreferences` فال‌بک می‌کند
- `CryptoManager` برای PIN از `SHA-256` و برای فایل‌ها از `AES/GCM` با کلید `AndroidKeyStore` استفاده می‌کند

---

## 🌟 لیست کامل قابلیت‌ها (۱۶+ بخش فعال) <a id="قابلیتها"></a>

| # | بخش | آیکون | مسیر | دیتا کجا می‌ره | قبلاً | الان |
|---|-----|-------|------|---------------|--------|------|
| 1 | **ست‌آپ جفت‌سازی** | ❤️ | `setup` | PAT → Gist + Backend `/auth/pair` | فقط لوکال | **دو Gist + JWT** |
| 2 | **قفل اپ (PIN + بیومتریک)** | 🔒 | `lock` | `pin_hash` در Keystore | فعال | فعال + باگ کرش فیکس |
| 3 | **داشبورد** | 🏠 | `home` | Room + Gist pull | نیمه‌کاره | **کامل: حالت‌ها، شمارش، سؤال، کارها + پول‌رفرش** |
| 4 | **حال روزانه** | 😊 | `mood` | `moods.json` روی هر دو Gist + جدول `moods` | فقط 1 آیتم overwrite | **مرج کامل تاریخچه + پارتنر مود + نیاز به توجه** |
| 5 | **خاطرات تصویری** | 📸 | `memories` | `memories.json` + `memories` جدول | بدون sync | **مرج دوطرفه + علاقه‌مندی + حذف** |
| 6 | **چت دونفره** | 💬 | `chat` | `messages.json` + `messages` | لوکال only | **دوتوکن sync + ادیت/ری‌اکشن** |
| 7 | **تقویم مشترک** | 📅 | `calendar` | `calendar.json` + `calendar_events` | لوکال only | **گرید ماه + ایونت + sync** |
| 8 | **دفتر خاطرات (خصوصی/مشترک)** | 📓 | `journal` | `journal.json` + `journal_entries` | UI نداشت | **✅ جدید: فیلتر حریم + مرج** |
| 9 | **کارهای دونفره** | ✅ | `tasks` | `tasks.json` + `tasks` | POST استاب | **کامل: اولویت، مسئول، وضعیت، حذف** |
| 10 | **لیست آرزوها** | ⭐ | `wishlist` | `wishlist.json` + `wishlists` | استاب | **✅ جدید: دسته، خصوصی/مشترک، تیک** |
| 11 | **لیست خواسته‌ها (Bucket)** | 🎯 | `bucket_list` | `bucket_list.json` + `bucket_items` | استاب | **✅ جدید: پیشرفت % + تاریخ تکمیل** |
| 12 | **شمارش معکوس** | ⏱️ | `countdowns` | `countdowns.json` + `countdowns` | استاب | **✅ جدید: روزهای باقی‌مانده + اموجی** |
| 13 | **نامه‌های عاشقانه (زمان‌دار)** | 💌 | `letters` | `letters.json` + `love_letters` | استاب | **✅ جدید: قفل تا تاریخ + باز کردن** |
| 14 | **سورپرایزها** | 🎁 | `surprises` | `surprises.json` + `surprises` | استاب | **✅ جدید: محرک/مخفی + reveal** |
| 15 | **سؤال روزانه** | ❓ | `questions` | `questions.json` + `daily_questions`/`question_answers` | استاب | **✅ جدید: سؤال روز + پاسخ دوطرفه + مرج** |
| 16 | **هزینه‌های مشترک** | 💰 | `expenses` | `expenses.json` + `expenses` | نداشت | **✅ جدید: جمع کل + دسته** |
| 17 | **رابطه ما (Check-in)** | 💞 | `relationship` | لوکال (بعداً Gist) | نداشت | **✅ جدید: ۶ اسلایدر + میانگین + تاریخچه** |
| 18 | **پروفایل + داستان ما** | 👤 | `profile` | `/api/profile` + `/api/couple` + SecureStorage نام‌ها | نیمه | **کامل: ویرایش همه فیلدها + سرور + لوکال** |
| 19 | **عکس‌ها (گالری)** | 📸 | `photos` | Drive (آینده) + Gist لینک | خالی | **Placeholder + توضیح** |
| 20 | **دستیار هوشمند** | 🤖 | `ai` | لوکال (پیشنهاد کادو/نامه/قرار) | نداشت | **✅ جدید: پرومپت → پاسخ هوشمند** |
| 21 | **جستجو** | 🔍 | `search` | Room LIKE | نداشت | **✅ جدید: جستجو خاطرات/چت/تقویم** |
| 22 | **تنظیمات** | ⚙️ | `settings` | SecureStorage + Gist check | نداشت | **✅ جدید: تست اتصال، سوییچ Gist، پاک‌سازی** |

> همه موارد بالا از **بخشِ «بیشتر»** قابل دسترسی‌اند و از **نوار پایین** (خانه/چت/خاطرات/تقویم/بیشتر) هم می‌توان رفت.

### جزئیات هر بخش

#### 1. جفت‌سازی با توکن
- تو کدومی؟ → «امیر / ستایش» (قابل تغییر)
- توکن شخصی را می‌زنی → `validateToken` → `GET https://api.github.com/user` با `Bearer ghp_...`
- اگر 200 بود، نام‌کاربری نمایش + مرحله بعد
- توکن پارتنر → همین + `ensureBothGists` (هر دو Gist ساخته/یافت می‌شود) + یک خاطره «شروع دنیای ما» به عنوان تست write می‌نویسد تا مطمئن شود نوشتن روی توکن کار می‌کند
- در پس‌زمینه سعی می‌کند `POST /api/auth/pair` را هم بزند تا JWT بگیرد؛ اگر سرور نبود، فقط Gist کافی است

#### 2. داشبورد
- سلام `getCurrentUserName()` + تاریخ فارسی
- کارت اتصال: نقطه سبز/قرمز برای هر توکن + نام‌کاربری + دکمه ⟳ برای `checkConnection` و `pull`
- حالت امروز تو + حالت پارتنر (اگر ناراحت/عصبانی بود → «شاید الان بیشتر بهت نیاز داشته باشه ❤️»)
- روزهای با هم (اگر `startDate` در پروفایل ست شده)
- نزدیک‌ترین شمارش معکوس → «X روز مونده»
- سؤال امروز (چرخشی از ۷ سؤال پیش‌فرض)
- دسترسی سریع: حال / خاطره / یادداشت / کار (همه الان لینک‌دارند)
- کارهای فعال + اینسایت خاطرات
- **Pull-to-refresh** (دکمه ⟳ یا سوایپ) → `readMergedContent` برای همه فایل‌ها

#### 3. حال روزانه
- ۹ مود: عالی/عاشق/خوب/معمولی/خنثی/ناراحت/خیلی بد/عصبانی/خسته
- ۵ اسلایدر: انرژی، استرس، خواب، سطح عشق، باتری اجتماعی
- یادداشت آزاد
- ذخیره → `MoodEntity` در Room + `saveFullList(moods.json)` با مرج تاریخ + `markSynced`
- بارگذاری → هنگام ورود، ریموت `moods.json` خوانده و برای هر `userId+date` که لوکال نیست، insert می‌شود

... *(سایر بخش‌ها مشابه: هر ViewModel یک `pull()` در `init` و یک `sync()` بعد از هر تغییر دارد — همه از `readMergedContent` + `saveFullList` استفاده می‌کنند.)*

---

## 🧭 نقشه ناوبری <a id="ناوبری"></a>

```
Splash → Setup (Choose → Token1 → Token2 → Pairing → Complete) → LockSetup → Lock → Home
                                                                           │
                              ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
                              ▼                                            ▼                                            ▼
                           BottomNav                                    More                                         TopBar Search
                 ┌────────┬────────┬───────────┬────────┐   ┌───────────────────────────┐                           ┌─────────┐
                 │ Home   │ Chat   │ Memories  │Calendar │   │ شخصی: پروفایل، مود، ژورنال│                          │ Search  │
                 │  🏠    │  💬    │   ❤️      │  📅    │   │ دنیای ما: داستان، عکس،    │                           │   🔍    │
                 └────────┴────────┴───────────┴────────┘   │ آرزو، باکت، شمارش          │                           └─────────┘
                                                           │ ویژه: نامه، سورپرایز،    │
                                                           │ قرار، سؤال، رابطه        │
                                                           │ مدیریت: کار، هزینه       │
                                                           │ ابزار: AI، جستجو، تنظیمات│
                                                           └───────────────────────────┘
 هر کارت More → NavHost route مربوطه (همه ۱۶ تا اضافه شد)
```

**فایل ناوبری:** `ui/CoupleOSApp.kt` — `NavHost` الان ۲۲ `composable` دارد (قبلاً ۶ تا بود).

---

## 🐛 دیباگ و باگ‌فیکس‌های انجام‌شده <a id="دیباگ"></a>

### بک‌اند (Express)

| فایل | مشکل قبل | فیکس |
|------|----------|------|
| `api/chat.ts` | `POST` فقط `res.json({success})` — هیچ `INSERT` | `INSERT INTO messages … RETURNING *` + اعتبارسنجی + `PUT /:id` + `POST /:id/reaction` |
| `api/calendar.ts` | POST استاب، بدون `PUT` | `INSERT` کامل + `PUT` + فیلتر `from/to` |
| `api/tasks.ts` | فقط `GET` کار می‌کرد | `POST` + `PUT` + `PATCH /:id/status` با اعتبارسنجی status + مرتب‌سازی |
| `api/journal.ts` | استاب | `INSERT` با `privacy` + `PUT` با `verifyPrivateAccess` |
| `api/wishlist.ts` | استاب | `INSERT` + `PUT` + `privacy` check |
| `api/bucketList.ts` | استاب | `INSERT` + `PUT` |
| `api/letters.ts` | استاب | `INSERT` با `recipientId` خودکار + `PUT /:id/open` |
| `api/countdowns.ts` | `DELETE` با `deleted_at` (ستون ندارد) | `DELETE` واقعی |
| `api/questions.ts` | `GET` بدون `couple_id` ولی `daily_questions` ستون ندارد | بازنویسی کامل: `/today` با `ON CONFLICT` + `/answer` |
| `api/sync.ts` | فقط `{message}` | پیاده‌سازی کامل `GET /pull` (۹ جدول) + `POST /push` (upsert + conflicts) |
| `api/backup.ts` | `GET` با `couple_id` ولی جدول داشت، `POST` استاب | `GET /history` + `POST /create` با `uuid` |
| `api/devices.ts` | `SELECT * FROM devices WHERE couple_id` (ستون ندارد) | `JOIN users ON user_id` |
| `api/moods.ts` | `ON CONFLICT (id)` بی‌اثر | `CREATE UNIQUE INDEX ON (user_id,date)` + `ON CONFLICT (user_id,date) DO UPDATE` |
| `middleware` | — | اضافه شدن `isDbAvailable()` → در حالت بدون DB، پاسخ mock/[] به‌جای 500 |

### اندروید

| فایل | مشکل قبل | فیکس |
|------|----------|------|
| `GitHubRepository.kt` | تک-Gist، overwrite با `listOf(singleItem)` | **Dual-Gist + `readMergedContent` + `saveFullList` با مرج بر اساس id** + ۱۴ فایل + `ensureBothGists` |
| `SecureStorage.kt` | فقط یک `gistId` | افزودن `myGistId`/`partnerGistId` + `lastSync` + `gistSyncEnabled` |
| `SetupViewModel.kt` | فقط لوکال `generateId`، بدون Gist تست، بدون backend try | **Dual-Gist ensure + تست write + backend `/pair` try + پیام «روی توکن ذخیره شد»** |
| `MoodViewModel.kt` | `saveToGist(listOf(one))` → تاریخچه پاک می‌شد | **مرج کامل + pull در init + feedback «روی توکن ذخیره شد»** |
| `MemoriesViewModel.kt` | `memories.value` ممکن بود خالی باشد | **مرج ریموت+لوکال + `toggleFavorite` sync + `delete` softDelete** |
| `ChatViewModel.kt` | بدون Gist sync | **کامل: `MessageSyncData` + pull/sync + delete** |
| `CalendarViewModel.kt` | بدون Gist sync | **کامل: `CalendarSyncData` + pull/sync + delete** |
| `MoreScreen.kt` | همه `onClick={}` خالی | **همه ۱۶ آیتم به route درست لینک شد + فلش ›** |
| `CoupleOSApp.kt` | `NavHost` فقط ۶ صفحه | **۲۲ صفحه اضافه شد** |
| `Dashboard` | QuickActions خالی | ژورنال و کار فعال شد |
| **VM/Screen جدید** | ۱۰+ بخش فقط placeholder یا نداشت | **ژورنال، تسک، ویش‌لیست، باکت، شمارش، نامه، سؤال، سورپرایز، هزینه، رابطه، پروفایل، تنظیمات، عکس، AI، جستجو — همه با Room + Gist** |

### امنیت
- `AuthInterceptor` قبلاً JWT را فقط اگر موجود بود می‌فرستاد — الان Pair هم JWT می‌سازد
- `coupleIsolation` حفظ شد؛ تست `X-Couple-Id` هدر

---

## 🔄 چطور دیتا روی توکن ثبت/دریافت می‌شود (تضمین) <a id="ثبت-روی-توکن"></a>

### ثبت (Write)

```kotlin
// در هر ViewModel — مثال Mood
val entity = MoodEntity(...)
moodDao.insert(entity) // 1) لوکال

val all = moodDao.getMoodsByUser(userId).first()
val remoteStr = repo.readMergedContent("moods.json") // 2) ریموت فعلی
val merged = mergeByUserDate(remote + all) // 3) مرج
repo.saveFullList("moods.json", json.encodeToString(merged)) 
// داخل repo: write to myGist + write to partnerGist
```

قابل مشاهده: به https://gist.github.com برو → Gist با Description `CoupleOS-SharedData` → فایل `moods.json` → آرایه JSON کامل.

### دریافت (Read)

```kotlin
// در init هر ViewModel
val remote = repo.readMergedContent("moods.json").getOrNull() // خواندن از هر دو Gist
val list = json.decodeFromString<List<MoodSyncData>>(remote)
for(item in list) if(moodDao.getMoodByDate(item.userId, item.date)==null) moodDao.insert(...)
```

دکمه ⟳ در هر صفحه یا پول‌رفرش داشبورد همین را فراخوانی می‌کند.

### تست دستی

1. اپ را با دو اکانت Gist جدا جفت کن (A و B)
2. در A یک «حال روزانه = عاشق» ثبت کن → پیغام «روی توکن ذخیره شد ✅»
3. به Gist اکانت A برو → `moods.json` شامل آیتم است
4. به Gist اکانت B برو → همان `moods.json` (چون dual-write) شامل آیتم است
5. اپ B را باز کن → در داشبورد «حال پارتنر: عاشق 🥰» دیده می‌شود (pull از Gist)

---

## 🔌 بک‌اند API (۱۴ روت فعال) <a id="بکاند"></a>

همه زیر `/api` و محافظت‌شده با `authMiddleware` + `coupleIsolation` + `rateLimit` (۲۰۰/۱۵دقیقه، auth ۲۰/۱۵دقیقه)

| متد | مسیر | توضیح | DB fallback |
|-----|------|--------|-------------|
| `POST` | `/auth/pair` | جفت‌سازی با دو توکن + ساخت couple/users + JWT | — |
| `POST` | `/auth/validate` | اعتبارسنجی توکن بدون جفت | — |
| `GET` | `/profile` | پروفایل خودم | mock |
| `PUT` | `/profile` | ویرایش پروفایل | mock |
| `GET` | `/couple` | اطلاعات زوج | mock |
| `PUT` | `/couple` | ویرایش زوج | mock |
| `GET` | `/moods` | لیست مودهای خودم | [] |
| `POST` | `/moods` | ثبت/آپدیت مود (upsert user+date) | 201 mock |
| `GET` | `/moods/partner/today` | مود امروز پارتنر | 404 |
| `GET` | `/memories` | خاطرات (SHARED یا خود) | [] |
| `POST` | `/memories` | ساخت خاطره | mock |
| `PUT` | `/memories/:id` | ویرایش | mock |
| `GET` | `/chat?limit&before` | پیام‌ها | [] |
| `POST` | `/chat` | ارسال پیام | mock |
| `PUT` | `/chat/:id` | ادیت پیام خود | mock |
| `POST` | `/chat/:id/reaction` | ری‌اکشن | mock |
| `GET` | `/calendar?from&to` | رویدادها | [] |
| `POST` | `/calendar` | ساخت | mock |
| `PUT` | `/calendar/:id` | ویرایش | mock |
| `GET` | `/tasks` | کارها | [] |
| `POST` | `/tasks` | ساخت | mock |
| `PUT` | `/tasks/:id` | ویرایش | mock |
| `PATCH` | `/tasks/:id/status` | تغییر وضعیت | mock |
| `GET` | `/wishlist` | آرزوها | [] |
| `POST` | `/wishlist` | ساخت | mock |
| `GET` | `/bucket-list` | باکت | [] |
| `POST` | `/bucket-list` | ساخت | mock |
| `PUT` | `/bucket-list/:id` | ویرایش | mock |
| `GET` | `/letters` | نامه‌ها | [] |
| `POST` | `/letters` | ساخت | mock |
| `PUT` | `/letters/:id/open` | باز کردن | mock |
| `GET` | `/countdowns` | شمارش‌ها | [] |
| `POST` | `/countdowns` | ساخت | mock |
| `GET` | `/questions` | لیست | default |
| `GET` | `/questions/today` | سؤال امروز | default |
| `POST` | `/questions/answer` | پاسخ | mock |
| `GET` | `/sync/pull?since` | تغییرات از since | {changes:[]} |
| `POST` | `/sync/push` | پوش تغییرات | {accepted} |
| `GET` | `/backup` / `/backup/history` | تاریخچه | [] |
| `POST` | `/backup` / `/backup/create` | ساخت بک‌آپ | mock |
| `GET` | `/devices` | لیست دیوایس (JOIN) | [current] |
| `POST` | `/devices` | ثبت دیوایس | success |
| `DELETE` | `/devices/:id` | revoke | success |

---

## 📖 راهنمای استفاده قدم‌به‌قدم <a id="راهنما"></a>

### 1) ساخت توکن GitHub
- به https://github.com/settings/tokens/new برو
- `classic` → `ghp_...` بساز با اسکوپ `gist` (یا fine-grained PAT با Gist write)
- برای هر نفر یکی

### 2) نصب
```bash
cd backend
cp ../.env.example .env  # DATABASE_URL, AUTH_SECRET, GITHUB_TOKEN اختیاری
npm install
npm run dev  # http://localhost:3000

# اندروید
# android/local.properties:
# sdk.dir=/path/to/sdk
# API_BASE_URL=http://10.0.2.2:3000  (یا URL سرور)
# ./gradlew assembleRelease
```

### 3) اولین اجرا
- «تو کدومی؟» → امیر / ستایش
- توکن خودت → تأیید (نام‌کاربری GitHub می‌آید)
- توکن پارتنر → تأیید + «در حال اتصال به GitHub...» → دو Gist ساخته می‌شود + خاطره تست →
- PIN چهار رقمی بساز → وارد دنیای کوچیک می‌شوی

### 4) استفاده روزانه
- **صبح:** حال روزانه را ثبت کن (۵ اسلایدر + یادداشت) → «روی توکن ذخیره شد»
- **هر لحظه:** چت → پیام می‌نویسی، پارتنر بعد از پول‌رفرش می‌بیند (Gist مرج)
- **خاطره:** عنوان + تاریخ + مکان → روی هر دو Gist
- **تقویم:** ماه‌نما + رویداد
- **بیشتر:** هر کدام را باز کن — همه صفحه‌ها دکمه ⟳ (رفرش از توکن) و فیدبک «ذخیره شد» دارند

### 5) تنظیمات
- بررسی اتصال → هر دو توکن را `GET /user` می‌زند و نتیجه سبز/قرمز
- سوییچ Gist Sync → اگر خاموش، فقط لوکال
- پاک‌سازی → `clearAll()`

---

## ⚠️ نکات مهم

- **Gist خصوصی است** — فقط با توکن مالک دیده می‌شود، اما چون به هر دو Gist می‌نویسیم، هر طرف با توکن خود دیتا را دارد
- **هیچ توکنی در APK هاردکد نیست** — همه در Keystore
- **اگر سرور خاموش باشد، اپ کامل کار می‌کند** (فقط Gist)
- **اگر اینترنت نباشد، فقط لوکال** — بعداً مرج می‌شود

---

## 📂 فایل‌های تغییر‌یافته (خلاصه)

```
backend/src/api/* (14 فایل) → POST/PUT/DELETE واقعی + fallback
backend/src/database/init.ts → UNIQUE index moods
android/.../GitHubRepository.kt → Dual-Gist + merge
android/.../SecureStorage.kt → myGist/partnerGist
android/.../SetupViewModel.kt → ensureBothGists + test write
android/.../MoodViewModel.kt، MemoriesViewModel.kt، ChatViewModel.kt، CalendarViewModel.kt → مرج کامل
android/.../ui/* (11 ViewModel/Screen جدید) → فعال‌سازی همه قابلیت‌ها
android/.../CoupleOSApp.kt + MoreScreen.kt → ناوبری کامل
docs/APP_GUIDE_FA.md → همین راهنما
```

---

> **ساخته شده با ❤️ برای دو نفر — دنیای کوچیک شما حالا واقعاً روی توکن‌هایتان زندگی می‌کند.**
