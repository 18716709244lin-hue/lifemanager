# AI 生活管家 - APK 打包脚本
# 运行此脚本前，请确保已完成环境配置

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI 生活管家 - APK 打包脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# 检查 node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "未检测到 node_modules，正在安装依赖..." -ForegroundColor Yellow
    npm install
}

# 创建 assets 目录（如果不存在）
$assetsPath = "android\app\src\main\assets"
if (-not (Test-Path $assetsPath)) {
    New-Item -ItemType Directory -Force -Path $assetsPath
    Write-Host "创建 assets 目录" -ForegroundColor Green
}

# 生成 JS Bundle
Write-Host "[1/3] 生成 JS Bundle..." -ForegroundColor Green
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

if ($LASTEXITCODE -ne 0) {
    Write-Host "JS Bundle 生成失败！" -ForegroundColor Red
    exit 1
}

# 构建 APK
Write-Host ""
Write-Host "[2/3] 构建 Release APK..." -ForegroundColor Green
Set-Location android

# Windows 使用 gradlew.bat
.\gradlew.bat assembleRelease

if ($LASTEXITCODE -ne 0) {
    Write-Host "APK 构建失败！" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# 复制 APK 到项目根目录
Write-Host ""
Write-Host "[3/3] 复制 APK 到项目根目录..." -ForegroundColor Green
$apkSource = "android\app\build\outputs\apk\release\app-release.apk"
$apkDest = "LifeManagerApp-v1.0.apk"

if (Test-Path $apkSource) {
    Copy-Item $apkSource $apkDest
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  打包成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "APK 位置: $projectPath\$apkDest" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "安装到手机：" -ForegroundColor Cyan
    Write-Host "1. 将 APK 文件发送到手机（微信/QQ/邮件）" -ForegroundColor White
    Write-Host "2. 在手机上点击 APK 文件" -ForegroundColor White
    Write-Host "3. 允许 '未知来源' 安装" -ForegroundColor White
    Write-Host "4. 完成安装" -ForegroundColor White
} else {
    Write-Host "未找到生成的 APK 文件！" -ForegroundColor Red
}

Write-Host ""
pause
