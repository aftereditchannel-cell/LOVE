#!/bin/bash

# CoupleOS Pre-Build Verification Script
# This script checks if all prerequisites are met before building

echo "==================================="
echo "CoupleOS Pre-Build Verification"
echo "==================================="
echo ""

ERRORS=0

# Check Java
echo "1. Checking Java..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
    echo "   ✓ Java found: $JAVA_VERSION"
    
    JAVA_MAJOR=$(echo $JAVA_VERSION | cut -d'.' -f1)
    if [ "$JAVA_MAJOR" = "17" ]; then
        echo "   ✓ Java 17 detected"
    else
        echo "   ⚠ Warning: Java 17 recommended, found $JAVA_VERSION"
    fi
else
    echo "   ❌ ERROR: Java not found"
    ERRORS=$((ERRORS + 1))
fi

# Check JAVA_HOME
echo ""
echo "2. Checking JAVA_HOME..."
if [ -n "$JAVA_HOME" ]; then
    echo "   ✓ JAVA_HOME is set: $JAVA_HOME"
    if [ -d "$JAVA_HOME" ]; then
        echo "   ✓ JAVA_HOME directory exists"
    else
        echo "   ❌ ERROR: JAVA_HOME directory does not exist"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "   ⚠ Warning: JAVA_HOME not set (will try to use java from PATH)"
fi

# Check Android SDK
echo ""
echo "3. Checking Android SDK..."
SDK_PATH=""
if [ -n "$ANDROID_HOME" ]; then
    SDK_PATH="$ANDROID_HOME"
    echo "   ✓ ANDROID_HOME is set: $ANDROID_HOME"
elif [ -n "$ANDROID_SDK_ROOT" ]; then
    SDK_PATH="$ANDROID_SDK_ROOT"
    echo "   ✓ ANDROID_SDK_ROOT is set: $ANDROID_SDK_ROOT"
else
    echo "   ❌ ERROR: Neither ANDROID_HOME nor ANDROID_SDK_ROOT is set"
    ERRORS=$((ERRORS + 1))
fi

if [ -n "$SDK_PATH" ]; then
    if [ -d "$SDK_PATH" ]; then
        echo "   ✓ SDK directory exists"
        
        # Check for required SDK components
        if [ -d "$SDK_PATH/platforms/android-34" ]; then
            echo "   ✓ Android SDK Platform 34 found"
        else
            echo "   ⚠ Warning: Android SDK Platform 34 not found"
        fi
        
        if [ -d "$SDK_PATH/build-tools" ]; then
            echo "   ✓ Build tools found"
        else
            echo "   ⚠ Warning: Build tools not found"
        fi
    else
        echo "   ❌ ERROR: SDK directory does not exist"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check project files
echo ""
echo "4. Checking project files..."
if [ -f "build.gradle.kts" ]; then
    echo "   ✓ build.gradle.kts found"
else
    echo "   ❌ ERROR: build.gradle.kts not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "app/build.gradle.kts" ]; then
    echo "   ✓ app/build.gradle.kts found"
else
    echo "   ❌ ERROR: app/build.gradle.kts not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "gradlew" ]; then
    echo "   ✓ gradlew found"
    if [ -x "gradlew" ]; then
        echo "   ✓ gradlew is executable"
    else
        echo "   ⚠ Warning: gradlew is not executable (will fix)"
        chmod +x gradlew
    fi
else
    echo "   ❌ ERROR: gradlew not found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "gradle/wrapper/gradle-wrapper.properties" ]; then
    echo "   ✓ gradle-wrapper.properties found"
else
    echo "   ❌ ERROR: gradle-wrapper.properties not found"
    ERRORS=$((ERRORS + 1))
fi

# Check source files
echo ""
echo "5. Checking source files..."
KOTLIN_COUNT=$(find app/src/main/java -name "*.kt" 2>/dev/null | wc -l)
if [ "$KOTLIN_COUNT" -gt 0 ]; then
    echo "   ✓ Found $KOTLIN_COUNT Kotlin source files"
else
    echo "   ❌ ERROR: No Kotlin source files found"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "app/src/main/AndroidManifest.xml" ]; then
    echo "   ✓ AndroidManifest.xml found"
else
    echo "   ❌ ERROR: AndroidManifest.xml not found"
    ERRORS=$((ERRORS + 1))
fi

# Check resources
echo ""
echo "6. Checking resources..."
if [ -d "app/src/main/res" ]; then
    echo "   ✓ res directory found"
    RESOURCE_COUNT=$(find app/src/main/res -type f | wc -l)
    echo "   ✓ Found $RESOURCE_COUNT resource files"
else
    echo "   ❌ ERROR: res directory not found"
    ERRORS=$((ERRORS + 1))
fi

# Check local.properties
echo ""
echo "7. Checking local.properties..."
if [ -f "local.properties" ]; then
    echo "   ✓ local.properties found"
    if grep -q "sdk.dir" local.properties; then
        echo "   ✓ sdk.dir is configured"
    else
        echo "   ⚠ Warning: sdk.dir not configured in local.properties"
    fi
else
    echo "   ⚠ Warning: local.properties not found (will be created by build script)"
fi

# Summary
echo ""
echo "==================================="
echo "Verification Summary"
echo "==================================="
if [ $ERRORS -eq 0 ]; then
    echo "✓ All checks passed!"
    echo ""
    echo "You can now build the app with:"
    echo "  ./build.sh"
    echo ""
    echo "Or manually with:"
    echo "  ./gradlew assembleRelease"
    exit 0
else
    echo "❌ Found $ERRORS error(s)"
    echo ""
    echo "Please fix the errors above before building."
    exit 1
fi
