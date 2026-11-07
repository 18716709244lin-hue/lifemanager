# AI 生活管家 - 自动安装脚本
# 以管理员身份运行 PowerShell，然后执行: .\setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI 生活管家 - 开发环境自动安装脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "请以管理员身份运行此脚本！" -ForegroundColor Red
    Write-Host "右键点击 PowerShell，选择 '以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

# 检查 winget 是否可用
$wingetAvailable = Get-Command winget -ErrorAction SilentlyContinue
if (-not $wingetAvailable) {
    Write-Host "winget 不可用，尝试安装..." -ForegroundColor Yellow
    # 安装 App Installer（包含 winget）
    Invoke-WebRequest -Uri "https://aka.ms/getwinget" -OutFile "$env:TEMP\winget.msixbundle"
    Add-AppxPackage -Path "$env:TEMP\winget.msixbundle"
}

Write-Host "[1/6] 安装 Node.js LTS..." -ForegroundColor Green
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements -h

Write-Host ""
Write-Host "[2/6] 安装 JDK 17..." -ForegroundColor Green
winget install Microsoft.OpenJDK.17 --accept-package-agreements --accept-source-agreements -h

Write-Host ""
Write-Host "[3/6] 安装 Android Studio..." -ForegroundColor Green
winget install Google.AndroidStudio --accept-package-agreements --accept-source-agreements -h

Write-Host ""
Write-Host "[4/6] 安装 Git..." -ForegroundColor Green
winget install Git.Git --accept-package-agreements --accept-source-agreements -h

Write-Host ""
Write-Host "[5/6] 安装 React Native CLI..." -ForegroundColor Green
npm install -g react-native-cli

Write-Host ""
Write-Host "[6/6] 安装项目依赖..." -ForegroundColor Green
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath
npm install

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  安装完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "接下来的步骤：" -ForegroundColor Yellow
Write-Host "1. 重启电脑（使环境变量生效）" -ForegroundColor White
Write-Host "2. 打开 Android Studio，安装 Android SDK" -ForegroundColor White
Write-Host "3. 配置环境变量（ANDROID_HOME 等）" -ForegroundColor White
Write-Host "4. 运行 'npx react-native run-android' 启动APP" -ForegroundColor White
Write-Host ""
Write-Host "详细教程请查看 README.md" -ForegroundColor Cyan
Write-Host ""

pause
