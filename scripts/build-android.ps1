# ============================================================
# Android APK 构建脚本 (PowerShell / Windows)
# 用法: .\scripts\build-android.ps1
# ============================================================
$ErrorActionPreference = "Stop"

Write-Host "=== 步骤 1/3: 构建 Next.js 静态文件 ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Next.js 构建失败!" -ForegroundColor Red
    exit 1
}

Write-Host "=== 步骤 2/3: 同步 Capacitor Android 项目 ===" -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "Capacitor 同步失败!" -ForegroundColor Red
    exit 1
}

Write-Host "=== 步骤 3/3: 编译 Android APK (Release) ===" -ForegroundColor Cyan
Push-Location android
try {
    .\gradlew assembleRelease
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Android 编译失败!" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host "=== 构建完成! ===" -ForegroundColor Green
Write-Host "APK 输出位置: android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor Yellow
