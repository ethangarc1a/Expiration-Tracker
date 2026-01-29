import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Item } from '../types';
import { parseStoredDate } from './dateParser';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('expiry-reminders', {
      name: 'Expiry Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B6B',
    });
  }

  return true;
}

function getReminderDate(
  expirationDate: Date,
  daysBeforeExpiry: number,
  reminderTime: { hour: number; minute: number }
): Date {
  const reminderDate = new Date(expirationDate);
  reminderDate.setDate(reminderDate.getDate() - daysBeforeExpiry);
  reminderDate.setHours(reminderTime.hour, reminderTime.minute, 0, 0);
  return reminderDate;
}

export async function scheduleExpiryReminder(
  item: Item,
  daysBeforeExpiry: number,
  reminderTime: { hour: number; minute: number },
  playSound: boolean
): Promise<string | null> {
  const expirationDate = parseStoredDate(item.expirationDate);
  const reminderDate = getReminderDate(expirationDate, daysBeforeExpiry, reminderTime);
  const now = new Date();

  if (reminderDate <= now) {
    return null;
  }

  const secondsUntilReminder = Math.floor(
    (reminderDate.getTime() - now.getTime()) / 1000
  );

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Expiration Reminder',
        body: `"${item.name}" expires ${daysBeforeExpiry === 0 ? 'today' : `in ${daysBeforeExpiry} day${daysBeforeExpiry > 1 ? 's' : ''}`}!`,
        data: { itemId: item.id },
        sound: playSound,
      },
      trigger: {
        seconds: secondsUntilReminder,
        channelId: Platform.OS === 'android' ? 'expiry-reminders' : undefined,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

export async function scheduleExpiryReminders(
  item: Item,
  daysBeforeExpiry: number[],
  reminderTime: { hour: number; minute: number },
  playSound: boolean
): Promise<string[]> {
  const scheduled: string[] = [];
  const uniqueDays = Array.from(new Set(daysBeforeExpiry)).filter((d) => d >= 0);
  for (const days of uniqueDays) {
    const id = await scheduleExpiryReminder(item, days, reminderTime, playSound);
    if (id) scheduled.push(id);
  }
  return scheduled;
}

export async function cancelReminder(
  notificationId: string | null
): Promise<void> {
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
}

export async function cancelReminders(notificationIds: string[]): Promise<void> {
  for (const id of notificationIds) {
    await cancelReminder(id);
  }
}

export async function rescheduleReminder(
  item: Item,
  daysBeforeExpiry: number,
  reminderTime: { hour: number; minute: number },
  playSound: boolean
): Promise<string | null> {
  // Cancel existing notification if any
  await cancelReminder(item.notificationId);

  // Schedule new notification
  return scheduleExpiryReminder(item, daysBeforeExpiry, reminderTime, playSound);
}

export async function rescheduleReminders(
  item: Item,
  daysBeforeExpiry: number[],
  reminderTime: { hour: number; minute: number },
  playSound: boolean
): Promise<string[]> {
  await cancelReminders(item.notificationIds ?? []);
  return scheduleExpiryReminders(item, daysBeforeExpiry, reminderTime, playSound);
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
}

export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  return Notifications.getAllScheduledNotificationsAsync();
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
