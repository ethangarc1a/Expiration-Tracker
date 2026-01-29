import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from '../services/notifications';

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const checkPermissions = async () => {
      // Skip on web - notifications not supported
      if (Platform.OS === 'web') {
        if (isMounted.current) {
          setHasPermission(false);
          setLoading(false);
        }
        return;
      }

      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (isMounted.current) {
          setHasPermission(status === 'granted');
        }
      } catch (error) {
        console.error('Failed to check notification permissions:', error);
        if (isMounted.current) {
          setHasPermission(false);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    checkPermissions();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    
    try {
      const granted = await requestNotificationPermissions();
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }, []);

  return {
    hasPermission,
    loading,
    requestPermissions,
  };
}

export function useNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (itemId: number) => void
) {
  useEffect(() => {
    const subscriptions: Notifications.Subscription[] = [];

    if (onNotificationReceived) {
      subscriptions.push(addNotificationReceivedListener(onNotificationReceived));
    }

    if (onNotificationResponse) {
      subscriptions.push(
        addNotificationResponseReceivedListener((response) => {
          const itemId = response.notification.request.content.data?.itemId;
          if (typeof itemId === 'number') {
            onNotificationResponse(itemId);
          }
        })
      );
    }

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, [onNotificationReceived, onNotificationResponse]);
}
