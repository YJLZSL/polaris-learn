#!/bin/bash
# ============================================================
# Android APK 构建脚本 (Linux / macOS)
# 用法: bash scripts/build-android.sh
# ============================================================
set -e

echo "=== 步骤 1/3: 构建 Next.js 静态文件 ==="
npm run build

echo "=== 步骤 2/3: 同步 Capacitor Android 项目 ==="
npx cap sync android

echo "=== 步骤 3/3: 编译 Android APK (Release) ==="
cd android && ./gradlew assembleRelease && cd ..

echo "=== 构建完成! ==="
echo "APK 输出位置: android/app/build/outputs/apk/release/app-release.apk"
