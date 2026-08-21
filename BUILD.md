# Building CoupleOS (دنیای کوچیک ما) Android APK

This guide will help you build the CoupleOS Android application from source.

## Prerequisites

Before building, ensure you have the following installed:

1. **JDK 17** (Java Development Kit)
   - Download from: https://adoptium.net/ or use your package manager
   - Verify: `java -version` should show version 17

2. **Android SDK**
   - Install Android Studio or download command-line tools from: https://developer.android.com/studio
   - Required SDK components:
     - Android SDK Platform 34
     - Android SDK Build-Tools 34.0.0
     - Android SDK Platform-Tools
   - Set environment variable: `export ANDROID_HOME=/path/to/android/sdk`

3. **Gradle** (optional - wrapper will be used)
   - The project includes a Gradle wrapper, so you don't need to install Gradle separately

## Quick Build (Automated)

Run the automated build script:

```bash
cd android
./build.sh
```

This will:
- Verify Java and Android SDK installation
- Generate a release keystore (if not exists)
- Clean previous builds
- Build Release APK
- Build Android App Bundle (AAB)
- Copy artifacts to `releases/` directory

## Manual Build

### 1. Configure Local Properties

Create or update `android/local.properties`:

```properties
sdk.dir=/path/to/your/android/sdk
API_BASE_URL=https://api.coupleos.local
```

### 2. Configure Keystore (Optional)

The build script will auto-generate a keystore. To create manually:

```bash
cd android
keytool -genkey -v \
  -keystore coupleos-release.keystore \
  -alias coupleos \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Update `keystore.properties` with your keystore details.

### 3. Build Release APK

```bash
cd android
./gradlew clean assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

### 4. Build AAB (Google Play format)

```bash
cd android
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### 5. Build Debug APK (for testing)

```bash
cd android
./gradlew assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

## Installing the APK

### On a physical device:

```bash
adb install releases/CoupleOS-v1.0.0.apk
```

Or transfer the APK to your device and install manually.

### On an emulator:

1. Start Android emulator
2. Drag and drop the APK onto the emulator window
3. Or use: `adb install releases/CoupleOS-v1.0.0.apk`

## First Launch

1. Open the app → Splash screen appears
2. **"تو کدومی؟"** → Select your identity (امیر or ستایش)
3. Enter your personal GitHub token (ghp_...)
4. Enter your partner's GitHub token (ghp_...)
5. Device pairing completes
6. Set up PIN lock
7. Dashboard ready ❤️

## Backend Setup

The app requires a backend server. See `backend/README.md` for setup instructions.

Update `API_BASE_URL` in `local.properties` to point to your backend:
- Local development: `http://10.0.2.2:3000` (emulator) or `http://YOUR_IP:3000` (device)
- Production: `https://your-backend-domain.com`

## Troubleshooting

### Build fails with "JAVA_HOME is not set"

```bash
export JAVA_HOME=/path/to/jdk17
export PATH=$JAVA_HOME/bin:$PATH
```

### Build fails with "SDK location not found"

Update `local.properties` with correct SDK path:
```properties
sdk.dir=/path/to/android/sdk
```

### Gradle wrapper not found

```bash
cd android
gradle wrapper --gradle-version 8.7
```

### Keystore errors

Delete existing keystore and regenerate:
```bash
rm coupleos-release.keystore
./build.sh
```

### Out of memory during build

Increase Gradle memory in `gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m
```

## Project Structure

```
LOVE/
├── android/              # Android app (Kotlin + Compose)
│   ├── app/
│   │   └── src/main/
│   │       ├── java/com/coupleos/app/
│   │       │   ├── core/        # DI, utilities
│   │       │   ├── data/        # Room DB, API, repositories
│   │       │   ├── domain/      # Models, use cases
│   │       │   ├── ui/          # Compose screens
│   │       │   ├── security/    # Keystore, crypto
│   │       │   ├── sync/        # Offline sync engine
│   │       │   └── network/     # Interceptors
│   │       └── res/             # Resources
│   ├── build.gradle.kts
│   └── build.sh
├── backend/              # API server (Node.js + TypeScript)
├── assets/              # Brand assets
├── docs/                # Documentation
└── README.md
```

## Build Artifacts

After a successful build, you'll find:

- **APK**: `releases/CoupleOS-v1.0.0.apk` - Installable Android package
- **AAB**: `releases/CoupleOS-v1.0.0.aab` - Google Play format

## Security Notes

- Never commit `keystore.properties` or `local.properties` to version control
- Never hardcode GitHub tokens in the source code
- The release keystore should be backed up securely
- Use different keystores for debug and release builds

## Support

For issues or questions:
- Check the documentation in `docs/`
- Review the backend setup in `backend/README.md`
- Ensure all prerequisites are correctly installed

## License

See LICENSE file for details.
