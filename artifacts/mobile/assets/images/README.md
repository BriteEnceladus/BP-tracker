# BP Tracker App Icons & Splash Art

Professional assets generated for the app.

## Required files (place the PNGs from the companion assets here):

- `icon.png` (1024×1024) — Main app icon
- `adaptive-icon.png` (1024×1024, RGBA preferred) — Android adaptive foreground
- `splash-icon-light.png` (1024×1024) — Light mode splash logo
- `splash-icon-dark.png` (1024×1024) — Dark mode splash logo
- `favicon.png` (192×192) — Web favicon
- `play-store-icon.png` (512×512) — Google Play listing icon (optional but recommended)
- `feature-graphic.png` (1024×500) — Google Play feature graphic

The `app.json` has already been updated to reference these paths and to support dark/light splash screens via the expo-splash-screen plugin.

After adding the PNG files, commit them and the next EAS build / Expo start will pick them up.
