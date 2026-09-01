<#
.SYNOPSIS
  Install Android command-line SDK packages needed by `npx expo run:android`.

.DESCRIPTION
  Downloads Google command-line tools into %LOCALAPPDATA%\Android\Sdk and
  installs platform-tools, Android 35, build-tools, NDK, CMake, and an emulator image.
  Does not install the Android Studio IDE.

.EXAMPLE
  .\scripts\Setup-Android-Sdk.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$SdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$CmdlineZip = Join-Path $env:TEMP "commandlinetools-win.zip"
# https://developer.android.com/studio#command-line-tools-only
$CmdlineUrl = "https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }

Write-Step "Android SDK root: $SdkRoot"
New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null

$latestDir = Join-Path $SdkRoot "cmdline-tools\latest"
if (-not (Test-Path (Join-Path $latestDir "bin\sdkmanager.bat"))) {
    Write-Step "Downloading Android command-line tools"
    Invoke-WebRequest -Uri $CmdlineUrl -OutFile $CmdlineZip
    $extract = Join-Path $env:TEMP "cmdline-tools-extract"
    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
    Expand-Archive -Path $CmdlineZip -DestinationPath $extract -Force
    New-Item -ItemType Directory -Force -Path $latestDir | Out-Null
    $inner = Get-ChildItem $extract -Directory | Select-Object -First 1
    Copy-Item -Path (Join-Path $inner.FullName "*") -Destination $latestDir -Recurse -Force
    Write-Ok "cmdline-tools installed"
} else {
    Write-Ok "cmdline-tools already present"
}

$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:Path = "$latestDir\bin;$SdkRoot\platform-tools;$env:Path"

[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkRoot, "User")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $SdkRoot, "User")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$toAdd = @(
    "$latestDir\bin",
    "$SdkRoot\platform-tools",
    "$SdkRoot\emulator"
)
foreach ($p in $toAdd) {
    if ($userPath -notlike "*$p*") {
        $userPath = if ($userPath) { "$userPath;$p" } else { $p }
    }
}
[System.Environment]::SetEnvironmentVariable("Path", $userPath, "User")

$sdkmanager = Join-Path $latestDir "bin\sdkmanager.bat"
Write-Step "Accepting licenses and installing packages (this takes a while)"

$packages = @(
    "platform-tools",
    "platforms;android-35",
    "build-tools;35.0.0",
    "ndk;27.1.12297006",
    "cmake;3.22.1",
    "emulator",
    "system-images;android-35;google_apis;x86_64"
)

$yes = ("y`n" * 200)
$yes | & $sdkmanager --sdk_root=$SdkRoot --licenses
if ($LASTEXITCODE -ne 0) { Write-Host "sdkmanager --licenses exited $LASTEXITCODE (often still OK)" -ForegroundColor Yellow }

& $sdkmanager --sdk_root=$SdkRoot $packages
if ($LASTEXITCODE -ne 0) { throw "sdkmanager package install failed" }
Write-Ok "SDK packages installed"

$avdName = "BPTracker_API35"
$avdManager = Join-Path $latestDir "bin\avdmanager.bat"
$existing = & $avdManager list avd 2>$null
if ($existing -notmatch $avdName) {
    Write-Step "Creating emulator $avdName"
    echo "no" | & $avdManager create avd --name $avdName --package "system-images;android-35;google_apis;x86_64" --device "pixel_7" --force
    Write-Ok "AVD created"
} else {
    Write-Ok "AVD $avdName already exists"
}

Write-Host "`nDone. ANDROID_HOME=$SdkRoot" -ForegroundColor Green
Write-Host "Re-open the terminal, then run: .\scripts\Run-Android-Dev.ps1" -ForegroundColor Cyan
