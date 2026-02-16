import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useScheduleStore } from '@/store/scheduleStore';
import { useGoalStore } from '@/store/goalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { GoalProgressCard } from '@/components/focus/GoalProgressCard';
import { UpcomingSessionCard } from '@/components/focus/UpcomingSessionCard';
import { DailyTimeline } from '@/components/focus/DailyTimeline';
import { TimeSettingsCard } from '@/components/focus/TimeSettingsCard';
import { NotificationSettingsCard } from '@/components/focus/NotificationSettingsCard';
import { getCurrentDayIndex, getCurrentHourFraction } from '@/utils/time/timeUtils';
import { PomodoroSettingsCard } from '@/components/focus/PomodoroSettingsCard';
import { FocusWeekView } from '@/components/focus/FocusWeekView';
import { useFocusStore } from '@/store/focusStore';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function FocusScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const startSession = useFocusStore((state) => state.startSession);
  const activeSession = useFocusStore((state) => state.activeSession);
  const blocks = useScheduleStore((state) => state.blocks);
  const deleteBusyBlock = useScheduleStore((state) => state.deleteBusyBlock);
  const goals = useGoalStore((state) => state.goals);

  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  const { settings } = useSettingsStore();
  
  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const focusSessions = useMemo(() => blocks.filter(b => b.relatedGoalId !== undefined), [blocks]);

  // Today's sessions
  const today = getCurrentDayIndex();
  const currentHour = getCurrentHourFraction();
  
  const todaySessions = useMemo(() => 
    focusSessions.filter(s => s.dayIndex === today),
    [focusSessions, today]
  );

  const upcomingSession = useMemo(() => {
      // 1. Check for session in progress
      const inProgress = todaySessions.find(s => 
        s.startHour <= currentHour && 
        (s.startHour + s.duration) > currentHour
      );
      if (inProgress) return inProgress;

      // 2. Otherwise get next upcoming
      const upcoming = todaySessions
          .filter(s => s.startHour > currentHour)
          .sort((a, b) => a.startHour - b.startHour);
          
      return upcoming[0] || null;
  }, [todaySessions, currentHour]);

  // Capacity calculation
  const capacity = useMemo(() => {
      const wakingHours = settings.sleepTime > settings.wakeTime 
          ? settings.sleepTime - settings.wakeTime 
          : (24 - settings.wakeTime) + settings.sleepTime;
      return wakingHours * 7;
  }, [settings]);

  const totalScheduled = useMemo(() => 
      focusSessions.reduce((acc, s) => acc + s.duration, 0),
      [focusSessions]
  );

  // Calculate goal progress based on ALL scheduled sessions (not just today)
  const goalProgressMap = useMemo(() => {
    const stats: Record<string, number> = {};
    focusSessions.forEach(s => {
      if (s.relatedGoalId) {
        stats[s.relatedGoalId] = (stats[s.relatedGoalId] || 0) + s.duration;
      }
    });
    return stats;
  }, [focusSessions]);

  const handleStartSession = useCallback((session: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startSession({
      goalId: session.relatedGoalId || 'default',
      goalName: session.label,
      workDuration: settings.pomodoroWorkDuration,
      breakDuration: settings.pomodoroBreakDuration,
      longBreakDuration: settings.pomodoroLongBreakDuration,
      sessionsBeforeLongBreak: settings.pomodoroSessionsBeforeLongBreak,
      totalPomodoros: Math.ceil((session.duration * 60) / settings.pomodoroWorkDuration),
    });
    router.push('/focus/active');
  }, [settings]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <View>
            <Text style={[styles.title, { color: theme.text }]}>Focus Dashboard</Text>
            <Text style={[styles.capacityText, { color: theme.icon }]}>
                {totalScheduled.toFixed(1)}h scheduled of {capacity}h available this week
            </Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            onPress={() => setViewMode('dashboard')} 
            style={[styles.toggleBtn, viewMode === 'dashboard' && { backgroundColor: theme.primary }]}
          >
            <IconSymbol name="chart.bar.fill" size={16} color={viewMode === 'dashboard' ? '#FFF' : theme.icon} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('calendar')} 
            style={[styles.toggleBtn, viewMode === 'calendar' && { backgroundColor: theme.primary }]}
          >
            <IconSymbol name="calendar" size={16} color={viewMode === 'calendar' ? '#FFF' : theme.icon} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
      >
        {viewMode === 'dashboard' ? (
          <>
            {/* Upcoming Session */}
            {upcomingSession ? (
              <UpcomingSessionCard 
                session={upcomingSession} 
                onStart={() => handleStartSession(upcomingSession)} 
              />
            ) : (
                <View style={[styles.noSessionCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.noSessionText, { color: theme.icon }]}>No sessions left for today!</Text>
                </View>
            )}

            {/* Goal Progress Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Progress</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalGoals}>
                {goals.length > 0 ? (
                  goals.map(goal => (
                    <GoalProgressCard 
                      key={goal.id} 
                      goal={goal} 
                      scheduledHours={goalProgressMap[goal.id] || 0} 
                    />
                  ))
                ) : (
                  <Text style={{ color: theme.icon, fontSize: 13, marginTop: 10 }}>Create goals to track progress.</Text>
                )}
              </ScrollView>
            </View>

            {/* Daily Timeline */}
            <DailyTimeline sessions={todaySessions} />

            {/* Preferences */}
            <PomodoroSettingsCard />
            <TimeSettingsCard />
            <NotificationSettingsCard />
          </>
        ) : (
          <View style={{ flex: 1, minHeight: 600 }}>
             <FocusWeekView 
                blocks={blocks}
                onSessionPress={(s) => Alert.alert(s.label, "Time to focus!")}
                onSessionLongPress={(s) => Alert.alert("Manage", "Session selected")}
             />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  capacityText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  noSessionCard: {
      padding: 30,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 10,
  },
  noSessionText: {
      fontSize: 14,
      fontWeight: '500',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  horizontalGoals: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  }
});
