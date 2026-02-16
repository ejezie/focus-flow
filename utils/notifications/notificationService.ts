import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { ScheduleBlock } from '@/constants/types/schedule';
import { useSettingsStore } from '@/store/settingsStore';

// Configure notification categories for actions
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('SESSION_REPRODUCTION', [
    {
      identifier: 'START_NOW',
      buttonTitle: 'Start Now',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SNOOZE_10',
      buttonTitle: 'Snooze 10 min',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'DISMISS',
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

// Request permissions
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });
  }
  
  return true;
}

// Map app DayIndex (0=Mon) to Expo weekday (1=Sun)
function mapToExpoWeekday(dayIndex: number) {
  return ((dayIndex + 1) % 7) + 1;
}

// Schedule notifications for a block
export async function scheduleSessionNotifications(
  session: ScheduleBlock, 
  reminderMinutes: number
) {
  if (!session.relatedGoalId) return [];

  const ids: string[] = [];
  
  // Calculate base trigger (start of session)
  const hour = Math.floor(session.startHour);
  const minute = Math.round((session.startHour % 1) * 60);
  const weekday = mapToExpoWeekday(session.dayIndex);

  // 1. Pre-session reminder
  // We need to calculate the correct day relative to today to find the weekday
  // But Expo uses absolute weekdays. 
  // Let's create a date for 'this week's' occurrence of the session
  const now = new Date();
  const sessionDate = new Date();
  const daysUntil = (session.dayIndex - (now.getDay() === 0 ? 6 : now.getDay() - 1) + 7) % 7;
  sessionDate.setDate(now.getDate() + daysUntil);
  sessionDate.setHours(hour, minute, 0, 0);

  const reminderDate = new Date(sessionDate.getTime() - reminderMinutes * 60000);
  
  const reminderId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Upcoming: ${session.label}`,
      body: `Starting in ${reminderMinutes} minutes. Ready to focus?`,
      categoryIdentifier: 'SESSION_REPRODUCTION',
      data: { sessionId: session.id, type: 'REMINDER' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday: mapToExpoWeekday(reminderDate.getDay() === 0 ? 6 : reminderDate.getDay() - 1),
      hour: reminderDate.getHours(),
      minute: reminderDate.getMinutes(),
      repeats: true,
    },
  });
  ids.push(reminderId);

  // 2. Session start notification
  const startId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to focus on ${session.label}`,
      body: `Duration: ${Math.round(session.duration * 60)} minutes. Let's go!`,
      categoryIdentifier: 'SESSION_REPRODUCTION',
      data: { sessionId: session.id, type: 'START' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday,
      hour,
      minute,
      repeats: true,
    },
  });
  ids.push(startId);

  // 3. Session end notification
  const endHour = Math.floor(session.startHour + session.duration);
  const endMin = Math.round(((session.startHour + session.duration) % 1) * 60);
  
  const endId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Session Complete!`,
      body: `Great job focusing on ${session.label}. Take a break!`,
      data: { sessionId: session.id, type: 'END' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday,
      hour: endHour,
      minute: endMin,
      repeats: true,
    },
  });
  ids.push(endId);

  // 4. Missed session reminder (15 min after start)
  const missedDate = new Date(sessionDate.getTime() + 15 * 60000);

  const missedId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Missed your session?`,
      body: `You should have started "${session.label}" 15 minutes ago. It's not too late!`,
      categoryIdentifier: 'SESSION_REPRODUCTION',
      data: { sessionId: session.id, type: 'MISSED' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      weekday: mapToExpoWeekday(missedDate.getDay() === 0 ? 6 : missedDate.getDay() - 1),
      hour: missedDate.getHours(),
      minute: missedDate.getMinutes(),
      repeats: true,
    },
  });
  ids.push(missedId);

  return ids;
}

// Cancel all notifications for a list of blocks
export async function cancelSessionNotifications(blockIds: string[]) {
  // Expo doesn't support batch cancel by data, we have to fetch all and filter or track IDs
  // For simplicity, we'll cancel all and let the store or a higher level manage it if needed
  // Alternatively, we can use identifiers.
  // Actually, we should probably just clear all and re-schedule for efficiency when many changes happen
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Re-schedule all notifications for all focus sessions
export async function refreshAllNotifications(blocks: ScheduleBlock[], reminderMinutes: number) {
  const { settings } = useSettingsStore.getState();
  if (!settings.notificationsEnabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  
  const focusSessions = blocks.filter(b => b.relatedGoalId !== undefined);
  for (const session of focusSessions) {
    await scheduleSessionNotifications(session, reminderMinutes);
  }
}

// Utility to play sound immediately
export async function playSessionSound() {
  const { settings } = useSettingsStore.getState();
  if (!settings.notificationSound) return;

  try {
    const player = createAudioPlayer(require('@/assets/sounds/complete.mp3'));
    
    // Play immediately
    player.play();

    // Release after playing
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        player.release();
        subscription.remove();
      }
    });
  } catch (error) {
    console.warn('[NotificationService] Error playing sound:', error);
  }
}

// Schedule a notification for a Pomodoro phase change
export async function schedulePhaseNotification(
  phase: string, 
  seconds: number, 
  goalName: string
) {
  // Cancel previous phase notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  const endId = await Notifications.scheduleNotificationAsync({
    content: {
      title: phase === 'work' ? 'Time for a break!' : 'Back to work!',
      body: phase === 'work' 
        ? `You finished a work block for ${goalName}.` 
        : `Ready for your next focus block?`,
      sound: true,
      vibrate: [0, 500, 200, 500],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.floor(seconds)),
    },
  });
  
  return endId;
}

export async function cancelPhaseNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
