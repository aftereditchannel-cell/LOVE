#!/bin/bash

# CoupleOS Setup Script
# Downloads and configures the Gradle wrapper

set -e

echo "==================================="
echo "CoupleOS Gradle Wrapper Setup"
echo "==================================="
echo ""

GRADLE_VERSION="8.7"
WRAPPER_JAR="gradle/wrapper/gradle-wrapper.jar"

# Check if wrapper JAR already exists
if [ -f "$WRAPPER_JAR" ]; then
    echo "✓ Gradle wrapper JAR already exists"
else
    echo "Downloading Gradle wrapper JAR..."
    
    # Try multiple sources
    WRAPPER_URL="https://raw.githubusercontent.com/gradle/gradle/v${GRADLE_VERSION}.0/gradle/wrapper/gradle-wrapper.jar"
    FALLBACK_URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"
    
    # Method 1: Try to download the JAR directly
    if command -v curl &> /dev/null; then
        curl -fSL "$WRAPPER_URL" -o "$WRAPPER_JAR" 2>/dev/null && {
            echo "✓ Gradle wrapper JAR downloaded"
        } || {
            echo "⚠ Direct download failed, trying alternative method..."
            
            # Method 2: Generate wrapper using installed Gradle
            if command -v gradle &> /dev/null; then
                gradle wrapper --gradle-version "$GRADLE_VERSION"
                echo "✓ Gradle wrapper generated using installed Gradle"
            else
                echo "⚠ Gradle not installed, trying to extract from distribution..."
                
                # Method 3: Download full distribution and extract JAR
                TEMP_DIR=$(mktemp -d)
                curl -fSL "$FALLBACK_URL" -o "$TEMP_DIR/gradle.zip" 2>/dev/null && {
                    unzip -q "$TEMP_DIR/gradle.zip" -d "$TEMP_DIR"
                    cp "$TEMP_DIR/gradle-${GRADLE_VERSION}/lib/gradle-wrapper-*.jar" "$WRAPPER_JAR" 2>/dev/null || {
                        # Find the wrapper jar in the distribution
                        find "$TEMP_DIR" -name "gradle-wrapper*.jar" -exec cp {} "$WRAPPER_JAR" \;
                    }
                    rm -rf "$TEMP_DIR"
                    echo "✓ Gradle wrapper JAR extracted from distribution"
                } || {
                    echo ""
                    echo "❌ ERROR: Could not download Gradle wrapper JAR"
                    echo ""
                    echo "Please install Gradle and run:"
                    echo "  gradle wrapper --gradle-version $GRADLE_VERSION"
                    echo ""
                    echo "Or manually download the JAR from:"
                    echo "  $WRAPPER_URL"
                    echo "And place it in:"
                    echo "  $WRAPPER_JAR"
                    exit 1
                }
            fi
        }
    elif command -v wget &> /dev/null; then
        wget -q "$WRAPPER_URL" -O "$WRAPPER_JAR" && {
            echo "✓ Gradle wrapper JAR downloaded"
        } || {
            echo "❌ ERROR: Could not download Gradle wrapper JAR"
            echo "Please install Gradle and run: gradle wrapper --gradle-version $GRADLE_VERSION"
            exit 1
        }
    else
        echo "❌ ERROR: Neither curl nor wget found"
        exit 1
    fi
fi

# Make gradlew executable
chmod +x gradlew

echo ""
echo "✓ Gradle wrapper is ready!"
echo ""
echo "You can now build with:"
echo "  ./build.sh"
echo ""
echo "Or manually:"
echo "  ./gradlew assembleRelease"
