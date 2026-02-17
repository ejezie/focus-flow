import { useFocusStore } from "@/store/focusStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useStatsStore } from "@/store/statsStore";
import {
    cancelNagNotifications,
    playSessionSound,
    schedulePomodoroEndAlarm,
} from "@/utils/notifications/notificationService";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";

/**
 * Global component that listens for Pomodoro timer completion.
 * This runs regardless of which screen the user is on.
 */
export function PomodoroGlobalListener() {
  const activeSession = useFocusStore((s) => s.activeSession);
  const nextPhase = useFocusStore((s) => s.nextPhase);
  const recordSession = useStatsStore((s) => s.recordSession);
  const completeSession = useFocusStore((s) => s.completeSession);
  const { settings } = useSettingsStore();

  const hasTriggeredCompletion = useRef(false);
  const lastPhase = useRef<string | null>(null);

  // Reset completion trigger when phase changes
  useEffect(() => {
    if (activeSession?.phase !== lastPhase.current) {
      hasTriggeredCompletion.current = false;
      lastPhase.current = activeSession?.phase || null;
    }
  }, [activeSession?.phase]);

  const handlePhaseComplete = async () => {
    if (hasTriggeredCompletion.current) return;
    hasTriggeredCompletion.current = true;

    console.log(
      "[PomodoroGlobalListener] Phase complete trigger:",
      activeSession?.phase,
    );

    // Feedback
    if (settings.notificationVibration) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (settings.notificationSound) {
      playSessionSound(true);
    }

    // Record stats if it was a work phase
    if (activeSession?.phase === "work") {
      recordSession({
        goalId: activeSession.goalId,
        minutes: activeSession.workDuration,
      });
    }

    // Show global alert
    Alert.alert(
      "Phase Complete!",
      activeSession?.phase === "work" ? "Time for a break!" : "Back to work!",
      [
        {
          text: "Continue",
          onPress: () => {
            console.log("[PomodoroGlobalListener] Continue pressed");
            nextPhase();
          },
        },
        {
          text: "End Session",
          onPress: () => {
            console.log("[PomodoroGlobalListener] End Session pressed");
            completeSession();
          },
          style: "destructive",
        },
      ],
      { cancelable: false },
    );
  };

  // Timer tick for foreground monitoring
  useEffect(() => {
    if (!activeSession || activeSession.isFinished || activeSession.isPaused)
      return;

    const tick = () => {
      const elapsed = (Date.now() - activeSession.startTime) / 1000;
      const remaining = Math.max(0, activeSession.duration - elapsed);

      if (remaining <= 0 && !hasTriggeredCompletion.current) {
        handlePhaseComplete();
      }
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [
    activeSession?.startTime,
    activeSession?.duration,
    activeSession?.isPaused,
    activeSession?.isFinished,
    activeSession?.phase,
  ]);

  // AppState listener for background -> foreground transition
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log(
          "[PomodoroGlobalListener] App returned to active, checking timer...",
        );
        if (
          activeSession &&
          !activeSession.isFinished &&
          !activeSession.isPaused
        ) {
          const elapsed = (Date.now() - activeSession.startTime) / 1000;
          if (
            elapsed >= activeSession.duration &&
            !hasTriggeredCompletion.current
          ) {
            handlePhaseComplete();
          }
        }
      }
    });

    return () => subscription.remove();
  }, [activeSession]);

  // Handle background notification scheduling and nag cancellation
  useEffect(() => {
    if (!activeSession || activeSession.isFinished || activeSession.isPaused)
      return;

    cancelNagNotifications();

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
  }, [
    activeSession?.phase,
    activeSession?.startTime,
    activeSession?.duration,
    activeSession?.isPaused,
    activeSession?.isFinished,
    settings.notificationSound,
    settings.notificationVibration,
  ]);

  return null;
}
