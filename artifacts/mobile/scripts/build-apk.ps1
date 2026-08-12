# Build a sideloadable Android APK via Expo EAS (cloud).
# Usage (from artifacts/mobile):
#   powershell -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ""
Write-Host "BP Tracker — Android APK build (EAS cloud)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Ensure eas-cli
$eas = "npx --yes eas-cli"

# Login check
$who = & npx --yes eas-cli whoami 2>$null
if (-not $who -or $who -match "Not logged in") {
  Write-Host "You need a free Expo account." -ForegroundColor Yellow
  Write-Host "1) Browser will open / terminal will prompt for login." -ForegroundColor Yellow
  Write-Host "2) Sign up at https://expo.dev if you don't have an account." -ForegroundColor Yellow
  Write-Host ""
  & npx --yes eas-cli login
  if ($LASTEXITCODE -ne 0) { throw "EAS login failed" }
}

Write-Host "Logged in as: $((npx --yes eas-cli whoami 2>$null))" -ForegroundColor Green

# Ensure project is linked (projectId in app.json / app.config)
Write-Host ""
Write-Host "Starting cloud APK build (preview profile)..." -ForegroundColor Cyan
Write-Host "This usually takes 10–20 minutes. You'll get a download URL when done." -ForegroundColor Gray
Write-Host ""

& npx --yes eas-cli build --platform android --profile preview

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Build command failed. If the project is not linked yet, run:" -ForegroundColor Red
  Write-Host "  npx eas-cli init" -ForegroundColor Yellow
  Write-Host "then re-run this script." -ForegroundColor Yellow
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Done. Download the APK from the URL above, copy it to your phone, and install." -ForegroundColor Green
Write-Host "On Android you may need: Settings → Allow install from this source." -ForegroundColor Gray
