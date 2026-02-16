import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useStatsStore } from '@/store/statsStore';
import { useGoalStore } from '@/store/goalStore';
import { useFocusStore } from '@/store/focusStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { playSessionSound, schedulePhaseNotification } from '@/utils/notifications/notificationService';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

export default function DebugTestScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { recordSession, resetProgress, dailyHistory } = useStatsStore();
  const { goals } = useGoalStore();
  const activeSession = useFocusStore(s => s.activeSession);
  const { blocks } = useScheduleStore();
  const { settings } = useSettingsStore();

  const handleAddMockSessions = () => {
    if (goals.length === 0) {
      Alert.alert("No Goals", "Create a goal first to record stats against it.");
      return;
    }
    const goalId = goals[0].id;
    // Record 3 sessions of 25 mins each
    for (let i = 0; i < 3; i++) {
        recordSession({ goalId, minutes: 25 });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Success", "Added 3 mock sessions (75m total) for today.");
  };

  const handleTestNotification = async (delaySeconds: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (delaySeconds === 0) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Test Notification",
                body: "This is an immediate test notification.",
                sound: true,
            },
            trigger: null,
        });
    } else {
        await schedulePhaseNotification(
            'work', 
            delaySeconds, 
            'Test Goal', 
            settings.notificationSound, 
            settings.notificationVibration
        );
        Alert.alert("Scheduled", `Notification will appear in ${delaySeconds} seconds.`);
    }
  };

  const handleTestSound = async () => {
    await playSessionSound(settings.notificationSound);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="chevron.left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Debug & Test</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Stat Testing</Text>
          <TouchableOpacity 
            style={[styles.testCard, { backgroundColor: theme.card }]}
            onPress={handleAddMockSessions}
          >
            <IconSymbol name="plus.circle.fill" size={24} color={theme.primary} />
            <Text style={[styles.testLabel, { color: theme.text }]}>Add 3 Mock Sessions (Today)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testCard, { backgroundColor: theme.card }]}
            onPress={() => {
                Alert.alert("Reset Stats", "Are you sure? This clears all history.", [
                    { text: "Cancel", style: 'cancel' },
                    { text: "Reset", style: 'destructive', onPress: resetProgress }
                ]);
            }}
          >
            <IconSymbol name="trash.fill" size={24} color="#EF4444" />
            <Text style={[styles.testLabel, { color: '#EF4444' }]}>Clear All Stats History</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notification & Audio</Text>
          <TouchableOpacity 
            style={[styles.testCard, { backgroundColor: theme.card }]}
            onPress={() => handleTestNotification(0)}
          >
            <IconSymbol name="bell.fill" size={24} color="#FBBF24" />
            <Text style={[styles.testLabel, { color: theme.text }]}>Trigger Immediate Notification</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testCard, { backgroundColor: theme.card }]}
            onPress={() => handleTestNotification(10)}
          >
            <IconSymbol name="timer" size={24} color="#3B82F6" />
            <Text style={[styles.testLabel, { color: theme.text }]}>Trigger Notification in 10s</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testCard, { backgroundColor: theme.card }]}
            onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // We use a mock session to test the full session notification logic
                const mockSession: any = {
                    id: 'test-session',
                    label: 'Test Focus Block',
                    startHour: new Date().getHours() + (new Date().getMinutes() + 1) / 60,
                    duration: 1,
                    dayIndex: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
                    relatedGoalId: 'test-goal'
                };
                
                // This will trigger all the logic in scheduleSessionNotifications
                // but we only care about the immediate-ish one.
                // For direct testing of sound/vibration with user settings:
                const { settings } = require('@/store/settingsStore').useSettingsStore.getState();
                
                await Notifications.scheduleNotificationAsync({
                   content: {
                     title: "Focus Flow Test",
                     body: "Sound/Vibration test (Respecting your settings)",
                     sound: settings.notificationSound,
                     vibrate: settings.notificationVibration ? [0, 500, 200, 500] : undefined,
                   },
                   trigger: { 
                     type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                     seconds: 5 
                   } as any,
                });
                
                Alert.alert("Scheduled", "Test notification in 5 seconds. Please background the app now!");
            }}
          >
            <IconSymbol name="checkmark.seal.fill" size={24} color={theme.primary} />
            <Text style={[styles.testLabel, { color: theme.text }]}>Test Full Focus Reminder (5s)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testCard, { backgroundColor: theme.card }]}
            onPress={handleTestSound}
          >
            <IconSymbol name="speaker.wave.3.fill" size={24} color="#10B981" />
            <Text style={[styles.testLabel, { color: theme.text }]}>Play Phase Completion Sound</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>State Inspector</Text>
          <View style={[styles.inspectorCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.inspectorText, { color: theme.text }]}>
               Today's Mins: {dailyHistory[new Date().toISOString().split('T')[0]]?.minutes || 0}
            </Text>
            <Text style={[styles.inspectorText, { color: theme.text }]}>
               Today's Sessions: {dailyHistory[new Date().toISOString().split('T')[0]]?.sessions || 0}
            </Text>
            <Text style={[styles.inspectorText, { color: theme.text }]}>
               Active Session: {activeSession ? activeSession.goalName : 'None'}
            </Text>
            <Text style={[styles.inspectorText, { color: theme.text }]}>
               Total Blocks: {blocks.length}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    opacity: 0.6,
  },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 15,
  },
  testLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  inspectorCard: {
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  inspectorText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
});
