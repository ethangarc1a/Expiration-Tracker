import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { initDatabase } from '../services/database';
import { requestNotificationPermissions } from '../services/notifications';
import { useAppTheme } from '../hooks/useAppTheme';

export default function RootLayout() {
  const { isDark, colors } = useAppTheme();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize database and permissions on app start
    async function initialize() {
      try {
        await initDatabase();
        // Skip notification permissions on web
        if (Platform.OS !== 'web') {
          await requestNotificationPermissions();
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    }

    initialize();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="item/[id]"
          options={{
            title: 'Item Details',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}
