export type GoalCategory = 'Study' | 'Work' | 'Fitness' | 'Learning' | 'Creative' | 'Other';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority: number; // 1-5
  weeklyHours: number;
  color: string;
  createdAt: string; // ISO date string
}

export const GOAL_CATEGORIES: GoalCategory[] = ['Study', 'Work', 'Fitness', 'Learning', 'Creative', 'Other'];

export const PRESET_GOAL_COLORS = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#64748B', // Slate
];
