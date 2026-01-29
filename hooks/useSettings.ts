import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings } from '../types';
import { DEFAULT_CATEGORY } from '../constants/categories';

const SETTINGS_KEY = '@expirybuddy:settings';

const DEFAULT_SETTINGS: Settings = {
  reminderDays: [2],
  reminderTime: { hour: 9, minute: 0 },
  defaultCategory: DEFAULT_CATEGORY,
  defaultQuantity: 1,
  autoDeleteExpiredDays: 0,
  themePreference: 'system',
  language: 'en',
  notificationSound: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
        if (isMounted.current && storedSettings) {
          const parsed = JSON.parse(storedSettings) as Partial<Settings> & {
            reminderDays?: number | number[];
          };
          const reminderDays =
            typeof parsed.reminderDays === 'number'
              ? [parsed.reminderDays]
              : parsed.reminderDays;
          const normalized: Settings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            reminderDays: reminderDays && reminderDays.length > 0 ? reminderDays : DEFAULT_SETTINGS.reminderDays,
            reminderTime: parsed.reminderTime ?? DEFAULT_SETTINGS.reminderTime,
          };
          setSettings(normalized);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<Settings>): Promise<boolean> => {
      try {
        const newSettings = { ...settings, ...updates };
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
        return true;
      } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
      }
    },
    [settings]
  );

  const resetSettings = useCallback(async (): Promise<boolean> => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      setSettings(DEFAULT_SETTINGS);
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  }, []);

  const setSettingsFromBackup = useCallback(
    async (backupSettings: Settings): Promise<boolean> => {
      try {
        const reminderDays =
          typeof (backupSettings as Settings & { reminderDays?: number | number[] })
            .reminderDays === 'number'
            ? [
                (backupSettings as Settings & { reminderDays?: number | number[] })
                  .reminderDays as number,
              ]
            : backupSettings.reminderDays;
        const normalized: Settings = {
          ...DEFAULT_SETTINGS,
          ...backupSettings,
          reminderDays: reminderDays && reminderDays.length > 0 ? reminderDays : DEFAULT_SETTINGS.reminderDays,
          reminderTime: backupSettings.reminderTime ?? DEFAULT_SETTINGS.reminderTime,
        };
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
        setSettings(normalized);
        return true;
      } catch (error) {
        console.error('Failed to restore settings from backup:', error);
        return false;
      }
    },
    []
  );

  return {
    settings,
    loading,
    updateSettings,
    resetSettings,
    setSettingsFromBackup,
  };
}
