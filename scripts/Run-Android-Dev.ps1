<#
.SYNOPSIS
  Compile and install a local Android development build (npx expo run:android).

.DESCRIPTION
  BP Tracker needs a development build because react-native-quick-crypto is not
  available in Expo Go. This script checks JDK 17 + Android SDK, installs JS
  deps if needed, then runs `npx expo run:android`.

.PARAMETER Device
  Pass --device to Expo (physical phone with USB debugging).

.PARAMETER Clean
  Run `expo prebuild --platform android --clean` first.

.EXAMPLE
  .\scripts\Run-Android-Dev.ps1

.EXAMPLE
  .\scripts\Run-Android-Dev.ps1 -Device
#>

[CmdletBinding()]
param(
    [switch]$Device,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$MobileDir = Join-Path $Root "artifacts\mobile"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  !   $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red }

# Refresh PATH for tools installed in this session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

if (-not $env:JAVA_HOME) {
    $jdk = Get-ChildItem "C:\Program Files\Microsoft\jdk-17*" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
}

if (-not $env:ANDROID_HOME) {
    $sdkCandidate = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $sdkCandidate) { $env:ANDROID_HOME = $sdkCandidate }
}
if ($env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
}
if ($env:JAVA_HOME) {
    $env:Path = "$env:JAVA_HOME\bin;$env:Path"
}
if ($env:ANDROID_HOME) {
    $env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
}

Write-Step "Checking prerequisites"

if (-not (Test-Path $MobileDir)) {
    Write-Fail "Mobile project not found at $MobileDir"
    exit 1
}
Write-Ok "Mobile project: $MobileDir"

try {
    Write-Ok "Node $(node -v)"
} catch {
    Write-Fail "Node.js 20+ is required"
    exit 1
}

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Fail "JDK 17 not on PATH. Install Microsoft OpenJDK 17, then re-open the terminal."
    Write-Host "  winget install --id Microsoft.OpenJDK.17 -e" -ForegroundColor Gray
    exit 1
}
Write-Ok "Java $(& java -version 2>&1 | Select-Object -First 1)"

if (-not $env:ANDROID_HOME -or -not (Test-Path $env:ANDROID_HOME)) {
    Write-Fail "ANDROID_HOME is not set. Run .\scripts\Setup-Android-Sdk.ps1 or install Android Studio."
    exit 1
}
Write-Ok "ANDROID_HOME=$env:ANDROID_HOME"

$adb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    Write-Fail "adb not found. Run .\scripts\Setup-Android-Sdk.ps1"
    exit 1
}

Write-Step "Installing JavaScript dependencies"
Push-Location $MobileDir
try {
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Warn "pnpm missing — installing globally"
        npm install -g pnpm | Out-Null
    }
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
    Write-Ok "Dependencies ready"

    if ($Clean) {
        Write-Step "Regenerating native Android project"
        npx expo prebuild --platform android --clean
        if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed" }
    }

    Write-Step "Building and installing development client"
    if ($PWD.Path -match "OneDrive") {
        Write-Warn "Building from OneDrive often fails on Windows (260-char path limit)."
        Write-Host "  Copy the repo to C:\\bp and run from there." -ForegroundColor Yellow
    }
    $expoArgs = @("expo", "run:android")
    if ($Device) { $expoArgs += "--device" }
    Write-Host "  npx $($expoArgs -join ' ')" -ForegroundColor DarkGray
    npx @expoArgs
    if ($LASTEXITCODE -ne 0) { throw "expo run:android failed with code $LASTEXITCODE" }
    Write-Ok "Development build launched"
}
catch {
    Write-Fail $_.Exception.Message
    exit 1
}
finally {
    Pop-Location
}
