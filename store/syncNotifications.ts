import {
    cancelNagNotifications,
    refreshAllNotifications,
} from "@/utils/notifications/notificationService";
import { useFocusStore } from "./focusStore";
import { useScheduleStore } from "./scheduleStore";
import { useSettingsStore } from "./settingsStore";

export const syncNotifications = async () => {
  const { blocks } = useScheduleStore.getState();
  const { settings } = useSettingsStore.getState();
  const { activeSession } = useFocusStore.getState();

  await refreshAllNotifications(
    blocks,
    settings.reminderMinutes,
    settings.notificationsEnabled,
    settings.notificationSound,
    settings.notificationVibration,
  );

  // If a pomodoro is actively running, cancel nag notifications
  // so user doesn't get "Still haven't started?" while focusing
  if (activeSession && !activeSession.isFinished) {
    await cancelNagNotifications();
  }
};
