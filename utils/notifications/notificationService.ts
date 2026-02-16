import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { ScheduleBlock } from '@/constants/types/schedule';

// Configure notification categories for actions
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('SESSION_REPRODUCTION', [
    {
      identifier: 'START_NOW',
      buttonTitle: 'Start Now',
      options: { opensAppToForeground: true },
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
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lightColor: '#6366F1',
      showBadge: true,
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
  reminderMinutes: number,
  notificationSound: boolean,
  notificationVibration: boolean
) {
  if (!session.relatedGoalId) return [];

  const ids: string[] = [];
  const now = new Date();
  
  // Calculate relative occurrence
  const hour = Math.floor(session.startHour);
  const minute = Math.round((session.startHour % 1) * 60);
  
  // Find the next occurrence of this session
  let sessionDate = new Date();
  const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
  let daysUntil = (session.dayIndex - currentDay + 7) % 7;
  
  sessionDate.setDate(now.getDate() + daysUntil);
  sessionDate.setHours(hour, minute, 0, 0);

  // If session is today but time already passed, move to next week
  if (sessionDate.getTime() <= now.getTime()) {
    sessionDate.setDate(sessionDate.getDate() + 7);
  }

  const scheduleLocal = async (
    title: string, 
    body: string, 
    date: Date, 
    type: string, 
    sound: boolean = true, 
    vibrate: boolean = true
  ) => {
    const secondsFromNow = Math.round((date.getTime() - now.getTime()) / 1000);
    
    // Safety check: if time already passed, don't schedule
    if (secondsFromNow <= 0 && type !== 'START') return null;

    // For Android/Interval-based, we use seconds from now. 
    // This is more reliable than DATE trigger for some Expo versions.
    const trigger: any = Platform.OS === 'android' 
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, secondsFromNow),
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: date.getDay() + 1, // Sun=0 in JS, Sun=1 in Expo
          hour: date.getHours(),
          minute: date.getMinutes(),  
          repeats: true,
        };

    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          categoryIdentifier: 'SESSION_REPRODUCTION',
          data: { sessionId: session.id, type },
          sound: notificationSound ? sound : false,
          vibrate: notificationVibration ? (vibrate ? [0, 250, 250, 250] : undefined) : undefined,
        },
        trigger,
      });
    } catch (e) {
      console.warn(`[NotificationService] Failed to schedule ${type}:`, e);
      return null;
    }
  };

  // 1. Pre-session reminder
  const reminderDate = new Date(sessionDate.getTime() - reminderMinutes * 60000);
  if (reminderDate.getTime() > now.getTime()) {
      const rid = await scheduleLocal(
        `Upcoming: ${session.label}`,
        `Starting in ${reminderMinutes} minutes. Ready to focus?`,
        reminderDate,
        'REMINDER',
        true,
        true
      );
      if (rid) ids.push(rid);
  }

  // 2. Session start notification
  const sid = await scheduleLocal(
    `Time to focus on ${session.label}`,
    `Duration: ${Math.round(session.duration * 60)} minutes. Let's go!`,
    sessionDate,
    'START',
    true,
    true
  );
  if (sid) ids.push(sid);

  // 3. Periodic "Nag" reminders (First 30% of session)
  const sessionDurationMs = session.duration * 3600000;
  const nagLimitMs = sessionDurationMs * 0.3;
  const nagIntervalMs = 5 * 60000; // Nag every 5 minutes

  for (let offsetMs = nagIntervalMs; offsetMs <= nagLimitMs; offsetMs += nagIntervalMs) {
      const nagDate = new Date(sessionDate.getTime() + offsetMs);
      const nagId = await scheduleLocal(
        `Still haven't started?`,
        `Your session "${session.label}" is currently active. Don't lose your focus!`,
        nagDate,
        'NAG',
        true,
        true
      );
      if (nagId) ids.push(nagId);
  }

  // 4. Session end notification
  const endHour = Math.floor(session.startHour + session.duration);
  const endMin = Math.round(((session.startHour + session.duration) % 1) * 60);
  const endDate = new Date(sessionDate);
  endDate.setHours(endHour, endMin, 0, 0);

  const eid = await scheduleLocal(
    `Session Complete!`,
    `Great job focusing on ${session.label}. Take a break!`,
    endDate,
    'END',
    true,
    true
  );
  if (eid) ids.push(eid);

  return ids;
}

// Cancel all notifications for a list of blocks
export async function cancelSessionNotifications(blockIds: string[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Re-schedule all notifications for all focus sessions
export async function refreshAllNotifications(
    blocks: ScheduleBlock[], 
    reminderMinutes: number,
    notificationsEnabled: boolean,
    notificationSound: boolean,
    notificationVibration: boolean
) {
  if (!notificationsEnabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  
  const focusSessions = blocks.filter(b => b.relatedGoalId !== undefined);
  for (const session of focusSessions) {
    await scheduleSessionNotifications(session, reminderMinutes, notificationSound, notificationVibration);
  }
}

// Utility to play sound immediately
export async function playSessionSound(notificationSound: boolean) {
  if (!notificationSound) return;

  try {
    const player = createAudioPlayer(require('@/assets/sounds/complete.mp3'));
    
    // Play immediately
    player.play();

    // Release after playing
    const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
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
  goalName: string,
  notificationSound: boolean,
  notificationVibration: boolean
) {
  // Cancel previous phase notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  const endId = await Notifications.scheduleNotificationAsync({
    content: {
      title: phase === 'work' ? 'Time for a break!' : 'Back to work!',
      body: phase === 'work' 
        ? `You finished a work block for ${goalName}.` 
        : `Ready for your next focus block?`,
      sound: notificationSound,
      vibrate: notificationVibration ? [0, 500, 200, 500] : undefined,
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
