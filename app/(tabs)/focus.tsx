import { DailyTimeline } from "@/components/focus/DailyTimeline";
import { FocusWeekView } from "@/components/focus/FocusWeekView";
import { GoalProgressCard } from "@/components/focus/GoalProgressCard";
import { NotificationSettingsCard } from "@/components/focus/NotificationSettingsCard";
import { PomodoroSettingsCard } from "@/components/focus/PomodoroSettingsCard";
import { TimeSettingsCard } from "@/components/focus/TimeSettingsCard";
import { UpcomingSessionCard } from "@/components/focus/UpcomingSessionCard";
import { CalendarSettings } from "@/components/settings/CalendarSettings";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFocusStore } from "@/store/focusStore";
import { useGoalStore } from "@/store/goalStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useStatsStore } from "@/store/statsStore";
import {
    getCurrentDayIndex,
    getCurrentHourFraction,
} from "@/utils/time/timeUtils";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FocusScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const startSession = useFocusStore((state) => state.startSession);
  const activeSession = useFocusStore((state) => state.activeSession);
  const blocks = useScheduleStore((state) => state.blocks);
  const deleteBusyBlock = useScheduleStore((state) => state.deleteBusyBlock);
  const refreshCalendarEvents = useScheduleStore(
    (state) => state.refreshCalendarEvents,
  );
  const goals = useGoalStore((state) => state.goals);

  const [viewMode, setViewMode] = useState<"dashboard" | "calendar">(
    "dashboard",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [calendarSettingsVisible, setCalendarSettingsVisible] = useState(false);

  useEffect(() => {
    refreshCalendarEvents();
  }, []);

  const { settings } = useSettingsStore();
  const { goalStats } = useStatsStore();
  const [goalPickerVisible, setGoalPickerVisible] = useState(false);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const focusSessions = useMemo(
    () => blocks.filter((b) => b.relatedGoalId !== undefined),
    [blocks],
  );

  // Today's sessions
  const today = getCurrentDayIndex();
  const currentHour = getCurrentHourFraction();

  const todaySessions = useMemo(
    () => focusSessions.filter((s) => s.dayIndex === today),
    [focusSessions, today],
  );

  const upcomingSession = useMemo(() => {
    // 1. Check for session in progress
    const inProgress = todaySessions.find(
      (s) =>
        s.startHour <= currentHour && s.startHour + s.duration > currentHour,
    );
    if (inProgress) return inProgress;

    // 2. Otherwise get next upcoming
    const upcoming = todaySessions
      .filter((s) => s.startHour > currentHour)
      .sort((a, b) => a.startHour - b.startHour);

    return upcoming[0] || null;
  }, [todaySessions, currentHour]);

  // Capacity calculation
  const capacity = useMemo(() => {
    const wakingHours =
      settings.sleepTime > settings.wakeTime
        ? settings.sleepTime - settings.wakeTime
        : 24 - settings.wakeTime + settings.sleepTime;
    return wakingHours * 7;
  }, [settings]);

  const totalScheduled = useMemo(
    () => focusSessions.reduce((acc, s) => acc + s.duration, 0),
    [focusSessions],
  );

  // Calculate goal progress based on ALL scheduled sessions (not just today)
  const goalProgressMap = useMemo(() => {
    const stats: Record<string, number> = {};
    focusSessions.forEach((s) => {
      if (s.relatedGoalId) {
        stats[s.relatedGoalId] = (stats[s.relatedGoalId] || 0) + s.duration;
      }
    });
    return stats;
  }, [focusSessions]);

  const handleStartSession = useCallback(
    (session: any) => {
      const sessionParams = {
        goalId: session.relatedGoalId || "default",
        goalName: session.label,
        workDuration: settings.pomodoroWorkDuration,
        breakDuration: settings.pomodoroBreakDuration,
        longBreakDuration: settings.pomodoroLongBreakDuration,
        sessionsBeforeLongBreak: settings.pomodoroSessionsBeforeLongBreak,
        totalPomodoros: Math.ceil(
          (session.duration * 60) / settings.pomodoroWorkDuration,
        ),
      };

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check for existing active session
      if (activeSession && !activeSession.isFinished) {
        Alert.alert(
          "Session In Progress",
          `You already have a session running for "${activeSession.goalName}". What would you like to do?`,
          [
            {
              text: "Continue Session",
              onPress: () => router.push("/focus/active"),
            },
            {
              text: "Discard & Start New",
              style: "destructive",
              onPress: () => {
                useFocusStore.getState().discardAndStartSession(sessionParams);
                router.push("/focus/active");
              },
            },
            { text: "Cancel", style: "cancel" },
          ],
        );
        return;
      }

      startSession(sessionParams);
      router.push("/focus/active");
    },
    [settings, activeSession],
  );

  const handleQuickPomodoro = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (goals.length > 0) {
      setGoalPickerVisible(true);
    } else {
      startQuickSession();
    }
  }, [goals.length]);

  const startQuickSession = (goalId?: string, goalName?: string) => {
    setGoalPickerVisible(false);

    const quickParams = {
      goalId: goalId || "unlinked",
      goalName: goalName || "Quick Focus",
      workDuration: settings.pomodoroWorkDuration,
      breakDuration: settings.pomodoroBreakDuration,
      longBreakDuration: settings.pomodoroLongBreakDuration,
      sessionsBeforeLongBreak: settings.pomodoroSessionsBeforeLongBreak,
      totalPomodoros: 4,
    };

    // Check for existing active session
    if (activeSession && !activeSession.isFinished) {
      Alert.alert(
        "Session In Progress",
        `You already have a session running for "${activeSession.goalName}". What would you like to do?`,
        [
          {
            text: "Continue Session",
            onPress: () => router.push("/focus/active"),
          },
          {
            text: "Discard & Start New",
            style: "destructive",
            onPress: () => {
              useFocusStore.getState().discardAndStartSession(quickParams);
              router.push("/focus/active");
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
      return;
    }

    startSession(quickParams);
    router.push("/focus/active");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            Focus Dashboard
          </Text>
          <Text style={[styles.capacityText, { color: theme.icon }]}>
            {totalScheduled.toFixed(1)}h scheduled of {capacity}h available this
            week
          </Text>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            onPress={() => setCalendarSettingsVisible(true)}
            style={styles.toggleBtn}
          >
            <IconSymbol
              name="calendar.badge.plus"
              size={20}
              color={theme.icon}
            />
          </TouchableOpacity>
          <View
            style={{
              width: 1,
              height: 20,
              backgroundColor: theme.icon,
              opacity: 0.2,
              marginHorizontal: 4,
            }}
          />
          <TouchableOpacity
            onPress={() => setViewMode("dashboard")}
            style={[
              styles.toggleBtn,
              viewMode === "dashboard" && { backgroundColor: theme.primary },
            ]}
          >
            <IconSymbol
              name="chart.bar.fill"
              size={16}
              color={viewMode === "dashboard" ? "#FFF" : theme.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("calendar")}
            style={[
              styles.toggleBtn,
              viewMode === "calendar" && { backgroundColor: theme.primary },
            ]}
          >
            <IconSymbol
              name="calendar"
              size={16}
              color={viewMode === "calendar" ? "#FFF" : theme.icon}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {viewMode === "dashboard" ? (
          <>
            {/* Upcoming Session */}
            {upcomingSession ? (
              <UpcomingSessionCard
                session={upcomingSession}
                onStart={() => handleStartSession(upcomingSession)}
              />
            ) : (
              <View
                style={[styles.noSessionCard, { backgroundColor: theme.card }]}
              >
                <Text style={[styles.noSessionText, { color: theme.icon }]}>
                  No sessions left for today!
                </Text>
              </View>
            )}

            {/* Quick Pomodoro Button */}
            <TouchableOpacity
              onPress={handleQuickPomodoro}
              activeOpacity={0.85}
              style={{ marginBottom: 16 }}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.quickPomodoroBtn}
              >
                <IconSymbol name="timer" size={20} color="#FFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickPomodoroTitle}>Quick Pomodoro</Text>
                  <Text style={styles.quickPomodoroSub}>
                    {settings.pomodoroWorkDuration}min focus • No goal linked
                  </Text>
                </View>
                <IconSymbol name="play.fill" size={16} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Goal Progress Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Weekly Progress
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalGoals}
              >
                {goals.length > 0 ? (
                  goals.map((goal) => (
                    <GoalProgressCard
                      key={goal.id}
                      goal={goal}
                      scheduledHours={(goalStats[goal.id]?.minutes || 0) / 60}
                    />
                  ))
                ) : (
                  <Text
                    style={{ color: theme.icon, fontSize: 13, marginTop: 10 }}
                  >
                    Create goals to track progress.
                  </Text>
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
              onSessionLongPress={(s) =>
                Alert.alert("Manage", "Session selected")
              }
            />
          </View>
        )}
      </ScrollView>

      {/* Goal Picker Modal */}
      <Modal
        visible={goalPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGoalPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Assign Goal
              </Text>
              <TouchableOpacity onPress={() => setGoalPickerVisible(false)}>
                <IconSymbol name="xmark" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.icon }]}>
              Choose a goal for this quick session or keep it unlinked.
            </Text>

            <TouchableOpacity
              style={[styles.goalItem, { backgroundColor: theme.background }]}
              onPress={() => startQuickSession()}
            >
              <View
                style={[
                  styles.goalIcon,
                  { backgroundColor: theme.icon + "22" },
                ]}
              >
                <IconSymbol name="timer" size={20} color={theme.icon} />
              </View>
              <Text style={[styles.goalItemText, { color: theme.text }]}>
                Unlinked / Quick Focus
              </Text>
            </TouchableOpacity>

            <FlatList
              data={goals}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.goalItem,
                    { backgroundColor: theme.background },
                  ]}
                  onPress={() => startQuickSession(item.id, item.title)}
                >
                  <View
                    style={[
                      styles.goalIcon,
                      { backgroundColor: item.color + "22" },
                    ]}
                  >
                    <IconSymbol name="target" size={20} color={item.color} />
                  </View>
                  <Text style={[styles.goalItemText, { color: theme.text }]}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.goalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      <CalendarSettings
        visible={calendarSettingsVisible}
        onClose={() => setCalendarSettingsVisible(false)}
      />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  capacityText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 20,
    padding: 2,
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  noSessionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  horizontalGoals: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  quickPomodoroBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    gap: 14,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  quickPomodoroTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  quickPomodoroSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  goalList: {
    marginTop: 8,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  goalItemText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
