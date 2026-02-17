import { IconSymbol } from "@/components/ui/icon-symbol";
import { QuickTipsOverlay } from "@/components/ui/QuickTipsOverlay";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFocusStore } from "@/store/focusStore";
import { useGoalStore } from "@/store/goalStore";
import { useScheduleStore } from "@/store/scheduleStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useStatsStore } from "@/store/statsStore";
import {
    formatHMM,
    getCurrentDayIndex,
    getCurrentHourFraction,
} from "@/utils/time/timeUtils";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { settings, updateSettings } = useSettingsStore();
  const { dailyHistory, currentStreak } = useStatsStore();
  const { goals } = useGoalStore();
  const { blocks } = useScheduleStore();
  const { startSession, activeSession } = useFocusStore();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayMins = dailyHistory[today]?.minutes || 0;
  const todaySessions = dailyHistory[today]?.sessions || 0;

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Quick delay to show refresh indicator, then let Zustand reactivity handle updates
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // Find the next session (memoized)
  const nextSession = useMemo(() => {
    const currentDay = getCurrentDayIndex();
    const currentHour = getCurrentHourFraction();

    // 1. Check for session in progress
    const inProgress = blocks.find(
      (b) =>
        b.relatedGoalId &&
        b.dayIndex === currentDay &&
        b.startHour <= currentHour &&
        b.startHour + b.duration > currentHour,
    );
    if (inProgress) return inProgress;

    // 2. Check for upcoming today
    const upcomingToday = blocks
      .filter(
        (b) =>
          b.relatedGoalId &&
          b.dayIndex === currentDay &&
          b.startHour > currentHour,
      )
      .sort((a, b) => a.startHour - b.startHour);

    if (upcomingToday.length > 0) return upcomingToday[0];

    // 3. Check for tomorrow
    const nextDay = ((currentDay + 1) % 7) as any;
    const tomorrow = blocks
      .filter((b) => b.relatedGoalId && b.dayIndex === nextDay)
      .sort((a, b) => a.startHour - b.startHour);

    if (tomorrow.length > 0) return tomorrow[0];
    return null;
  }, [blocks]);

  const focusSessionCount = useMemo(
    () => blocks.filter((b) => b.relatedGoalId).length,
    [blocks],
  );

  const handleStartSession = useCallback(
    (session: any) => {
      const goal = goals.find((g) => g.id === session.relatedGoalId);
      if (!goal) return;

      const sessionParams = {
        goalId: goal.id,
        goalName: goal.title,
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
    [goals, settings, activeSession],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {settings.isOnboardingComplete && !settings.hasSeenTips && (
        <QuickTipsOverlay
          onDismiss={() => updateSettings({ hasSeenTips: true })}
        />
      )}

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: theme.icon }]}>
            {greeting}
          </Text>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            FocusFlow
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/debug/test" as any);
            }}
            style={[styles.settingsBtn, { backgroundColor: theme.card }]}
          >
            <IconSymbol name="hammer.fill" size={20} color={theme.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings");
            }}
            style={[styles.settingsBtn, { backgroundColor: theme.card }]}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Open app settings"
          >
            <IconSymbol name="gearshape.fill" size={22} color={theme.icon} />
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
        {/* Colorful Hero Box */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/schedule")}
          accessibilityRole="button"
          accessibilityLabel={`Smart Planning. ${focusSessionCount} sessions scheduled`}
        >
          <LinearGradient
            colors={["#6366F1", "#8B5CF6", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBox}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Smart Planning</Text>
                <Text style={styles.heroSub}>
                  {focusSessionCount > 0
                    ? `Your week is looking productive. ${focusSessionCount} sessions scheduled.`
                    : `Let's plan your week. Tap to set up your schedule.`}
                </Text>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>AI OPTIMIZED</Text>
                </View>
              </View>
              <View style={styles.heroIconContainer}>
                <IconSymbol
                  name="sparkles"
                  size={60}
                  color="rgba(255,255,255,0.8)"
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Stats Row */}
        <View style={styles.statsRow} accessibilityRole="summary">
          <View style={[styles.miniStatCard, { backgroundColor: theme.card }]}>
            <IconSymbol name="timer" size={18} color={theme.primary} />
            <Text style={[styles.miniStatValue, { color: theme.text }]}>
              {Math.round((todayMins / 60) * 10) / 10}h
            </Text>
            <Text style={[styles.miniStatLabel, { color: theme.icon }]}>
              TODAY
            </Text>
          </View>
          <View style={[styles.miniStatCard, { backgroundColor: theme.card }]}>
            <IconSymbol name="bolt.fill" size={18} color="#FBBF24" />
            <Text style={[styles.miniStatValue, { color: theme.text }]}>
              {currentStreak}d
            </Text>
            <Text style={[styles.miniStatLabel, { color: theme.icon }]}>
              STREAK
            </Text>
          </View>
          <View style={[styles.miniStatCard, { backgroundColor: theme.card }]}>
            <IconSymbol name="flag.fill" size={18} color="#10B981" />
            <Text style={[styles.miniStatValue, { color: theme.text }]}>
              {goals.length}
            </Text>
            <Text style={[styles.miniStatLabel, { color: theme.icon }]}>
              GOALS
            </Text>
          </View>
        </View>

        {/* Next Session Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {nextSession &&
            nextSession.dayIndex === getCurrentDayIndex() &&
            nextSession.startHour <= getCurrentHourFraction()
              ? "Currently In Progress"
              : "Coming Up Next"}
          </Text>
        </View>

        {nextSession ? (
          <TouchableOpacity
            style={[styles.nextSessionCard, { backgroundColor: theme.card }]}
            onPress={() => handleStartSession(nextSession)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Next session: ${nextSession.label}. Tap to start`}
          >
            <View
              style={[
                styles.sessionColorLine,
                { backgroundColor: nextSession.color || theme.primary },
              ]}
            />
            <View style={styles.sessionInfo}>
              <View style={styles.sessionHeaderRow}>
                <Text
                  style={[styles.sessionGoal, { color: theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {nextSession.label}
                </Text>
                <View
                  style={[
                    styles.timeTag,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <Text style={[styles.timeTagText, { color: theme.icon }]}>
                    {formatHMM(nextSession.startHour)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.sessionTime, { color: theme.icon }]}>
                {nextSession.dayIndex === getCurrentDayIndex()
                  ? nextSession.startHour <= getCurrentHourFraction()
                    ? "Active now"
                    : "Today"
                  : "Tomorrow"}{" "}
                • {Math.round(nextSession.duration * 60)} min session
              </Text>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: theme.primary }]}
                onPress={() => handleStartSession(nextSession)}
                accessibilityRole="button"
                accessibilityLabel="Start session now"
              >
                <Text style={styles.startButtonText}>
                  {nextSession.startHour <= getCurrentHourFraction() &&
                  nextSession.dayIndex === getCurrentDayIndex()
                    ? "Focus Now"
                    : "Start Now"}
                </Text>
                <IconSymbol name="play.fill" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.card,
                borderColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <IconSymbol
              name="calendar"
              size={40}
              color={theme.icon}
              style={{ marginBottom: 12 }}
            />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No sessions scheduled
            </Text>
            <Text
              style={[
                styles.emptySub,
                { color: theme.icon, marginBottom: 16, marginTop: 4 },
              ]}
            >
              Set up your schedule and goals to get started
            </Text>
            <TouchableOpacity
              style={[styles.setupBtn, { borderColor: theme.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/schedule");
              }}
              accessibilityRole="button"
              accessibilityLabel="Plan my day"
            >
              <Text style={[styles.setupBtnText, { color: theme.primary }]}>
                Plan My Day
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Goals Progress Overview */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Goal Insights
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/progress")}
            accessibilityRole="link"
            accessibilityLabel="View all goals"
          >
            <Text style={{ color: theme.primary, fontWeight: "bold" }}>
              View All
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.goalsPreviewCard, { backgroundColor: theme.card }]}
        >
          {goals.length > 0 ? (
            goals.slice(0, 3).map((goal, idx) => (
              <View
                key={goal.id}
                style={[
                  styles.goalItem,
                  idx < goals.slice(0, 3).length - 1 && styles.goalItemBorder,
                ]}
              >
                <View style={styles.goalItemInfo}>
                  <Text
                    style={[styles.goalItemTitle, { color: theme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {goal.title}
                  </Text>
                  <Text style={[styles.goalItemSub, { color: theme.icon }]}>
                    {goal.weeklyHours}h weekly goal
                  </Text>
                </View>
                <View
                  style={[
                    styles.goalIndicator,
                    { backgroundColor: goal.color },
                  ]}
                />
              </View>
            ))
          ) : (
            <View style={{ padding: 12, alignItems: "center" }}>
              <IconSymbol
                name="flag.fill"
                size={28}
                color={theme.icon}
                style={{ marginBottom: 8, opacity: 0.5 }}
              />
              <Text style={[styles.emptySub, { color: theme.icon }]}>
                Create goals to track your focus
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/goals");
                }}
                style={[
                  styles.setupBtn,
                  { borderColor: theme.primary, marginTop: 12 },
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.setupBtnText, { color: theme.primary }]}>
                  Add a Goal
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Today's Sessions Count */}
        {todaySessions > 0 && (
          <View style={[styles.todaySummary, { backgroundColor: theme.card }]}>
            <IconSymbol
              name="checkmark.circle.fill"
              size={20}
              color="#4ADE80"
            />
            <Text style={[styles.todaySummaryText, { color: theme.text }]}>
              {todaySessions} session{todaySessions > 1 ? "s" : ""} completed
              today
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  settingsBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroBox: {
    borderRadius: 32,
    padding: 24,
    height: 180,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
  },
  heroContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  heroSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 16,
  },
  heroBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroIconContainer: {
    marginLeft: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  miniStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    minHeight: 48,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 4,
  },
  miniStatLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  nextSessionCard: {
    flexDirection: "row",
    borderRadius: 24,
    overflow: "hidden",
    height: 140,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sessionColorLine: {
    width: 6,
    height: "100%",
  },
  sessionInfo: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  sessionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  sessionGoal: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  timeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  sessionTime: {
    fontSize: 14,
    marginBottom: 16,
  },
  startButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  startButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    textAlign: "center",
    fontSize: 13,
  },
  setupBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  setupBtnText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  goalsPreviewCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  goalItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  goalItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  goalItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  goalItemSub: {
    fontSize: 12,
  },
  goalIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 16,
  },
  todaySummary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 12,
    marginTop: 4,
  },
  todaySummaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
