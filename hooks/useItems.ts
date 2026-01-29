import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  getAllItems,
  getItemById,
  addItem as dbAddItem,
  updateItem as dbUpdateItem,
  deleteItem as dbDeleteItem,
} from '../services/database';
import {
  scheduleExpiryReminders,
  cancelReminder,
  cancelReminders,
  rescheduleReminders,
} from '../services/notifications';
import { Item, NewItem, FilterType } from '../types';
import { useSettings } from './useSettings';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const { settings } = useSettings();
  const isMounted = useRef(true);

  const applyAutoDelete = async (fetchedItems: Item[]) => {
    if (settings.autoDeleteExpiredDays <= 0) return fetchedItems;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - settings.autoDeleteExpiredDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const toDelete = fetchedItems.filter(
      (item) => item.expirationDate < cutoffStr
    );
    if (toDelete.length === 0) return fetchedItems;

    for (const item of toDelete) {
      if (item.notificationIds?.length) {
        await cancelReminders(item.notificationIds);
      } else if (item.notificationId) {
        await cancelReminder(item.notificationId);
      }
      await dbDeleteItem(item.id);
    }

    return fetchedItems.filter((item) => item.expirationDate >= cutoffStr);
  };

  const applyRecurrence = async (fetchedItems: Item[]) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedItems: Item[] = [];

    for (const item of fetchedItems) {
      if (!item.recurrenceDays || item.recurrenceDays <= 0) {
        updatedItems.push(item);
        continue;
      }
      if (item.expirationDate >= today) {
        updatedItems.push(item);
        continue;
      }

      const expiryDate = new Date(item.expirationDate);
      const nextDate = new Date(expiryDate);
      while (nextDate.toISOString().split('T')[0] < today) {
        nextDate.setDate(nextDate.getDate() + item.recurrenceDays);
      }
      const nextStr = nextDate.toISOString().split('T')[0];

      await dbUpdateItem(item.id, { expirationDate: nextStr });
      const updatedItem = { ...item, expirationDate: nextStr };
      if (Platform.OS !== 'web' && settings.reminderDays.length > 0) {
        const notificationIds = await rescheduleReminders(
          updatedItem,
          settings.reminderDays,
          settings.reminderTime,
          settings.notificationSound
        );
        await dbUpdateItem(item.id, {
          notificationIds,
          notificationId: notificationIds[0] ?? null,
        });
        updatedItem.notificationIds = notificationIds;
        updatedItem.notificationId = notificationIds[0] ?? null;
      }
      updatedItems.push(updatedItem);
    }

    return updatedItems;
  };

  const fetchItems = useCallback(async () => {
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      let fetchedItems = await getAllItems();
      fetchedItems = await applyAutoDelete(fetchedItems);
      fetchedItems = await applyRecurrence(fetchedItems);

      if (isMounted.current) {
        setItems(fetchedItems);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch items');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [filter, settings.autoDeleteExpiredDays, settings.reminderDays, settings.reminderTime, settings.notificationSound]);

  useEffect(() => {
    isMounted.current = true;
    fetchItems();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchItems]);

  const addItem = useCallback(
    async (newItem: NewItem): Promise<Item | null> => {
      try {
        const id = await dbAddItem(newItem);
        const item = await getItemById(id);

        // Schedule notification (skip on web)
        if (item && settings.reminderDays.length > 0 && Platform.OS !== 'web') {
          const notificationIds = await scheduleExpiryReminders(
            item,
            settings.reminderDays,
            settings.reminderTime,
            settings.notificationSound
          );

          if (notificationIds.length > 0) {
            await dbUpdateItem(id, {
              notificationIds,
              notificationId: notificationIds[0] ?? null,
            });
            item.notificationIds = notificationIds;
            item.notificationId = notificationIds[0] ?? null;
          }
        }

        await fetchItems();
        return item;
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to add item');
        }
        return null;
      }
    },
    [fetchItems, settings.reminderDays, settings.reminderTime, settings.notificationSound]
  );

  const updateItem = useCallback(
    async (
      id: number,
      updates: Partial<NewItem>
    ): Promise<boolean> => {
      try {
        await dbUpdateItem(id, updates);

        // If expiration date changed, reschedule notification (skip on web)
        if (updates.expirationDate && Platform.OS !== 'web') {
          const item = await getItemById(id);
          if (item && settings.reminderDays.length > 0) {
            const notificationIds = await rescheduleReminders(
              item,
              settings.reminderDays,
              settings.reminderTime,
              settings.notificationSound
            );
            await dbUpdateItem(id, {
              notificationIds,
              notificationId: notificationIds[0] ?? null,
            });
          }
        }

        await fetchItems();
        return true;
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to update item');
        }
        return false;
      }
    },
    [fetchItems, settings.reminderDays, settings.reminderTime, settings.notificationSound]
  );

  const deleteItem = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const item = await getItemById(id);
        if (item?.notificationIds?.length && Platform.OS !== 'web') {
          await cancelReminders(item.notificationIds);
        } else if (item?.notificationId && Platform.OS !== 'web') {
          await cancelReminder(item.notificationId);
        }

        await dbDeleteItem(id);
        await fetchItems();
        return true;
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Failed to delete item');
        }
        return false;
      }
    },
    [fetchItems]
  );

  const refresh = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    filter,
    setFilter,
    addItem,
    updateItem,
    deleteItem,
    refresh,
  };
}

export function useItem(id: number) {
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const fetchItem = useCallback(async () => {
    try {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }
      const fetchedItem = await getItemById(id);
      if (isMounted.current) {
        setItem(fetchedItem);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch item');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    isMounted.current = true;
    fetchItem();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchItem]);

  return { item, loading, error, refresh: fetchItem };
}
