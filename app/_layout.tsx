import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { requestNotificationPermissions, setupNotificationCategories } from '@/utils/notifications/notificationService';
import { MiniPlayer } from '@/components/focus/MiniPlayer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Configure foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function initNotifications() {
      try {
        await requestNotificationPermissions();
        await setupNotificationCategories();
      } catch (error) {
        console.warn('[RootLayout] Notification init failed:', error);
      }
    }
    initNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { actionIdentifier, notification } = response;

      if (actionIdentifier === 'SNOOZE_10') {
        Notifications.scheduleNotificationAsync({
          content: {
            title: `Snooze finished: ${notification.request.content.title}`,
            body: `10 minutes are up. Time to focus!`,
            categoryIdentifier: 'SESSION_REPRODUCTION',
            data: notification.request.content.data,
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 600 
          },
        });
      } else if (actionIdentifier === 'START_NOW') {
          Alert.alert("Focus Flow", "Session started from notification!");
      }
    });

    return () => subscription.remove();
  }, []);

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
      card: Colors.dark.card,
      text: Colors.dark.text,
      primary: Colors.dark.primary,
    },
  };

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.background,
      card: Colors.light.card,
      text: Colors.light.text,
      primary: Colors.light.primary,
    },
  };

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
        <View style={styles.root}>
          <Stack
            screenOptions={{
              animation: 'slide_from_right',
              animationDuration: 250,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen 
              name="focus/active" 
              options={{ 
                headerShown: false, 
                presentation: 'fullScreenModal', 
                gestureEnabled: false,
                animation: 'slide_from_bottom',
              }} 
            />
            <Stack.Screen 
              name="settings" 
              options={{ 
                title: 'Settings', 
                presentation: 'modal',
                animation: 'slide_from_bottom',
                headerShown: false,
              }} 
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <MiniPlayer />
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
