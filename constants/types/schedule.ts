export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleBlock {
  id: string;
  dayIndex: DayIndex;
  startHour: number; // 6.0 to 24.0
  duration: number; // in hours
  label: string;
  color: string;
  relatedGoalId?: string; // Links this block to a goal
}

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const START_HOUR = 6;
export const END_HOUR = 24; // 12 AM next day
export const HOUR_HEIGHT = 60; // pixels per hour
export const PRESET_COLORS = [
  '#6366F1', // Indigo (Primary)
  '#10B981', // Emerald (Accent)
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#64748B', // Slate
];
