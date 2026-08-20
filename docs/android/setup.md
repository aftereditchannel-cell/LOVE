# Android Setup Guide

## Requirements
- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17
- Android SDK 34
- Kotlin 1.9.24
- Gradle 8.7

## Setup Steps

### 1. Open Project
Open the `android/` directory in Android Studio.

### 2. Local Properties
Create `android/local.properties`:
```properties
sdk.dir=/Users/you/Library/Android/sdk
API_BASE_URL=http://10.0.2.2:3000
```

### 3. Fonts
Download Vazirmatn from https://github.com/rastikerdar/vazirmatn/releases
Place these files in `android/app/src/main/res/font/`:
- `vazirmatn_regular.ttf`
- `vazirmatn_medium.ttf`
- `vazirmatn_bold.ttf`
- `vazirmatn_light.ttf`

### 4. Build Debug
```bash
./gradlew assembleDebug
```

### 5. Build Release
Create `android/keystore.properties`:
```properties
storeFile=path/to/your.keystore
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

```bash
./gradlew assembleRelease
```

### 6. Build AAB
```bash
./gradlew bundleRelease
```

## Configuration

| Setting | Value |
|---------|-------|
| Application ID | `com.coupleos.app` |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 34 (Android 14) |
| Version | 1.0.0 |
| App Name | دنیای کوچیک ما |
