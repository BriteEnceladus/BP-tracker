# Push local v1.3.0 release to GitHub (run in YOUR terminal so login can prompt)
# Usage:
#   cd BP-tracker-main
#   powershell -ExecutionPolicy Bypass -File .\scripts\push-to-github.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Repo: $(Get-Location)" -ForegroundColor Cyan
Write-Host "Remote: $(git remote get-url origin)" -ForegroundColor Cyan
Write-Host "Tag:    $(git describe --tags --always)" -ForegroundColor Cyan
Write-Host ""

# Ensure we can talk to GitHub (will open browser / credential helper if needed)
Write-Host "Pushing main (force-with-lease — old main should be on archive/pre-v1.3.0)..." -ForegroundColor Yellow
git push --force-with-lease=main:origin/main -u origin main

Write-Host "Pushing tag v1.3.0..." -ForegroundColor Yellow
git push origin v1.3.0

Write-Host ""
Write-Host "Done. Verify: https://github.com/BriteEnceladus/BP-tracker" -ForegroundColor Green
Write-Host "Tags:     https://github.com/BriteEnceladus/BP-tracker/tags" -ForegroundColor Green
Write-Host "Rollback: see VERSIONING.md" -ForegroundColor Green
