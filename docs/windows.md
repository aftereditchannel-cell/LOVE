# ساخت Windows (EXE / MSI) با Tauri v2

## پیش‌نیاز
- Rust (rustup)
- Microsoft C++ Build Tools (یا Visual Studio با Desktop C++)
- WebView2 (روی ویندوز ۱۱ پیش‌فرض نصب است)

## مراحل
```bash
cd apps/desktop
npm install
npm run dev     # حالت توسعه با hot-reload فرانت‌اند
npm run build   # خروجی نهایی
# خروجی‌ها:
#  apps/desktop/src-tauri/target/release/bundle/nsis/*.exe
#  apps/desktop/src-tauri/target/release/bundle/msi/*.msi
```

## نکات
- `beforeBuildCommand` به‌صورت خودکار بیلد Production فرانت را می‌گیرد.
- برای امضای نصب‌کننده، گواهی Code-Signing را در CI تنظیم کن.
- آدرس API Production را در `tauri.conf.json` (بخش security/csp و env فرانت) قرار بده.
- هیچ Secret‌ای داخل EXE قرار نمی‌گیرد — Backend آدرس‌اش در env سرور تعریف می‌شود.
