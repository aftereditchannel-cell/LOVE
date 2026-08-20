# ساخت Android (APK / AAB)

## روش ۱ — APK فوری بدون Android SDK (همان چیزی که در مخزن بیلد می‌شود)

مسیر سبک و مستقل از گوگل/Gradle که در همین ریپو خودکار شده: یک شل نیتیو WebView
(`apps/apk/src/.../MainActivity.java`) که وب‌اپ را بالا می‌آورد؛ با Toolchainی که
فقط از npm و PyPI گرفته می‌شود (بدون dl.google.com):

```bash
npm run build:apk
# خروجی: release/CoupleOS-<version>-debug.apk  (امضای v1/v2/v3 با کلید debug)
```

ابزارها (در اولین اجرا دانلود و در `apps/apk/.toolchain` کش می‌شوند — gitignored):
aapt2 (از پکیج npm aaptjs3)، android.jar / ECJ / D8 / apksigner / debug.keystore
(از پکیج npm ‎@drxiaozhi/minapk، پوشه‌ی tools)، و ران‌تایم جاوا (از ویل PyPI jdk4py
= Temurin JRE). گام‌ها: کامپایل ریسورس → لینک → ECJ → D8 → تزریق classes.dex → امضا.

آدرس وب‌اپ با env قابل‌تغییر است (بدون کامپایل مجدد جاوا — داخل assets/config.txt می‌نشیند):

```bash
COUPLE_OS_APK_URL="https://your-domain.example" npm run build:apk
```

> نکته: این APK «پوسته‌ی وب‌به‌نیتیو» است و برای استفاده‌ی واقعی به یک بک‌اند دیپلوی‌شده
> نیاز دارد. برای انتشار فروشگاهی (AAB، کلید release، آفلاین‌باندل) روش ۲ پیشنهاد می‌شود.
> نصب روی گوشی: فایل را باز کن و «Install unknown apps» را اجازه بده (کلید debug).

## روش ۲ — ساخت فروشگاهی با Tauri v2 (APK / AAB)

## چرا Tauri؟
- **یک کدبیس واقعی**: همان React/TS فرانت‌اند + همان Backend؛ بدون بازنویسی.
- **حجم خروجی کوچیک** (نسبت به Electron) چون از WebView نیتیو سیستم استفاده می‌کند.
- **هر دو هدف — اندروید و ویندوز — از یک پروژه** (بخش `docs/windows.md`).
- دسترسی به APIهای نیتیو (اعلان، فایل، کلیپ‌بورد) با Pluginها؛ **روی WebView ساده نیست** — یک شل نیتیو واقعی با Rust.

## پیش‌نیاز
1. Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Android Studio + SDK + NDK (و Java 17)
3. متغیرها: `ANDROID_HOME`, `NDK_HOME`
4. نصب CLI: `cd apps/desktop && npm install`

## مراحل
```bash
# یک‌بار
npm run android:init -w couple-os-desktop
# توسعه روی دستگاه/امولاتور
npm run android:dev -w couple-os-desktop
# خروجی نهایی
npm run android:build -w couple-os-desktop
# خروجی‌ها:
#  apps/desktop/src-tauri/gen/android/app/build/outputs/apk/... (.apk)
#  apps/desktop/src-tauri/gen/android/app/build/outputs/bundle/... (.aab)
```

## نکات Production
- آدرس API را در `tauri.conf.json` → `connect-src` و در کد تنظیم کن (به‌جای localhost از دامنه‌ی HTTPS سرورت).
- برای گوگل‌پلی از `.aab` استفاده کن؛ امضا را با keystore خودت انجام بده.
- ایمیل/توکن/کلید **هیچ‌کدام** داخل باندل APK قرار نمی‌گیرند — Secretها فقط سمت سرورند.
