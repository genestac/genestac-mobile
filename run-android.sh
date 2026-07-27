#!/bin/bash
# Run the Android dev build with correct SDK/JDK paths
export ANDROID_HOME=/home/Neelesh/Android/Sdk
export JAVA_HOME=/home/Neelesh/android-studio/jbr
export PATH=$PATH:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin

echo "→ ANDROID_HOME: $ANDROID_HOME"
echo "→ JAVA_HOME:    $JAVA_HOME"
echo "→ Running: npm run android"
npm run android
