# ============================================================
# Polaris - Android APK 构建脚本
# 用途：一键构建 Vite 静态站点并同步到 Capacitor Android 项目
# ============================================================

$ErrorActionPreference = "Stop"
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "  Polaris APK 构建脚本" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Step 1: 构建 Vite 静态站点
Write-Host "`n[1/2] 构建 Vite 静态站点..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误：Vite 构建失败！" -ForegroundColor Red
    exit 1
}
Write-Host "Vite 构建完成，静态文件已输出到 dist/ 目录。" -ForegroundColor Green

# Step 2: 同步静态文件到 Capacitor Android 项目
Write-Host "`n[2/2] 同步 Capacitor Android 项目..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误：Capacitor 同步失败！" -ForegroundColor Red
    exit 1
}
Write-Host "Capacitor 同步完成。" -ForegroundColor Green

# 完成提示
Write-Host "`n==========================" -ForegroundColor Cyan
Write-Host "  构建完成！" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "APK 就绪路径: android/app/build/outputs/" -ForegroundColor Yellow
Write-Host ""
Write-Host "下一步（需要 Android SDK 环境）：" -ForegroundColor White
Write-Host "  cd android" -ForegroundColor Gray
Write-Host "  .\gradlew assembleDebug    # 生成 debug APK" -ForegroundColor Gray
Write-Host "  .\gradlew assembleRelease  # 生成 release APK（需签名配置）" -ForegroundColor Gray
