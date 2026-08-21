#!/bin/bash

# CoupleOS Build Script
# This script builds the Android APK and AAB

set -e

echo "==================================="
echo "CoupleOS Android Build Script"
echo "==================================="
echo ""

# Check if JAVA_HOME is set
if [ -z "$JAVA_HOME" ]; then
    echo "❌ ERROR: JAVA_HOME is not set"
    echo "Please set JAVA_HOME to your JDK 17 installation"
    echo "Example: export JAVA_HOME=/usr/lib/jvm/java-17-openjdk"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" != "17" ]; then
    echo "❌ ERROR: Java 17 is required, found Java $JAVA_VERSION"
    exit 1
fi

echo "✓ Java 17 detected"

# Check if ANDROID_HOME is set
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo "❌ ERROR: ANDROID_HOME or ANDROID_SDK_ROOT is not set"
    echo "Please set ANDROID_HOME to your Android SDK installation"
    echo "Example: export ANDROID_HOME=/path/to/android/sdk"
    exit 1
fi

SDK_PATH=${ANDROID_HOME:-$ANDROID_SDK_ROOT}
echo "✓ Android SDK detected at: $SDK_PATH"

# Update local.properties with SDK path
if [ -f "local.properties" ]; then
    sed -i.bak "s|sdk.dir=.*|sdk.dir=$SDK_PATH|g" local.properties
    echo "✓ Updated local.properties with SDK path"
else
    echo "sdk.dir=$SDK_PATH" > local.properties
    echo "API_BASE_URL=https://api.coupleos.local" >> local.properties
    echo "✓ Created local.properties"
fi

# Generate keystore if it doesn't exist
if [ ! -f "coupleos-release.keystore" ]; then
    echo "Generating release keystore..."
    keytool -genkey -v \
        -keystore coupleos-release.keystore \
        -alias coupleos \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass coupleos2024 \
        -keypass coupleos2024 \
        -dname "CN=CoupleOS, OU=Mobile, O=CoupleOS, L=Tehran, ST=Tehran, C=IR"
    echo "✓ Release keystore generated"
fi

# Make gradlew executable
chmod +x gradlew

# Clean previous builds
echo ""
echo "Cleaning previous builds..."
./gradlew clean

# Build Release APK
echo ""
echo "Building Release APK..."
./gradlew assembleRelease

# Build AAB
echo ""
echo "Building Android App Bundle..."
./gradlew bundleRelease

# Copy artifacts to root
echo ""
echo "Copying build artifacts..."
mkdir -p ../releases
cp app/build/outputs/apk/release/app-release.apk ../releases/CoupleOS-v1.0.0.apk 2>/dev/null || true
cp app/build/outputs/bundle/release/app-release.aab ../releases/CoupleOS-v1.0.0.aab 2>/dev/null || true

echo ""
echo "==================================="
echo "Build Complete!"
echo "==================================="
echo ""
echo "APK: ../releases/CoupleOS-v1.0.0.apk"
echo "AAB: ../releases/CoupleOS-v1.0.0.aab"
echo ""
echo "To install on a device:"
echo "  adb install ../releases/CoupleOS-v1.0.0.apk"
echo ""
