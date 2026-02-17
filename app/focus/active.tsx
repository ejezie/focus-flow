import { CircularTimer } from "@/components/focus/CircularTimer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFocusStore } from "@/store/focusStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useStatsStore } from "@/store/statsStore";
import {
    cancelNagNotifications,
    cancelPomodoroEndAlarm,
    playSessionSound,
    schedulePomodoroEndAlarm,
} from "@/utils/notifications/notificationService";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActiveFocusScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const activeSession = useFocusStore((s) => s.activeSession);
  const pauseSession = useFocusStore((s) => s.pauseSession);
  const resumeSession = useFocusStore((s) => s.resumeSession);
  const nextPhase = useFocusStore((s) => s.nextPhase);
  const extendSession = useFocusStore((s) => s.extendSession);
  const completeSession = useFocusStore((s) => s.completeSession);
  const endSession = useFocusStore((s) => s.endSession);
  const recordSession = useStatsStore((s) => s.recordSession);
  const { settings } = useSettingsStore();

  useKeepAwake();

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const hasTriggeredCompletion = React.useRef(false);

  // Reset completion trigger when phase changes
  useEffect(() => {
    hasTriggeredCompletion.current = false;
  }, [activeSession?.phase]);

  // Schedule background alarm for timer end (fires even when app is backgrounded)
  useEffect(() => {
    if (!activeSession || activeSession.isFinished || activeSession.isPaused) {
      return;
    }
    const elapsed = (Date.now() - activeSession.startTime) / 1000;
    const remaining = Math.max(0, activeSession.duration - elapsed);
    if (remaining > 0) {
      schedulePomodoroEndAlarm(
        remaining,
        activeSession.phase,
        activeSession.goalName,
        settings.notificationSound,
        settings.notificationVibration,
      );
    }
    return () => {
      // Don't cancel here — we WANT the alarm to fire when backgrounded
    };
  }, [
    activeSession?.phase,
    activeSession?.startTime,
    activeSession?.duration,
    activeSession?.isPaused,
    activeSession?.isFinished,
  ]);

  // Cancel nag notifications when pomodoro is active
  useEffect(() => {
    if (activeSession && !activeSession.isFinished) {
      cancelNagNotifications();
    }
  }, [activeSession?.phase]);

  const handleMinimize = useCallback(() => {
    console.log(
      "[FocusActive] handleMinimize — going back with session still running",
    );
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, [router]);

  // Calculate how many minutes the user actually focused in the current phase
  const getElapsedMinutes = useCallback(() => {
    if (!activeSession || activeSession.phase !== "work") return 0;
    const elapsed = activeSession.isPaused
      ? activeSession.duration - (activeSession.remainingTimeAtPause || 0)
      : (Date.now() - activeSession.startTime) / 1000;
    return Math.max(0, Math.round(elapsed / 60));
  }, [activeSession]);

  const handleEndEarly = useCallback(() => {
    if (activeSession?.phase === "work") {
      const elapsedMins = getElapsedMinutes();
      if (elapsedMins > 0) {
        console.log(
          "[FocusActive] End early — recording partial progress:",
          elapsedMins,
          "min",
        );
        recordSession({ goalId: activeSession.goalId, minutes: elapsedMins });
      }
    }
    completeSession();
  }, [activeSession, getElapsedMinutes, recordSession, completeSession]);

  const handleStopAndExit = useCallback(() => {
    if (activeSession?.phase === "work") {
      const elapsedMins = getElapsedMinutes();
      if (elapsedMins > 0) {
        console.log(
          "[FocusActive] Stop & exit — recording partial progress:",
          elapsedMins,
          "min",
        );
        recordSession({ goalId: activeSession.goalId, minutes: elapsedMins });
      }
    }
    cancelPomodoroEndAlarm();
    endSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/focus");
    }
  }, [activeSession, getElapsedMinutes, recordSession, endSession, router]);

  const handlePhaseComplete = useCallback(async () => {
    console.log(
      "[FocusActive] handlePhaseComplete called, phase:",
      activeSession?.phase,
    );
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await playSessionSound(settings.notificationSound);

    if (activeSession?.phase === "work") {
      console.log(
        "[FocusActive] Phase complete — recording full pomodoro:",
        activeSession.workDuration,
        "min",
      );
      recordSession({
        goalId: activeSession.goalId,
        minutes: activeSession.workDuration,
      });
    }

    Alert.alert(
      "Phase Complete!",
      activeSession?.phase === "work" ? "Time for a break!" : "Back to work!",
      [
        { text: "Continue", onPress: () => nextPhase() },
        {
          text: "End Session",
          onPress: () => handleEndEarly(),
          style: "destructive",
        },
      ],
      { cancelable: false },
    );
  }, [
    activeSession?.phase,
    activeSession?.goalId,
    activeSession?.workDuration,
    nextPhase,
    recordSession,
    handleEndEarly,
  ]);

  // Timer tick
  useEffect(() => {
    if (!activeSession || activeSession.isFinished) return;

    const updateTimer = () => {
      if (activeSession.isPaused) {
        setRemainingSeconds(activeSession.remainingTimeAtPause || 0);
        return;
      }
      const elapsed = (Date.now() - activeSession.startTime) / 1000;
      const remaining = Math.max(0, activeSession.duration - elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !hasTriggeredCompletion.current) {
        hasTriggeredCompletion.current = true;
        handlePhaseComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [
    activeSession?.isPaused,
    activeSession?.phase,
    activeSession?.startTime,
    activeSession?.duration,
    activeSession?.isFinished,
    handlePhaseComplete,
  ]);

  const handleFinishAndLeave = useCallback(() => {
    console.log(
      "[FocusActive] handleFinishAndLeave — session complete, cleaning up",
    );
    cancelPomodoroEndAlarm();
    endSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/focus");
    }
  }, [endSession, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = useMemo(() => {
    if (!activeSession) return 0;
    return 1 - remainingSeconds / activeSession.duration;
  }, [remainingSeconds, activeSession?.duration]);

  if (!activeSession) return null;

  const getBackgroundColor = () => {
    if (activeSession.isFinished) return theme.background;
    switch (activeSession.phase) {
      case "work":
        return theme.background;
      case "break":
        return colorScheme === "dark" ? "#064E3B" : "#F0FDF4";
      case "long-break":
        return colorScheme === "dark" ? "#134E4A" : "#F0FDFA";
      default:
        return theme.background;
    }
  };

  // ---- Completion Summary ----
  if (activeSession.isFinished) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.summaryOverlay}>
          <IconSymbol name="checkmark.circle.fill" size={80} color="#4ADE80" />
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            Session Complete!
          </Text>
          <Text style={[styles.summarySubtitle, { color: theme.icon }]}>
            Great job staying focused.
          </Text>

          <View style={styles.summaryStats}>
            <View
              style={[styles.summaryStatCard, { backgroundColor: theme.card }]}
            >
              <Text style={[styles.statValue, { color: theme.text }]}>
                {activeSession.pomodorosCompleted}
              </Text>
              <Text style={[styles.statLabel, { color: theme.icon }]}>
                Pomodoros
              </Text>
            </View>
            <View
              style={[styles.summaryStatCard, { backgroundColor: theme.card }]}
            >
              <Text style={[styles.statValue, { color: theme.text }]}>
                {activeSession.pomodorosCompleted * activeSession.workDuration}m
              </Text>
              <Text style={[styles.statLabel, { color: theme.icon }]}>
                Focused
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: theme.primary }]}
            onPress={handleFinishAndLeave}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Active Timer ----
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: getBackgroundColor() }]}
    >
      <View style={styles.header}>
        {/* Back/Minimize Button */}
        <TouchableOpacity onPress={handleMinimize} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.goalName, { color: theme.text }]}>
            {activeSession.goalName}
          </Text>
          <Text style={[styles.sessionStatus, { color: theme.icon }]}>
            Pomodoro {activeSession.pomodorosCompleted + 1} of{" "}
            {activeSession.totalPomodoros}
          </Text>
        </View>

        {/* Stop Button */}
        <TouchableOpacity
          onPress={() => {
            console.log("[FocusActive] X button pressed");
            Alert.alert("End Session", "End this session or minimize?", [
              { text: "Minimize", onPress: handleMinimize },
              {
                text: "End Early",
                style: "destructive",
                onPress: handleEndEarly,
              },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
          style={styles.endButton}
        >
          <IconSymbol name="xmark" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.timerSection}>
        <CircularTimer
          progress={progress}
          remainingTime={formatTime(remainingSeconds)}
          phase={activeSession.phase}
          label={activeSession.goalName}
        />
      </View>

      <View style={styles.controlsSection}>
        <View style={styles.mainControls}>
          <TouchableOpacity
            style={[styles.secondaryControl, { backgroundColor: theme.card }]}
            onPress={() => extendSession(5)}
          >
            <IconSymbol name="plus" size={20} color={theme.text} />
            <Text style={[styles.controlLabel, { color: theme.text }]}>
              +5m
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playPauseButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              console.log(
                "[FocusActive] Play/Pause pressed, isPaused:",
                activeSession.isPaused,
              );
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              activeSession.isPaused ? resumeSession() : pauseSession();
            }}
          >
            <IconSymbol
              name={activeSession.isPaused ? "play.fill" : "pause.fill"}
              size={32}
              color="#FFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryControl, { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              nextPhase();
            }}
          >
            <IconSymbol name="forward.fill" size={20} color={theme.text} />
            <Text style={[styles.controlLabel, { color: theme.text }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stop Session Button */}
        <TouchableOpacity
          style={[styles.stopButton, { borderColor: "#EF4444" }]}
          onPress={() => {
            console.log("[FocusActive] Stop button pressed");
            Alert.alert(
              "Stop Session?",
              "You'll lose progress on this pomodoro.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Stop & Exit",
                  style: "destructive",
                  onPress: handleStopAndExit,
                },
              ],
            );
          }}
        >
          <Text style={styles.stopButtonText}>Stop Session</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Stats */}
      <View style={[styles.footer, { borderTopColor: theme.card }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {activeSession.pomodorosCompleted}
          </Text>
          <Text style={[styles.statLabel, { color: theme.icon }]}>Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {Math.round(
              (activeSession.pomodorosCompleted * activeSession.workDuration) /
                6,
            ) / 10}
            h
          </Text>
          <Text style={[styles.statLabel, { color: theme.icon }]}>Total</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  goalName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sessionStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  endButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  timerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsSection: {
    paddingBottom: 20,
    alignItems: "center",
  },
  mainControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
    marginBottom: 20,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryControl: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  stopButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  stopButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    padding: 30,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  summaryOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
  },
  summarySubtitle: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 40,
  },
  summaryStats: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 60,
  },
  summaryStatCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    minWidth: 120,
  },
  doneButton: {
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
  },
  doneButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});
