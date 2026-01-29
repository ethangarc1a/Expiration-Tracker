import { Platform } from 'react-native';
import { Item, NewItem } from '../types';

// Web storage key
const WEB_STORAGE_KEY = '@expirybuddy:items';
let nextId = 1;

// In-memory storage for web
let webItems: Item[] = [];

// SQLite database reference (only used on native)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;

export async function initDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    // Load from localStorage for web
    try {
      const stored = localStorage.getItem(WEB_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Item[];
        webItems = parsed.map((item) => ({
          ...item,
          notificationId: item.notificationId ?? null,
          notificationIds: item.notificationIds ?? (item.notificationId ? [item.notificationId] : []),
          photoUris: item.photoUris ?? [],
          recurrenceDays: item.recurrenceDays ?? null,
        }));
        // Find max ID for next ID assignment
        if (webItems.length > 0) {
          nextId = Math.max(...webItems.map(item => item.id)) + 1;
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      webItems = [];
    }
    return;
  }

  // Native: use SQLite
  const SQLite = await import('expo-sqlite');
  db = await SQLite.openDatabaseAsync('expirybuddy.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      quantity INTEGER DEFAULT 1,
      expiration_date TEXT NOT NULL,
      notes TEXT,
      notification_id TEXT,
      notification_ids TEXT,
      photo_uris TEXT,
      recurrence_days INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_expiration ON items(expiration_date);
    CREATE INDEX IF NOT EXISTS idx_category ON items(category);
  `);

  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('items')"
  );
  const columnNames = new Set(columns.map((col) => col.name));

  if (!columnNames.has('notification_ids')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN notification_ids TEXT');
  }
  if (!columnNames.has('photo_uris')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN photo_uris TEXT');
  }
  if (!columnNames.has('recurrence_days')) {
    await db.execAsync('ALTER TABLE items ADD COLUMN recurrence_days INTEGER');
  }

}

function saveWebItems(): void {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(webItems));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
}

function getDb(): any {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function rowToItem(row: Record<string, unknown>): Item {
  const notificationId = row.notification_id as string | null;
  const notificationIdsRaw = row.notification_ids as string | null;
  let notificationIds: string[] = [];
  if (notificationIdsRaw) {
    try {
      notificationIds = JSON.parse(notificationIdsRaw) as string[];
    } catch {
      notificationIds = [];
    }
  } else if (notificationId) {
    notificationIds = [notificationId];
  }

  const photoUrisRaw = row.photo_uris as string | null;
  let photoUris: string[] = [];
  if (photoUrisRaw) {
    try {
      photoUris = JSON.parse(photoUrisRaw) as string[];
    } catch {
      photoUris = [];
    }
  }

  return {
    id: row.id as number,
    name: row.name as string,
    category: row.category as string,
    quantity: row.quantity as number,
    expirationDate: row.expiration_date as string,
    notes: row.notes as string | null,
    notificationId,
    notificationIds,
    photoUris,
    recurrenceDays: (row.recurrence_days as number | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllItems(): Promise<Item[]> {
  if (Platform.OS === 'web') {
    return [...webItems].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  }
  
  const database = getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM items ORDER BY expiration_date ASC'
  );
  return rows.map(rowToItem);
}

export async function getItemById(id: number): Promise<Item | null> {
  if (Platform.OS === 'web') {
    return webItems.find(item => item.id === id) || null;
  }
  
  const database = getDb();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM items WHERE id = ?',
    [id]
  );
  return row ? rowToItem(row) : null;
}

export async function getItemsByCategory(category: string): Promise<Item[]> {
  if (Platform.OS === 'web') {
    return webItems
      .filter(item => item.category === category)
      .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  }
  
  const database = getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM items WHERE category = ? ORDER BY expiration_date ASC',
    [category]
  );
  return rows.map(rowToItem);
}

export async function getExpiredItems(): Promise<Item[]> {
  const today = new Date().toISOString().split('T')[0];
  
  if (Platform.OS === 'web') {
    return webItems
      .filter(item => item.expirationDate < today)
      .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  }
  
  const database = getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM items WHERE expiration_date < ? ORDER BY expiration_date ASC',
    [today]
  );
  return rows.map(rowToItem);
}

export async function getExpiringSoonItems(days: number = 7): Promise<Item[]> {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  if (Platform.OS === 'web') {
    return webItems
      .filter(item => item.expirationDate >= today && item.expirationDate <= futureDateStr)
      .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  }
  
  const database = getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM items WHERE expiration_date >= ? AND expiration_date <= ? ORDER BY expiration_date ASC',
    [today, futureDateStr]
  );
  return rows.map(rowToItem);
}

export async function addItem(item: NewItem): Promise<number> {
  const now = new Date().toISOString();
  const photoUris = item.photoUris ?? [];
  const recurrenceDays = item.recurrenceDays ?? null;

  if (Platform.OS === 'web') {
    const newItem: Item = {
      id: nextId++,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      expirationDate: item.expirationDate,
      notes: item.notes,
      notificationId: null,
      notificationIds: [],
      photoUris,
      recurrenceDays,
      createdAt: now,
      updatedAt: now,
    };
    webItems.push(newItem);
    saveWebItems();
    return newItem.id;
  }
  
  const database = getDb();
  const result = await database.runAsync(
    `INSERT INTO items (name, category, quantity, expiration_date, notes, notification_id, notification_ids, photo_uris, recurrence_days, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.name,
      item.category,
      item.quantity,
      item.expirationDate,
      item.notes,
      null,
      JSON.stringify([]),
      JSON.stringify(photoUris),
      recurrenceDays,
      now,
      now,
    ]
  );

  return result.lastInsertRowId;
}

export async function updateItem(
  id: number,
  updates: Partial<
    NewItem & {
      notificationId: string | null;
      notificationIds: string[];
    }
  >
): Promise<void> {
  const now = new Date().toISOString();

  if (Platform.OS === 'web') {
    const index = webItems.findIndex(item => item.id === id);
    if (index !== -1) {
      webItems[index] = {
        ...webItems[index],
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.quantity !== undefined && { quantity: updates.quantity }),
        ...(updates.expirationDate !== undefined && { expirationDate: updates.expirationDate }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.photoUris !== undefined && { photoUris: updates.photoUris }),
        ...(updates.recurrenceDays !== undefined && { recurrenceDays: updates.recurrenceDays }),
        ...(updates.notificationId !== undefined && { notificationId: updates.notificationId }),
        ...(updates.notificationIds !== undefined && { notificationIds: updates.notificationIds }),
        updatedAt: now,
      };
      saveWebItems();
    }
    return;
  }
  
  const database = getDb();
  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.expirationDate !== undefined) {
    fields.push('expiration_date = ?');
    values.push(updates.expirationDate);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }
  if (updates.notificationId !== undefined) {
    fields.push('notification_id = ?');
    values.push(updates.notificationId);
  }
  if (updates.notificationIds !== undefined) {
    fields.push('notification_ids = ?');
    values.push(JSON.stringify(updates.notificationIds));
  }
  if (updates.photoUris !== undefined) {
    fields.push('photo_uris = ?');
    values.push(JSON.stringify(updates.photoUris));
  }
  if (updates.recurrenceDays !== undefined) {
    fields.push('recurrence_days = ?');
    values.push(updates.recurrenceDays);
  }

  values.push(id);

  await database.runAsync(
    `UPDATE items SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteItem(id: number): Promise<void> {
  if (Platform.OS === 'web') {
    webItems = webItems.filter(item => item.id !== id);
    saveWebItems();
    return;
  }
  
  const database = getDb();
  await database.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

export async function deleteAllItems(): Promise<void> {
  if (Platform.OS === 'web') {
    webItems = [];
    saveWebItems();
    return;
  }
  
  const database = getDb();
  await database.runAsync('DELETE FROM items');
}

export async function getItemCount(): Promise<number> {
  if (Platform.OS === 'web') {
    return webItems.length;
  }
  
  const database = getDb();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM items'
  );
  return result?.count ?? 0;
}

export async function exportAllItems(): Promise<Item[]> {
  return getAllItems();
}

export async function importItems(items: NewItem[]): Promise<number> {
  let importedCount = 0;

  for (const item of items) {
    await addItem(item);
    importedCount++;
  }

  return importedCount;
}
