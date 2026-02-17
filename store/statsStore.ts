import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface DailyStat {
  date: string; // YYYY-MM-DD
  minutes: number;
  sessions: number;
}

interface GoalStat {
  goalId: string;
  minutes: number;
}

interface StatsState {
  dailyHistory: Record<string, DailyStat>;
  goalStats: Record<string, GoalStat>;
  dailyGoalHistory: Record<string, Record<string, number>>; // date -> goalId -> minutes
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  lifetimeMinutes: number;

  // Actions
  recordSession: (params: { goalId: string; minutes: number }) => void;
  resetProgress: () => void;
}

const getTodayString = () => new Date().toISOString().split("T")[0];
const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      dailyHistory: {},
      goalStats: {},
      dailyGoalHistory: {},
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      lifetimeMinutes: 0,

      recordSession: ({ goalId, minutes }) => {
        const today = getTodayString();
        const yesterday = getYesterdayString();
        const {
          dailyHistory,
          goalStats,
          dailyGoalHistory,
          currentStreak,
          longestStreak,
          lastActiveDate,
          lifetimeMinutes,
        } = get();

        // Update Daily History
        const todayStat = dailyHistory[today] || {
          date: today,
          minutes: 0,
          sessions: 0,
        };
        const updatedDailyHistory = {
          ...dailyHistory,
          [today]: {
            ...todayStat,
            minutes: todayStat.minutes + minutes,
            sessions: todayStat.sessions + 1,
          },
        };

        // Update Goal Stats (skip for unlinked/quick pomodoros)
        let updatedGoalStats = { ...goalStats };
        if (goalId !== "unlinked") {
          const goalStat = goalStats[goalId] || { goalId, minutes: 0 };
          updatedGoalStats = {
            ...goalStats,
            [goalId]: {
              ...goalStat,
              minutes: goalStat.minutes + minutes,
            },
          };
        }

        // Update Daily Goal History (per-day-per-goal minutes for historical views)
        const updatedDailyGoalHistory = { ...dailyGoalHistory };
        if (goalId !== "unlinked") {
          const todayGoals = { ...(dailyGoalHistory[today] || {}) };
          todayGoals[goalId] = (todayGoals[goalId] || 0) + minutes;
          updatedDailyGoalHistory[today] = todayGoals;
        }

        // Update Streak
        let newStreak = currentStreak;
        if (lastActiveDate === yesterday) {
          newStreak += 1;
        } else if (lastActiveDate !== today) {
          newStreak = 1;
        }

        set({
          dailyHistory: updatedDailyHistory,
          goalStats: updatedGoalStats,
          dailyGoalHistory: updatedDailyGoalHistory,
          currentStreak: newStreak,
          longestStreak: Math.max(longestStreak, newStreak),
          lastActiveDate: today,
          lifetimeMinutes: lifetimeMinutes + minutes,
        });
      },

      resetProgress: () => {
        set({
          dailyHistory: {},
          goalStats: {},
          dailyGoalHistory: {},
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
          lifetimeMinutes: 0,
        });
      },
    }),
    {
      name: "stats-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
