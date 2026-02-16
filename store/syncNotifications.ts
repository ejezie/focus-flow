import * as Notifications from 'expo-notifications';
import { useSettingsStore } from './settingsStore';
import { useScheduleStore } from './scheduleStore';
import { refreshAllNotifications } from '@/utils/notifications/notificationService';

export const syncNotifications = async () => {
  const { blocks } = useScheduleStore.getState();
  const { settings } = useSettingsStore.getState();
  
  await refreshAllNotifications(
    blocks, 
    settings.reminderMinutes,
    settings.notificationsEnabled,
    settings.notificationSound,
    settings.notificationVibration
  );
};
