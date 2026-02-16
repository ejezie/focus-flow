import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from '@/constants/types/goal';
import { Alert } from 'react-native';

interface GoalState {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  reorderGoals: (newOrder: Goal[]) => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],

      addGoal: (goalData) => {
        if (!goalData.title.trim()) {
            Alert.alert('Error', 'Goal title cannot be empty.');
            return;
        }

        const newGoal: Goal = {
          ...goalData,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
        };

        // Sort by priority on add? Or just append. 
        // User requested "Drag to reorder by priority", implying manual or auto sort.
        // Let's just append for now, View layer can sort or handle drag.
        set((state) => ({ goals: [...state.goals, newGoal] }));
      },

      updateGoal: (id, updates) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        }));
      },

      reorderGoals: (newOrder) => {
          set({ goals: newOrder });
      },
    }),
    {
      name: 'goal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
