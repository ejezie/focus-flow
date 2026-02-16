import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncNotifications } from './syncNotifications';

interface UserSettings {
  wakeTime: number; // Hour (0-23)
  sleepTime: number; // Hour (0-23)
  preferredSessionLength: number; // 0.75 - 1.5
  notificationsEnabled: boolean;
  reminderMinutes: number; // 5, 15, 30
  notificationSound: boolean;
  notificationVibration: boolean;
  pomodoroWorkDuration: number; // minutes
  pomodoroBreakDuration: number; // minutes
  pomodoroLongBreakDuration: number; // minutes
  pomodoroSessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  minSessionLength: number; // minutes
  weekStartDay: 'Sunday' | 'Monday';
  defaultBusyBlockColor: string;
  themeMode: 'system' | 'light' | 'dark';
  accentColor: string;
  isOnboardingComplete: boolean;
  hasSeenTips: boolean;
}

interface SettingsState {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  wakeTime: 7, // 7 AM
  sleepTime: 23, // 11 PM
  preferredSessionLength: 1, // 1 hour
  notificationsEnabled: true,
  reminderMinutes: 15,
  notificationSound: true,
  notificationVibration: true,
  pomodoroWorkDuration: 25,
  pomodoroBreakDuration: 5,
  pomodoroLongBreakDuration: 15,
  pomodoroSessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  minSessionLength: 15,
  weekStartDay: 'Monday',
  defaultBusyBlockColor: '#64748B',
  themeMode: 'system',
  accentColor: '#6366F1',
  isOnboardingComplete: false,
  hasSeenTips: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      hasHydrated: false,
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
        syncNotifications();
      },
      setHasHydrated: (val) => set({ hasHydrated: val }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
