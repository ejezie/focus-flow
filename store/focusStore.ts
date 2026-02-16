import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FocusPhase = 'work' | 'break' | 'long-break';

interface ActiveSession {
  goalId: string;
  goalName: string;
  phase: FocusPhase;
  startTime: number; // timestamp
  duration: number; // seconds
  pomodorosCompleted: number;
  totalPomodoros: number;
  isPaused: boolean;
  pausedAt?: number; // timestamp
  remainingTimeAtPause?: number; // seconds
  isFinished: boolean;
  // Settings for this session
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

interface FocusState {
  activeSession: ActiveSession | null;
  startSession: (params: { 
    goalId: string; 
    goalName: string; 
    workDuration: number; 
    breakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
    totalPomodoros: number;
  }) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  nextPhase: () => void;
  extendSession: (minutes: number) => void;
  completeSession: () => void;
  endSession: () => void;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      activeSession: null,

      startSession: ({ 
        goalId, goalName, workDuration, breakDuration, 
        longBreakDuration, sessionsBeforeLongBreak, totalPomodoros 
      }) => {
        console.log('[FocusStore] startSession', { goalName, workDuration, totalPomodoros });
        set({
          activeSession: {
            goalId,
            goalName,
            phase: 'work',
            startTime: Date.now(),
            duration: workDuration * 60,
            pomodorosCompleted: 0,
            totalPomodoros,
            isPaused: false,
            isFinished: false,
            workDuration,
            breakDuration,
            longBreakDuration,
            sessionsBeforeLongBreak,
          },
        });
      },

      completeSession: () => {
        const { activeSession } = get();
        if (!activeSession) return;
        console.log('[FocusStore] completeSession — setting isFinished=true');
        set({ activeSession: { ...activeSession, isFinished: true } });
      },

      pauseSession: () => {
        const { activeSession } = get();
        if (!activeSession || activeSession.isPaused) {
          console.log('[FocusStore] pauseSession — skipped (no session or already paused)');
          return;
        }

        const elapsed = (Date.now() - activeSession.startTime) / 1000;
        const remaining = Math.max(0, activeSession.duration - elapsed);
        console.log('[FocusStore] pauseSession — remaining:', remaining);

        set({
          activeSession: {
            ...activeSession,
            isPaused: true,
            pausedAt: Date.now(),
            remainingTimeAtPause: remaining,
          },
        });
      },

      resumeSession: () => {
        const { activeSession } = get();
        if (!activeSession || !activeSession.isPaused) {
          console.log('[FocusStore] resumeSession — skipped (not paused)');
          return;
        }
        console.log('[FocusStore] resumeSession — resuming with', activeSession.remainingTimeAtPause, 's remaining');

        set({
          activeSession: {
            ...activeSession,
            isPaused: false,
            startTime: Date.now() - (activeSession.duration - (activeSession.remainingTimeAtPause || 0)) * 1000,
            pausedAt: undefined,
            remainingTimeAtPause: undefined,
          },
        });
      },

      nextPhase: () => {
        const { activeSession } = get();
        if (!activeSession) return;

        let nextPhase: FocusPhase;
        let nextDuration: number;
        let nextPomodorosCompleted = activeSession.pomodorosCompleted;

        if (activeSession.phase === 'work') {
          nextPomodorosCompleted += 1;
          if (nextPomodorosCompleted % activeSession.sessionsBeforeLongBreak === 0) {
            nextPhase = 'long-break';
            nextDuration = activeSession.longBreakDuration * 60;
          } else {
            nextPhase = 'break';
            nextDuration = activeSession.breakDuration * 60;
          }
        } else {
          nextPhase = 'work';
          nextDuration = activeSession.workDuration * 60;
        }

        set({
          activeSession: {
            ...activeSession,
            phase: nextPhase,
            startTime: Date.now(),
            duration: nextDuration,
            pomodorosCompleted: nextPomodorosCompleted,
            isPaused: false,
          },
        });
      },

      extendSession: (minutes: number) => {
        const { activeSession } = get();
        if (!activeSession) return;

        const additionalSeconds = minutes * 60;
        const updates: Partial<ActiveSession> = {
          duration: activeSession.duration + additionalSeconds,
        };

        if (activeSession.isPaused && activeSession.remainingTimeAtPause !== undefined) {
          updates.remainingTimeAtPause = activeSession.remainingTimeAtPause + additionalSeconds;
        }

        set({
          activeSession: {
            ...activeSession,
            ...updates,
          },
        });
      },

      endSession: () => {
        console.log('[FocusStore] endSession — clearing activeSession');
        set({ activeSession: null });
      },
    }),
    {
      name: 'focus-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
