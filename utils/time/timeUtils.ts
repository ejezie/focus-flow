import { DayIndex } from '@/constants/types/schedule';

export function getCurrentDayIndex(): DayIndex {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday
  return ((day + 6) % 7) as DayIndex;
}

export function getCurrentHourFraction(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

export function formatHMM(hourFraction: number): string {
  const h = Math.floor(hourFraction);
  const m = Math.round((hourFraction % 1) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}
