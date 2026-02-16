import { ScheduleBlock, DayIndex, START_HOUR, END_HOUR } from '@/constants/types/schedule';
import { Goal } from '@/constants/types/goal';

interface TimeSlotInterval {
  dayIndex: DayIndex;
  start: number;
  end: number;
}

// Configuration
const MIN_SESSION = 0.5; // 30 mins
const MAX_SESSION = 1.5; // 90 mins
const BUFFER = 0.25; // 15 mins
const WORKING_START = 8; 
const WORKING_END = 22;

export function generateSchedule(
  currentBlocks: ScheduleBlock[],
  goals: Goal[],
  settings: { wakeTime: number, sleepTime: number }
): { scheduledBlocks: ScheduleBlock[], unscheduledGoals: { goalId: string, remainingHours: number }[] } {
  
  // 1. Initialize Busy Intervals
  const busyByDay: Record<number, { start: number, end: number }[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
  };

  // Add Sleep Intervals as Busy
  for (let d = 0; d <= 6; d++) {
    if (settings.sleepTime > settings.wakeTime) {
        // Normal case: Awake during day (e.g. 7 to 23). Sleep crosses midnight.
        // Busy 00:00 -> wakeTime AND sleepTime -> 24:00
        busyByDay[d].push({ start: 0, end: settings.wakeTime });
        busyByDay[d].push({ start: settings.sleepTime, end: 24 });
    } else {
        // Shift case: Awake crosses midnight (e.g. 14:00 to 04:00). Sleep is during day.
        // Busy sleepTime -> wakeTime
        busyByDay[d].push({ start: settings.sleepTime, end: settings.wakeTime });
    }
  }

  // Add existing blocks with buffer
  currentBlocks.forEach(block => {
    const start = Math.max(0, block.startHour - BUFFER);
    const end = Math.min(24, block.startHour + block.duration + BUFFER);
    busyByDay[block.dayIndex].push({ start, end });
  });

  // Sort and merge intervals for each day
  Object.keys(busyByDay).forEach(key => {
    const day = Number(key);
    const intervals = busyByDay[day];
    intervals.sort((a, b) => a.start - b.start);
    
    const merged: { start: number, end: number }[] = [];
    if (intervals.length > 0) {
        let current = intervals[0];
        for (let i = 1; i < intervals.length; i++) {
            const next = intervals[i];
            if (next.start < current.end) {
                current.end = Math.max(current.end, next.end);
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
        busyByDay[day] = merged;
    }
  });

  // 2. Sort Goals
  const sortedGoals = [...goals].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.weeklyHours - a.weeklyHours;
  });

  const newBlocks: ScheduleBlock[] = [];
  const unscheduledReport: { goalId: string, remainingHours: number }[] = [];
  const dailyLoad: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  // 3. Allocate
  for (const goal of sortedGoals) {
    let remaining = goal.weeklyHours;
    let attempts = 0;
    
    while (remaining >= MIN_SESSION && attempts < 50) {
        attempts++;
        let duration = Math.min(remaining, MAX_SESSION);
        
        const bestSlot = findBestSlot(duration, busyByDay, dailyLoad, goal.priority, settings);
        
        if (bestSlot) {
            const block: ScheduleBlock = {
                id: Math.random().toString(36).substr(2, 9),
                dayIndex: bestSlot.dayIndex,
                startHour: bestSlot.start,
                duration: duration,
                label: goal.title,
                color: goal.color,
                relatedGoalId: goal.id
            };
            newBlocks.push(block);
            
            remaining -= duration;
            dailyLoad[bestSlot.dayIndex] += duration;
            
            const paddedStart = Math.max(0, bestSlot.start - BUFFER);
            const paddedEnd = Math.min(24, bestSlot.start + duration + BUFFER);
            insertBusyInterval(busyByDay[bestSlot.dayIndex], paddedStart, paddedEnd);
        } else {
            if (duration > MIN_SESSION) {
                 let reducedDuration = Math.max(MIN_SESSION, duration - 0.5);
                 const smallerSlot = findBestSlot(reducedDuration, busyByDay, dailyLoad, goal.priority, settings);
                 if (smallerSlot) {
                     const block: ScheduleBlock = {
                        id: Math.random().toString(36).substr(2, 9),
                        dayIndex: smallerSlot.dayIndex,
                        startHour: smallerSlot.start,
                        duration: reducedDuration,
                        label: goal.title,
                        color: goal.color,
                        relatedGoalId: goal.id
                    };
                    newBlocks.push(block);
                    remaining -= reducedDuration;
                    dailyLoad[smallerSlot.dayIndex] += reducedDuration;
                    const pStart = Math.max(0, smallerSlot.start - BUFFER);
                    const pEnd = Math.min(24, smallerSlot.start + reducedDuration + BUFFER);
                    insertBusyInterval(busyByDay[smallerSlot.dayIndex], pStart, pEnd);
                    continue;
                 }
            }
            break;
        }
    }

    if (remaining > 0.1) {
        unscheduledReport.push({ goalId: goal.id, remainingHours: remaining });
    }
  }

  return { scheduledBlocks: newBlocks, unscheduledGoals: unscheduledReport };
}

function findBestSlot(
    duration: number,
    busyByDay: Record<number, { start: number, end: number }[]>,
    dailyLoad: Record<number, number>,
    priority: number,
    settings: { wakeTime: number, sleepTime: number }
): TimeSlotInterval | null {
    let bestSlot: TimeSlotInterval | null = null;
    let bestScore = -Infinity;

    for (let d = 0; d <= 6; d++) {
        const day = d as DayIndex;
        // Search bound is now driven by settings
        const slots = getFreeSlots(busyByDay[day], duration, settings.wakeTime, settings.sleepTime);
        
        for (const slotStart of slots) {
            let score = - (dailyLoad[day] * 10);
            
            if (priority >= 4) {
                if (slotStart >= settings.wakeTime + 1 && slotStart < settings.wakeTime + 5) score += 50;
                else if (slotStart >= settings.wakeTime + 6 && slotStart < settings.wakeTime + 10) score += 20;
            } else if (priority === 3) {
                 if (slotStart >= settings.wakeTime + 6 && slotStart < settings.wakeTime + 10) score += 50;
                 else if (slotStart >= settings.wakeTime + 1 && slotStart < settings.wakeTime + 5) score += 20;
            } else {
                 if (slotStart >= settings.sleepTime - 4) score += 20; 
            }

            if (score > bestScore) {
                bestScore = score;
                bestSlot = { dayIndex: day, start: slotStart, end: slotStart + duration };
            }
        }
    }
    
    return bestSlot;
}

function getFreeSlots(intervals: { start: number, end: number }[], duration: number, wakeTime: number, sleepTime: number): number[] {
    const slots: number[] = [];
    const searchStart = wakeTime;
    const searchEnd = sleepTime;
    
    if (intervals.length === 0) {
        for (let t = searchStart; t <= searchEnd - duration; t += 0.5) {
            slots.push(t);
        }
        return slots;
    }

    if (intervals[0].start - searchStart >= duration) {
        for (let t = searchStart; t <= intervals[0].start - duration; t += 0.5) {
             slots.push(t);
        }
    }

    for (let i = 0; i < intervals.length - 1; i++) {
        const gapStart = intervals[i].end;
        const gapEnd = intervals[i+1].start;
        if (gapEnd - gapStart >= duration) {
             const validStart = Math.max(gapStart, searchStart);
             const validEnd = Math.min(gapEnd, searchEnd);
             if (validEnd - validStart >= duration) {
                 for (let t = validStart; t <= validEnd - duration; t += 0.5) {
                     slots.push(t);
                 }
             }
        }
    }

    const lastEnd = intervals[intervals.length - 1].end;
    if (searchEnd - lastEnd >= duration) {
         const validStart = Math.max(lastEnd, searchStart);
         for (let t = validStart; t <= searchEnd - duration; t += 0.5) {
             slots.push(t);
         }
    }

    return slots;
}

function insertBusyInterval(intervals: { start: number, end: number }[], start: number, end: number) {
    intervals.push({ start, end });
    intervals.sort((a, b) => a.start - b.start);
    let i = 0;
    while (i < intervals.length - 1) {
        if (intervals[i+1].start <= intervals[i].end) {
            intervals[i].end = Math.max(intervals[i].end, intervals[i+1].end);
            intervals.splice(i+1, 1);
        } else {
            i++;
        }
    }
}

