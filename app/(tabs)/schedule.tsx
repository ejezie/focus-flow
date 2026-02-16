import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WeekView } from '@/components/schedule/WeekView';
import { AddBlockModal } from '@/components/schedule/AddBlockModal';
import { ScheduleBlock, START_HOUR, DayIndex } from '@/constants/types/schedule';

import { generateSchedule } from '@/utils/scheduler/AutoScheduler';
import { useGoalStore } from '@/store/goalStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSettingsStore } from '@/store/settingsStore';
import * as Haptics from 'expo-haptics';

export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const blocks = useScheduleStore((state) => state.blocks);
  const addBusyBlock = useScheduleStore((state) => state.addBusyBlock);
  const updateBusyBlock = useScheduleStore((state) => state.updateBusyBlock);
  const deleteBusyBlock = useScheduleStore((state) => state.deleteBusyBlock);
  const addMultipleBlocks = useScheduleStore((state) => state.addMultipleBlocks);
  const clearGeneratedBlocks = useScheduleStore((state) => state.clearGeneratedBlocks);

  const goals = useGoalStore((state) => state.goals);
  const settings = useSettingsStore((state) => state.settings);

  const handleAutoSchedule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
        "Auto-Schedule Focus Sessions",
        "This will analyze your busy schedule and goals to suggest focus sessions. \n\nExisting auto-generated sessions will be cleared.",
        [
            { text: "Cancel", style: "cancel" },
            { text: "Generate", onPress: () => runScheduler() }
        ]
    );
  };

  const runScheduler = () => {
      // 1. Clear old generated blocks
      clearGeneratedBlocks();
      
      // 2. Get fresh state (after clear, though state update might be async in React, Zustand is usually sync but state selector in component updates on next render. 
      // safer to read from store state directly if possible, or just pass filtered blocks.)
      // Actually `clearGeneratedBlocks` updates the store.
      // We need the updated blocks list as "busy" constraints.
      // Since clearGeneratedBlocks runs, the `blocks` variable here will be stale until re-render.
      // Let's implement a small helper in the component or rely on store's `getState` if we were outside, 
      // but here let's just manually filter what we pass to the generator.
      
      const manualBlocks = blocks.filter(b => !b.relatedGoalId);
      
      // 3. Generate
      const { scheduledBlocks, unscheduledGoals } = generateSchedule(manualBlocks, goals, settings);
      
      // 4. Add to store
      // We need to strip IDs from scheduledBlocks because addMultipleBlocks generates new ones? 
      // The generator adds IDs. addMultipleBlocks adds new IDs.
      // Let's map to Omit<id> type.
      const blocksToAdd = scheduledBlocks.map(({ id, ...rest }) => rest);
      addMultipleBlocks(blocksToAdd);

      // 5. Feedback
      const count = scheduledBlocks.length;
      let msg = `Created ${count} focus sessions.`;
      if (unscheduledGoals.length > 0) {
          msg += `\n\nCould not fully schedule ${unscheduledGoals.length} goals due to lack of time.`;
      }
      Alert.alert("Scheduling Complete", msg);
  };
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

  /* State for new block initialization */
  const [initialSlot, setInitialSlot] = useState<{ dayIndex: DayIndex; startHour: number } | undefined>(undefined);

  const handleAddBlock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingBlock(null);
    setInitialSlot(undefined);
    setModalVisible(true);
  };

  const handleEditBlock = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setInitialSlot(undefined);
    setModalVisible(true);
  };

  const handleGridPress = (dayIndex: number, hour: number) => {
    // Open modal pre-filled with this time
    setEditingBlock(null);
    setInitialSlot({ dayIndex: dayIndex as DayIndex, startHour: hour });
    setModalVisible(true);
  };

  const handleSaveBlock = (blockData: Omit<ScheduleBlock, 'id'>, repeatDays: DayIndex[]) => {
    if (editingBlock) {
      // Update existing
      const success = updateBusyBlock(editingBlock.id, blockData);
      if (success) setModalVisible(false);
    } else {
      // Create new (possibly multiple for repeat)
      let allSuccess = true;
      repeatDays.forEach(dayIndex => {
        const newBlock = { ...blockData, dayIndex };
        const success = addBusyBlock(newBlock);
        if (!success) allSuccess = false;
      });
      // If any added, we can close, or strictly close only if all success?
      // Since addBusyBlock alerts on failure, the user fits notified.
      // We'll close the modal to render what we have.
      setModalVisible(false); 
    }
    setInitialSlot(undefined);
  };

  const handleDeleteBlock = (id: string) => {
      deleteBusyBlock(id);
      setModalVisible(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={{ 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: theme.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.card
      }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>
          Weekly Schedule
        </Text>
        <TouchableOpacity onPress={handleAutoSchedule} style={{ padding: 8 }}>
            <IconSymbol name="sparkles" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <WeekView 
        blocks={blocks} 
        onBlockPress={handleEditBlock}
        onGridPress={handleGridPress}
      />

      <AddBlockModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onSave={handleSaveBlock}
        editingBlock={editingBlock}
        onDelete={handleDeleteBlock}
        initialDayIndex={initialSlot?.dayIndex}
        initialStartHour={initialSlot?.startHour}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleAddBlock}
      >
        <IconSymbol name="plus" size={32} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
