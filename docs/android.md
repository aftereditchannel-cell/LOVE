# ساخت Android (APK / AAB) با Tauri v2

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
