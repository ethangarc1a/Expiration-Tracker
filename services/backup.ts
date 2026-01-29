import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Item, NewItem, Settings } from '../types';
import { exportAllItems, importItems, deleteAllItems } from './database';

interface BackupData {
  version: number;
  exportedAt: string;
  settings: Settings;
  items: Omit<
    Item,
    'id' | 'notificationId' | 'notificationIds' | 'createdAt' | 'updatedAt'
  >[];
}

const BACKUP_VERSION = 2;

export async function exportBackup(settings: Settings): Promise<boolean> {
  try {
    const items = await exportAllItems();

    // Create backup data structure
    const backupData: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      items: items.map((item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        expirationDate: item.expirationDate,
        notes: item.notes,
        photoUris: item.photoUris ?? [],
        recurrenceDays: item.recurrenceDays ?? null,
      })),
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    const fileName = `expirybuddy-backup-${new Date().toISOString().split('T')[0]}.json`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    // Write to cache directory
    await FileSystem.writeAsStringAsync(filePath, jsonContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export ExpiryBuddy Backup',
        UTI: 'public.json',
      });
      return true;
    } else {
      console.error('Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('Export backup failed:', error);
    return false;
  }
}

export async function importBackup(): Promise<{
  success: boolean;
  settings?: Settings;
  itemCount?: number;
  error?: string;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, error: 'No file selected' };
    }

    const fileUri = result.assets[0].uri;
    const jsonContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const backupData = JSON.parse(jsonContent) as BackupData;

    // Validate backup format
    if (!backupData.version || !backupData.items) {
      return { success: false, error: 'Invalid backup file format' };
    }

    // Check version compatibility
    if (backupData.version > BACKUP_VERSION) {
      return {
        success: false,
        error: 'Backup file is from a newer version of the app',
      };
    }

    // Prepare items for import
    const itemsToImport: NewItem[] = backupData.items.map((item) => ({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      expirationDate: item.expirationDate,
      notes: item.notes,
      photoUris: item.photoUris ?? [],
      recurrenceDays: item.recurrenceDays ?? null,
    }));

    // Import items
    const importedCount = await importItems(itemsToImport);

    return {
      success: true,
      settings: backupData.settings,
      itemCount: importedCount,
    };
  } catch (error) {
    console.error('Import backup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function clearAndImportBackup(): Promise<{
  success: boolean;
  settings?: Settings;
  itemCount?: number;
  error?: string;
}> {
  try {
    // Clear existing data first
    await deleteAllItems();

    // Then import
    return importBackup();
  } catch (error) {
    console.error('Clear and import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
