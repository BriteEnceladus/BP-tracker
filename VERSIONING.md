# Versioning & rollbacks

BP Tracker uses **semantic versioning** and **git tags** so you can roll back bad releases.

## Version numbers

Format: `MAJOR.MINOR.PATCH` (example: `1.3.0`)

| Part | When to bump |
|------|----------------|
| **MAJOR** | Breaking changes (data format, login, store listing reset) |
| **MINOR** | New features (cloud sync, new screens) |
| **PATCH** | Bug fixes only |

### Where versions live

| Platform | Field | File |
|----------|--------|------|
| User-facing | `expo.version` | `artifacts/mobile/app.json` |
| Android | `android.versionCode` | `artifacts/mobile/app.json` (integer, always increase) |
| iOS | `ios.buildNumber` | `artifacts/mobile/app.json` (string, always increase) |
| npm package | `version` | `artifacts/mobile/package.json` |

Keep `expo.version` and `package.json` version the same (e.g. both `1.3.0`).

## Git tags

Every store/APK release should get an **annotated tag**:

```powershell
cd "BP-tracker-main"

# After committing release-ready code:
git tag -a v1.3.0 -m "v1.3.0 — Puter cloud on mobile, iOS store config"
git push origin v1.3.0
git push origin main
```

List tags:

```powershell
git tag -l -n9
```

## How to roll back

### A) Go back to an older tag (inspect / emergency)

```powershell
git fetch --tags
git checkout v1.2.0
```

You are in “detached HEAD”. To make a fix branch from that release:

```powershell
git checkout -b hotfix/from-1.2.0
# fix bugs…
git commit -am "Hotfix from 1.2.0"
# bump patch → 1.2.1, tag, build, push
```

### B) Undo a bad commit on main (not yet pushed)

```powershell
git log --oneline -10
git reset --hard HEAD~1    # drops last commit locally
```

### C) Undo a bad commit already on GitHub

Prefer **revert** (safe, keeps history):

```powershell
git revert HEAD --no-edit
git push origin main
```

Avoid `git push --force` on `main` unless you know no one else depends on those commits.

### D) Rebuild an old APK from a tag

```powershell
git checkout v1.2.0
cd artifacts/mobile
npx eas-cli build --platform android --profile preview
```

## Suggested release checklist

1. Update `app.json` version + versionCode / buildNumber  
2. Update `CHANGELOG.md`  
3. `git commit -am "Release vX.Y.Z"`  
4. `git tag -a vX.Y.Z -m "…"`  
5. `git push origin main --tags`  
6. `eas build` (Android / iOS)  
7. Install / TestFlight / store submit  

## Current baseline

| Tag | Notes |
|-----|--------|
| `v1.3.0` | Puter cloud on native, WebView bridge, iOS App Store config, EAS APK path |
