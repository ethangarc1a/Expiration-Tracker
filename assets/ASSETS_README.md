# Assets

Place the following image files in this directory:

## Required Assets

1. **icon.png** (1024x1024 px)
   - App icon displayed on home screen
   - Should be a square image with no transparency

2. **splash-icon.png** (512x512 px recommended)
   - Shown during app loading
   - Centered on the splash screen background

3. **adaptive-icon.png** (1024x1024 px)
   - Android adaptive icon foreground
   - Should have transparent background
   - Keep important content within the safe zone (center 66%)

4. **favicon.png** (48x48 px)
   - Web favicon for PWA/web builds

## Generating Assets

You can use tools like:
- [Expo Icon Generator](https://icon.expo.fyi/)
- [App Icon Generator](https://appicon.co/)
- [Figma](https://figma.com) with the Expo icon template

## Quick Start

For testing, you can create simple placeholder icons:

1. Create a 1024x1024 image with a solid color background
2. Add the app name or a simple icon in the center
3. Export copies in the required sizes

The splash screen background color is set in `app.json` under `expo.splash.backgroundColor`.
