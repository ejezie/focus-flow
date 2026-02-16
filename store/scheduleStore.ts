import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScheduleBlock, DayIndex } from '@/constants/types/schedule';
import { Alert } from 'react-native';
import { syncNotifications } from './syncNotifications';

interface ScheduleState {
  blocks: ScheduleBlock[];
  addBusyBlock: (block: Omit<ScheduleBlock, 'id'>) => boolean;
  updateBusyBlock: (id: string, updates: Partial<ScheduleBlock>) => boolean;
  deleteBusyBlock: (id: string) => void;
  addMultipleBlocks: (blocks: Omit<ScheduleBlock, 'id'>[]) => void;
  clearGeneratedBlocks: () => void;
  clearAllBlocks: () => void;
  extendBlockToMultipleDays: (blockId: string, dayIndices: DayIndex[]) => void;
  validateBlock: (block: Omit<ScheduleBlock, 'id'>, excludeId?: string) => string | null;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      blocks: [],
      
      validateBlock: (newBlock, excludeId) => {
        const { dayIndex, startHour, duration } = newBlock;
        const endHour = startHour + duration;
        
        if (duration <= 0) return "End time must be after start time.";
        if (startHour < 0 || endHour > 24) return "Time must be within 0:00 - 24:00 range.";

        const overlappingBlock = get().blocks.find(b => {
          if (b.id === excludeId) return false;
          if (b.dayIndex !== dayIndex) return false;

          const bEnd = b.startHour + b.duration;
          // Check for overlap: (StartA < EndB) and (EndA > StartB)
          return (startHour < bEnd) && (endHour > b.startHour);
        });

        if (overlappingBlock) return `Overlaps with existing block: "${overlappingBlock.label}"`;
        return null;
      },

      addBusyBlock: (blockData) => {
        const error = get().validateBlock(blockData);
        if (error) {
          Alert.alert("Invalid Block", error);
          return false;
        }

        const newBlock = { ...blockData, id: Math.random().toString(36).substr(2, 9) };
        set((state) => ({ blocks: [...state.blocks, newBlock] }));
        syncNotifications();
        return true;
      },

      addMultipleBlocks: (newBlocksData: Omit<ScheduleBlock, 'id'>[]) => {
         const { blocks } = get();
         
         const newBlocksWithIds = newBlocksData.map(b => ({
             ...b,
             id: Math.random().toString(36).substr(2, 9)
         }));
         
         set((state) => ({ blocks: [...state.blocks, ...newBlocksWithIds] }));
         syncNotifications();
      },
      
      clearGeneratedBlocks: () => {
          set((state) => ({
              blocks: state.blocks.filter(b => !b.relatedGoalId)
          }));
          syncNotifications();
      },

      clearAllBlocks: () => {
          set({ blocks: [] });
          syncNotifications();
      },

      updateBusyBlock: (id, updates) => {
        const currentBlock = get().blocks.find(b => b.id === id);
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
          const sourceBlock = blocks.find(b => b.id === blockId);
          if (!sourceBlock) return;
          
          let successCount = 0;
          let failCount = 0;

          dayIndices.forEach(dayIndex => {
              if (dayIndex === sourceBlock.dayIndex) return; // Skip original day
              
              const newBlockData = { ...sourceBlock, dayIndex };
              // We need to strip ID to treat as new block
              const { id, ...dataWithoutId } = newBlockData;
              
              const success = addBusyBlock(dataWithoutId);
              if (success) successCount++;
              else failCount++;
          });

          if (failCount > 0) {
              Alert.alert("Extension Partial", `Added to ${successCount} days. ${failCount} days had conflicts.`);
          } else if (successCount > 0) {
              Alert.alert("Success", `Block extended to ${successCount} additional days.`);
          }
      }
    }),
    {
      name: 'schedule-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
