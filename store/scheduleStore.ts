import {
  DayIndex,
  END_HOUR,
  ScheduleBlock,
  START_HOUR,
} from "@/constants/types/schedule";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { syncNotifications } from "./syncNotifications";

interface ScheduleState {
  blocks: ScheduleBlock[];
  connectedCalendarIds: string[];
  isLoadingCalendars: boolean;

  // Actions
  addBusyBlock: (block: Omit<ScheduleBlock, "id">) => boolean;
  updateBusyBlock: (id: string, updates: Partial<ScheduleBlock>) => boolean;
  deleteBusyBlock: (id: string) => void;
  addMultipleBlocks: (blocks: Omit<ScheduleBlock, "id">[]) => void;
  clearGeneratedBlocks: () => void;
  clearAllBlocks: () => void;
  extendBlockToMultipleDays: (blockId: string, dayIndices: DayIndex[]) => void;
  validateBlock: (
    block: Omit<ScheduleBlock, "id">,
    excludeId?: string,
  ) => string | null;

  // Calendar Actions
  toggleCalendar: (calendarId: string) => void;
  refreshCalendarEvents: () => Promise<void>;
  requestCalendarPermissions: () => Promise<{
    granted: boolean;
    canAskAgain: boolean;
  }>;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      blocks: [],
      connectedCalendarIds: [],
      isLoadingCalendars: false,

      requestCalendarPermissions: async () => {
        try {
          console.log(
            "[Store] requestCalendarPermissions called, Platform:",
            Platform.OS,
          );
          const result = await Calendar.requestCalendarPermissionsAsync();
          console.log(
            "[Store] Calendar permission result:",
            JSON.stringify(result),
          );
          if (result.status === "granted") {
            if (Platform.OS === "ios") {
              console.log("[Store] Requesting reminders permission (iOS)...");
              await Calendar.requestRemindersPermissionsAsync();
            }
            console.log("[Store] Permission granted");
            return { granted: true, canAskAgain: true };
          }
          console.log(
            "[Store] Permission NOT granted, status:",
            result.status,
            "canAskAgain:",
            result.canAskAgain,
          );
          return { granted: false, canAskAgain: result.canAskAgain ?? false };
        } catch (error) {
          console.error("[Store] Calendar permission error:", error);
          return { granted: false, canAskAgain: false };
        }
      },

      toggleCalendar: (calendarId) => {
        const { connectedCalendarIds } = get();
        const isConnected = connectedCalendarIds.includes(calendarId);

        if (isConnected) {
          set({
            connectedCalendarIds: connectedCalendarIds.filter(
              (id) => id !== calendarId,
            ),
          });
        } else {
          set({ connectedCalendarIds: [...connectedCalendarIds, calendarId] });
        }
        // Refresh events after toggling
        get().refreshCalendarEvents();
      },

      refreshCalendarEvents: async () => {
        const { connectedCalendarIds } = get();
        if (connectedCalendarIds.length === 0) {
          // Remove all calendar blocks if no calendars connected
          set((state) => ({
            blocks: state.blocks.filter((b) => b.source !== "calendar"),
          }));
          return;
        }

        set({ isLoadingCalendars: true });

        try {
          // Calculate date range for the current week (or a buffer around it)
          // For simplicity, let's fetch -1 week to +2 weeks from now
          const now = new Date();
          const startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          const endDate = new Date(now);
          endDate.setDate(now.getDate() + 14);

          const events = await Calendar.getEventsAsync(
            connectedCalendarIds,
            startDate,
            endDate,
          );

          const newCalendarBlocks: ScheduleBlock[] = events
            .map((event) => {
              const eventStart = new Date(event.startDate);
              const eventEnd = new Date(event.endDate);

              // Convert to our ScheduleBlock format
              // We need to map Date to DayIndex and startHour
              // Note: This simple mapping assumes events are within the same week or handled correctly by DayIndex logic.
              // For a real production app we'd need robust date handling (e.g. using date-fns or moment).
              // Here we'll just map roughly based on day of week 0-6 (Sun-Sat) -> Mon-Sun (0-6)

              // getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
              // We want: 0 = Mon, ..., 6 = Sun
              let dayIndex = eventStart.getDay() - 1;
              if (dayIndex < 0) dayIndex = 6;

              const startHour =
                eventStart.getHours() + eventStart.getMinutes() / 60;
              const endHour = eventEnd.getHours() + eventEnd.getMinutes() / 60;
              const duration = endHour - startHour;

              return {
                id: `cal-${event.id}`,
                dayIndex: dayIndex as DayIndex,
                startHour: Math.max(0, startHour),
                duration: Math.max(0.1, duration), // Minimum duration
                label: event.title,
                color: event.calendarId ? "#9CA3AF" : "#9CA3AF", // Default gray or map calendar color
                source: "calendar" as const,
                externalId: event.id,
                isReadOnly: true,
              };
            })
            .filter(
              (b) =>
                b.duration > 0 &&
                b.startHour < END_HOUR &&
                b.startHour + b.duration > START_HOUR,
            );

          // Update store: replace old calendar blocks with new ones
          set((state) => ({
            blocks: [
              ...state.blocks.filter((b) => b.source !== "calendar"),
              ...newCalendarBlocks,
            ],
            isLoadingCalendars: false,
          }));
        } catch (error) {
          console.error("Failed to fetch calendar events", error);
          set({ isLoadingCalendars: false });
        }
      },

      validateBlock: (newBlock, excludeId) => {
        const { dayIndex, startHour, duration, source } = newBlock;
        const endHour = startHour + duration;

        if (duration <= 0) return "End time must be after start time.";
        if (startHour < 0 || endHour > 24)
          return "Time must be within 0:00 - 24:00 range.";

        // If it's a calendar event, we generally allow it (or maybe just warn?)
        // But if user is creating a block, we check against EVERYTHING including calendar events.

        const overlappingBlock = get().blocks.find((b) => {
          if (b.id === excludeId) return false;
          if (b.dayIndex !== dayIndex) return false;

          const bEnd = b.startHour + b.duration;
          // Check for overlap: (StartA < EndB) and (EndA > StartB)
          return startHour < bEnd && endHour > b.startHour;
        });

        if (overlappingBlock) {
          if (source === "calendar") {
            // If the NEW block is a calendar event, we allow it but maybe should warn?
            // For now, allow it to exist so we can show conflict visually.
            return null;
          }
          // If USER is trying to create a block, we block it if it overlaps with anything (user or calendar)
          return `Overlaps with existing block: "${overlappingBlock.label}"`;
        }
        return null;
      },

      addBusyBlock: (blockData) => {
        const error = get().validateBlock(blockData);
        if (error) {
          Alert.alert("Invalid Block", error);
          return false;
        }

        const newBlock = {
          ...blockData,
          id: Math.random().toString(36).substr(2, 9),
        };
        set((state) => ({ blocks: [...state.blocks, newBlock] }));
        syncNotifications();
        return true;
      },

      addMultipleBlocks: (newBlocksData: Omit<ScheduleBlock, "id">[]) => {
        const { blocks } = get();

        const newBlocksWithIds = newBlocksData.map((b) => ({
          ...b,
          id: Math.random().toString(36).substr(2, 9),
        }));

        set((state) => ({ blocks: [...state.blocks, ...newBlocksWithIds] }));
        syncNotifications();
      },

      clearGeneratedBlocks: () => {
        set((state) => ({
          blocks: state.blocks.filter((b) => !b.relatedGoalId),
        }));
        syncNotifications();
      },

      clearAllBlocks: () => {
        set({ blocks: [] });
        syncNotifications();
      },

      updateBusyBlock: (id, updates) => {
        const currentBlock = get().blocks.find((b) => b.id === id);
        if (!currentBlock) return false;

        const updatedBlock = { ...currentBlock, ...updates };
        const error = get().validateBlock(updatedBlock, id);

        if (error) {
          Alert.alert("Invalid Update", error);
          return false;
        }

        set((state) => ({
          blocks: state.blocks.map((b) => (b.id === id ? updatedBlock : b)),
        }));
        syncNotifications();
        return true;
      },

      deleteBusyBlock: (id) => {
        set((state) => ({
          blocks: state.blocks.filter((b) => b.id !== id),
        }));
        syncNotifications();
      },

      extendBlockToMultipleDays: (blockId, dayIndices) => {
        const { blocks, addBusyBlock } = get();
        const sourceBlock = blocks.find((b) => b.id === blockId);
        if (!sourceBlock) return;

        let successCount = 0;
        let failCount = 0;

        dayIndices.forEach((dayIndex) => {
          if (dayIndex === sourceBlock.dayIndex) return; // Skip original day

          const newBlockData = { ...sourceBlock, dayIndex };
          // We need to strip ID to treat as new block
          const { id, ...dataWithoutId } = newBlockData;

          const success = addBusyBlock(dataWithoutId);
          if (success) successCount++;
          else failCount++;
        });

        if (failCount > 0) {
          Alert.alert(
            "Extension Partial",
            `Added to ${successCount} days. ${failCount} days had conflicts.`,
          );
        } else if (successCount > 0) {
          Alert.alert(
            "Success",
            `Block extended to ${successCount} additional days.`,
          );
        }
      },
    }),
    {
      name: "schedule-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
