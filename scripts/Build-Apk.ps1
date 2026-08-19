<#
.SYNOPSIS
  Automated EAS Build script for BP Tracker (Android APK / AAB)

.DESCRIPTION
  Runs an EAS cloud build for the BP Tracker mobile app.
  Default profile = "preview" (produces a sideloadable APK).

.PARAMETER Profile
  EAS build profile: preview | production | development
  Default: preview

.PARAMETER Platform
  android | ios | all
  Default: android

.PARAMETER ClearCache
  Pass --clear-cache to EAS

.PARAMETER NonInteractive
  Run without prompts (requires prior `eas login`)

.EXAMPLE
  .\scripts\Build-Apk.ps1

.EXAMPLE
  .\scripts\Build-Apk.ps1 -Profile production -NonInteractive

.EXAMPLE
  .\scripts\Build-Apk.ps1 -Profile preview -ClearCache
#>

[CmdletBinding()]
param(
    [ValidateSet("preview", "production", "development")]
    [string]$Profile = "preview",

    [ValidateSet("android", "ios", "all")]
    [string]$Platform = "android",

    [switch]$ClearCache,

    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$MobileDir = Join-Path $Root "artifacts\mobile"

function Write-Step($msg) {
    Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "  ! $msg" -ForegroundColor Yellow
}

function Write-Fail($msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
}

# --------------------------------------------------------------------------
# 1. Prerequisites
# --------------------------------------------------------------------------
Write-Step "Checking prerequisites"

if (-not (Test-Path $MobileDir)) {
    Write-Fail "Mobile project not found at: $MobileDir"
    exit 1
}
Write-Ok "Mobile project found"

# Node
try {
    $nodeVersion = node -v 2>$null
    Write-Ok "Node $nodeVersion"
} catch {
    Write-Fail "Node.js is required. Install from https://nodejs.org"
    exit 1
}

# pnpm
try {
    $pnpmVersion = pnpm -v 2>$null
    Write-Ok "pnpm $pnpmVersion"
} catch {
    Write-Warn "pnpm not found – installing globally…"
    npm install -g pnpm
}

# EAS CLI
try {
    $easVersion = eas --version 2>$null
    Write-Ok "EAS CLI $easVersion"
} catch {
    Write-Warn "EAS CLI not found – installing globally…"
    npm install -g eas-cli
    $easVersion = eas --version
    Write-Ok "EAS CLI $easVersion installed"
}

# --------------------------------------------------------------------------
# 2. Expo login check
# --------------------------------------------------------------------------
Write-Step "Checking Expo authentication"

$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0 -or $whoami -match "Not logged in") {
    Write-Warn "Not logged in to Expo."
    if ($NonInteractive) {
        Write-Fail "Run 'eas login' first, then re-run with -NonInteractive"
        exit 1
    }
    Write-Host "Opening login…" -ForegroundColor Yellow
    eas login
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Login failed"
        exit 1
    }
}
else {
    Write-Ok "Logged in as: $whoami"
}

# --------------------------------------------------------------------------
# 3. Install dependencies (if needed)
# --------------------------------------------------------------------------
Write-Step "Ensuring dependencies are installed"

Push-Location $MobileDir
try {
    if (-not (Test-Path "node_modules")) {
        Write-Host "  Running pnpm install…" -ForegroundColor Gray
        pnpm install
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
        Write-Ok "Dependencies installed"
    }
    else {
        Write-Ok "node_modules present"
    }

    # --------------------------------------------------------------------------
    # 4. Start EAS Build
    # --------------------------------------------------------------------------
    Write-Step "Starting EAS Build"
    Write-Host "  Profile  : $Profile" -ForegroundColor Gray
    Write-Host "  Platform : $Platform" -ForegroundColor Gray
    Write-Host "  Output   : $(if ($Profile -eq 'preview') { 'APK (internal)' } else { 'AAB / Store' })" -ForegroundColor Gray

    $easArgs = @(
        "build",
        "--platform", $Platform,
        "--profile", $Profile
    )

    if ($ClearCache) {
        $easArgs += "--clear-cache"
        Write-Host "  Cache    : clearing" -ForegroundColor Gray
    }

    if ($NonInteractive) {
        $easArgs += "--non-interactive"
    }

    Write-Host "`n  Command: eas $($easArgs -join ' ')" -ForegroundColor DarkGray
    Write-Host ""

    & eas @easArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Ok "Build submitted successfully!"
        Write-Host "  Monitor progress at: https://expo.dev" -ForegroundColor Cyan
        Write-Host "  Or run: eas build:list" -ForegroundColor Cyan
    }
    else {
        Write-Fail "EAS build command exited with code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}
catch {
    Write-Fail $_.Exception.Message
    exit 1
}
finally {
    Pop-Location
}

Write-Host "`nDone." -ForegroundColor Green
