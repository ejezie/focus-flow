import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MiniPlayer } from "@/components/focus/MiniPlayer";
import { PomodoroGlobalListener } from "@/components/focus/PomodoroGlobalListener";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    requestNotificationPermissions,
    setupNotificationCategories,
} from "@/utils/notifications/notificationService";

// Configure foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function initNotifications() {
      try {
        await requestNotificationPermissions();
        await setupNotificationCategories();
        // Import and call syncNotifications to refresh triggers on app boot
        const { syncNotifications } = await import("@/store/syncNotifications");
        await syncNotifications();
      } catch (error) {
        console.warn("[RootLayout] Notification init failed:", error);
      }
    }
    initNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { actionIdentifier, notification } = response;

        if (
          actionIdentifier === "START_NOW" ||
          actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
        ) {
          const sessionId = notification.request.content.data?.sessionId;
          if (!sessionId) return;

          const focusStore = (
            await import("@/store/focusStore")
          ).useFocusStore.getState();

          // If a pomodoro is already running, just navigate to it
          if (focusStore.hasActiveSession()) {
            console.log(
              "[RootLayout] Active session exists — navigating to it instead of starting new",
            );
            const { router } = await import("expo-router");
            router.push("/focus/active");
            return;
          }

          const { blocks } = (
            await import("@/store/scheduleStore")
          ).useScheduleStore.getState();
          const { settings } = (
            await import("@/store/settingsStore")
          ).useSettingsStore.getState();

          const session = blocks.find((b) => b.id === sessionId);
          if (session) {
            focusStore.startSession({
              goalId: session.relatedGoalId || "default",
              goalName: session.label,
              workDuration: settings.pomodoroWorkDuration,
              breakDuration: settings.pomodoroBreakDuration,
              longBreakDuration: settings.pomodoroLongBreakDuration,
              sessionsBeforeLongBreak: settings.pomodoroSessionsBeforeLongBreak,
              totalPomodoros: Math.ceil(
                (session.duration * 60) / settings.pomodoroWorkDuration,
              ),
            });
            const { router } = await import("expo-router");
            router.push("/focus/active");
          }
        }
      },
    );

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
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomLightTheme}
      >
        <View style={styles.root}>
          <Stack
            screenOptions={{
              animation: "slide_from_right",
              animationDuration: 250,
            }}
          >
            <Stack.Screen
              name="index"
              options={{ headerShown: false, animation: "fade" }}
            />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, animation: "fade" }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false, animation: "fade" }}
            />
            <Stack.Screen
              name="focus/active"
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
                gestureEnabled: false,
                animation: "slide_from_bottom",
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                title: "Settings",
                presentation: "modal",
                animation: "slide_from_bottom",
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <MiniPlayer />
          <PomodoroGlobalListener />
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
