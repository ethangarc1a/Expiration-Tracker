export interface Item {
  id: number;
  name: string;
  category: string;
  quantity: number;
  expirationDate: string; // YYYY-MM-DD format
  notes: string | null;
  notificationId: string | null; // legacy single reminder id
  notificationIds: string[]; // multi-reminder ids
  photoUris: string[];
  recurrenceDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewItem {
  name: string;
  category: string;
  quantity: number;
  expirationDate: string;
  notes: string | null;
  photoUris?: string[];
  recurrenceDays?: number | null;
}

export interface Settings {
  reminderDays: number[]; // 0-14, default [2]
  reminderTime: { hour: number; minute: number };
  defaultCategory: string; // default "Other"
  defaultQuantity: number; // default 1
  autoDeleteExpiredDays: number; // 0 = disabled
  themePreference: 'system' | 'light' | 'dark';
  language: string; // i18n-ready
  notificationSound: boolean;
}

export type ItemStatus = 'expired' | 'soon' | 'ok';

export type FilterType = 'all' | 'expiring' | 'expired' | string; // string for category filters

export type SortOption =
  | 'expiry_asc'
  | 'expiry_desc'
  | 'name_asc'
  | 'name_desc'
  | 'category'
  | 'recent';

export interface ParsedDate {
  date: Date;
  confidence: 'high' | 'medium' | 'low';
  rawMatch: string;
}

export interface OCRResult {
  text: string;
  extractedDate: ParsedDate | null;
}
