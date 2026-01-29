# ExpiryBuddy

A local-first Expo React Native app for tracking expiration dates on food and household items with on-device OCR scanning.

## Features

- **Manual Entry**: Add items with name, category, quantity, expiration date, and notes
- **OCR Scanning**: Use your camera to scan expiration dates from product labels (ML Kit powered)
- **Smart Notifications**: Get reminders before items expire (configurable lead time)
- **Filtering**: View all items, expiring soon, expired, or by category
- **Backup & Restore**: Export/import your data as JSON files
- **Offline-First**: All data stored locally with SQLite, no internet required
- **Dark Mode**: Automatic theme switching based on system settings

## Tech Stack

- **Framework**: Expo SDK 52+ with TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Database**: expo-sqlite (local SQLite storage)
- **OCR**: react-native-mlkit-ocr (on-device text recognition)
- **Notifications**: expo-notifications (local push notifications)
- **State**: React hooks with AsyncStorage for settings

## Prerequisites

- Node.js 18+ and npm
- For iOS development: macOS with Xcode 15+
- For Android development: Android Studio with SDK 34+
- Physical device recommended for OCR testing

## Installation

1. **Clone and install dependencies**:

   ```bash
   cd ExpirationTracker
   npm install
   ```

2. **Create development build** (required for OCR functionality):

   ```bash
   # Generate native projects
   npx expo prebuild

   # Build and run on Android
   npx expo run:android

   # Or build and run on iOS (macOS only)
   npx expo run:ios
   ```

3. **For testing without OCR** (Expo Go compatible features only):

   ```bash
   npx expo start
   ```

   Note: OCR scanning requires a development build due to native module dependencies.

## Project Structure

```
ExpirationTracker/
├── app/                          # Expo Router screens
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── index.tsx             # Items list
│   │   ├── add.tsx               # Add item (manual/scan)
│   │   └── settings.tsx          # App settings
│   ├── item/
│   │   └── [id].tsx              # Item detail/edit
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable UI components
│   ├── ItemCard.tsx
│   ├── StatusBadge.tsx
│   ├── FilterBar.tsx
│   ├── CategoryPicker.tsx
│   ├── DateInput.tsx
│   └── OCRPreview.tsx
├── services/                     # Business logic
│   ├── database.ts               # SQLite operations
│   ├── notifications.ts          # Push notifications
│   ├── ocr.ts                    # ML Kit OCR
│   ├── dateParser.ts             # Date extraction
│   └── backup.ts                 # Export/import
├── hooks/                        # React hooks
│   ├── useItems.ts
│   ├── useSettings.ts
│   └── useNotifications.ts
├── constants/                    # App constants
│   ├── categories.ts
│   └── colors.ts
└── types/                        # TypeScript types
    └── index.ts
```

## Usage

### Adding Items Manually

1. Go to the "Add" tab
2. Select "Manual" mode
3. Fill in the item details:
   - Name (required)
   - Category
   - Expiration date (required)
   - Quantity
   - Notes (optional)
4. Tap "Add Item"

### Scanning Expiration Dates

1. Go to the "Add" tab
2. Select "Scan" mode
3. Point your camera at the expiration date on the product
4. Tap the capture button
5. Confirm or adjust the detected date
6. Complete the remaining item details

### Managing Items

- **View items**: Browse all items on the "Items" tab
- **Filter items**: Use the filter bar to show All, Expiring Soon, Expired, or by category
- **Edit item**: Tap an item to view details, then tap the edit icon
- **Delete item**: On the item detail screen, tap "Delete Item"

### Settings

- **Reminder Lead Time**: Set how many days before expiration you want to be notified (0-14 days)
- **Default Category**: Choose the default category for new items
- **Export Backup**: Save all items and settings to a JSON file
- **Import Backup**: Restore items from a previously exported backup

## Date Format Support

The OCR scanner recognizes common expiration date formats:

- `EXP 01/25/27`, `EXP 01-25-2027`
- `BEST BY 01/25/2027`, `BEST BEFORE 01/25/27`
- `USE BY: JAN 25 2027`, `USE BY 25 JAN 2027`
- `BB 01/25/27`, `SELL BY 01/25/2027`
- ISO format: `2027-01-25`
- Month names: `JAN 25 2027`, `25 JAN 2027`

## Notifications

- Notifications are scheduled based on your reminder lead time setting
- Default: 2 days before expiration at 9:00 AM
- Notifications are automatically rescheduled when you edit an item's expiration date
- Tap a notification to go directly to the item details

## Offline Support

ExpiryBuddy works completely offline:

- All data stored locally in SQLite
- OCR runs on-device using ML Kit
- No cloud APIs or internet connection required
- Backup files are saved locally and can be shared via any method

## Troubleshooting

### OCR not working

- Ensure you're using a development build, not Expo Go
- Check camera permissions in device settings
- Try better lighting or holding the camera steadier

### Notifications not appearing

- Check notification permissions in device settings
- Ensure "Reminder Lead Time" is set to more than 0 days
- The reminder date must be in the future

### Build errors

- Run `npx expo prebuild --clean` to regenerate native projects
- Delete `node_modules` and run `npm install` again

## License

MIT License - feel free to use and modify for your own projects.
