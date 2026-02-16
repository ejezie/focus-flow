import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/theme';
import { DAYS_OF_WEEK, PRESET_COLORS, ScheduleBlock, START_HOUR, END_HOUR, DayIndex } from '@/constants/types/schedule';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AddBlockModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (block: Omit<ScheduleBlock, 'id'>, repeatDays: DayIndex[]) => void;
  editingBlock?: ScheduleBlock | null;
  onDelete?: (id: string) => void;
  initialDayIndex?: DayIndex;
  initialStartHour?: number;
}

export function AddBlockModal({ visible, onClose, onSave, editingBlock, onDelete, initialDayIndex, initialStartHour }: AddBlockModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [label, setLabel] = useState('');
  const [selectedDays, setSelectedDays] = useState<DayIndex[]>([0]); // Default Monday
  const [startTime, setStartTime] = useState(new Date()); // defaults to now, needs clamping
  const [endTime, setEndTime] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingBlock) {
        setLabel(editingBlock.label);
        setSelectedDays([editingBlock.dayIndex]);
        const start = new Date();
        start.setHours(Math.floor(editingBlock.startHour), (editingBlock.startHour % 1) * 60);
        setStartTime(start);
        
        const end = new Date();
        const endHour = editingBlock.startHour + editingBlock.duration;
        end.setHours(Math.floor(endHour), (endHour % 1) * 60);
        setEndTime(end);
        
        setSelectedColor(editingBlock.color);
      } else {
        // Reset defaults
        setLabel('');
        setSelectedDays(initialDayIndex !== undefined ? [initialDayIndex] : [0]); // Default to Monday or passed day
        
        const now = new Date();
        const startH = initialStartHour !== undefined ? Math.floor(initialStartHour) : 9;
        const startM = initialStartHour !== undefined ? (initialStartHour % 1) * 60 : 0;
        
        now.setHours(startH, startM, 0, 0); 
        setStartTime(new Date(now));
        
        now.setHours(startH + 1, startM, 0, 0); // Default 1 hour duration
        setEndTime(new Date(now));
        
        setSelectedColor(PRESET_COLORS[0]);
      }
    }
  }, [visible, editingBlock, initialDayIndex, initialStartHour]);

  const toggleDay = (index: number) => {
    const dayIndex = index as DayIndex; // Cast to DayIndex
    if (editingBlock) return; // Can't change day when editing single block
    
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== dayIndex));
      }
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  const handleSave = () => {
    if (!label.trim()) return;

    const startH = startTime.getHours() + startTime.getMinutes() / 60;
    const endH = endTime.getHours() + endTime.getMinutes() / 60;
    
    // Validate range
    let validatedStart = Math.max(START_HOUR, startH);
    let validatedEnd = Math.min(END_HOUR, endH);
    
    if (validatedEnd <= validatedStart) {
        validatedEnd = validatedStart + 1;
    }
    
    const duration = validatedEnd - validatedStart;

    onSave({
      dayIndex: selectedDays[0], // Primary day
      startHour: validatedStart,
      duration,
      label,
      color: selectedColor,
    }, editingBlock ? [] : selectedDays); // Pass all days if creating new
  };

  const formattedTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {editingBlock ? 'Edit Block' : 'Add Busy Block'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="chevron.right" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Label Input */}
            <Text style={[styles.label, { color: theme.text }]}>Label</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.icon }
              ]}
              placeholder="e.g. Work, Gym"
              placeholderTextColor={theme.icon}
              value={label}
              onChangeText={setLabel}
            />

            {/* Day Selector */}
            <Text style={[styles.label, { color: theme.text }]}>
              {editingBlock ? 'Day' : 'Repeat on Days'}
            </Text>
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map((day, index) => {
                const isSelected = selectedDays.includes(index as DayIndex);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      isSelected && { backgroundColor: theme.primary },
                      !isSelected && { borderColor: theme.icon, borderWidth: 1 }
                    ]}
                    onPress={() => toggleDay(index as DayIndex)}
                    disabled={!!editingBlock}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: isSelected ? '#FFF' : theme.text }
                    ]}>
                      {day.charAt(0)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time Pickers */}
            <View style={styles.timeRow}>
              <View style={styles.timeContainer}>
                <Text style={[styles.label, { color: theme.text }]}>Start</Text>
                {Platform.OS === 'android' && (
                    <TouchableOpacity onPress={() => setShowStartPicker(true)} style={[styles.timeButton, { backgroundColor: theme.background }]}>
                        <Text style={{color: theme.text}}>{formattedTime(startTime)}</Text>
                    </TouchableOpacity>
                )}
                {(Platform.OS === 'ios' || showStartPicker) && (
                    <DateTimePicker
                    value={startTime}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                        setShowStartPicker(false);
                        if (date) setStartTime(date);
                    }}
                    themeVariant={colorScheme ?? 'light'}
                    textColor={theme.text} // iOS specific prop not always supported but worth trying
                    style={Platform.OS === 'ios' ? { alignSelf: 'flex-start' } : undefined}
                    />
                )}
              </View>

              <View style={styles.timeContainer}>
                <Text style={[styles.label, { color: theme.text }]}>End</Text>
                  {Platform.OS === 'android' && (
                    <TouchableOpacity onPress={() => setShowEndPicker(true)} style={[styles.timeButton, { backgroundColor: theme.background }]}>
                        <Text style={{color: theme.text}}>{formattedTime(endTime)}</Text>
                    </TouchableOpacity>
                  )}
                 {(Platform.OS === 'ios' || showEndPicker) && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setEndTime(date);
                    }}
                    themeVariant={colorScheme ?? 'light'}
                    style={Platform.OS === 'ios' ? { alignSelf: 'flex-start' } : undefined}
                  />
                  )}
              </View>
            </View>
            
            {/* Color Picker */}
            <Text style={[styles.label, { color: theme.text }]}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    selectedColor === color && { borderWidth: 2, borderColor: theme.text }
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </ScrollView>

          </ScrollView>

          <View style={styles.footer}>
            {editingBlock && onDelete && (
                <TouchableOpacity onPress={() => onDelete(editingBlock.id)} style={[styles.deleteButton]}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
            )}
            <View style={{flex: 1}} />
            <TouchableOpacity onPress={onClose} style={[styles.button, { backgroundColor: theme.background, marginRight: 10 }]}>
              <Text style={{ color: theme.text }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.button, { backgroundColor: theme.primary }]}>
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeContainer: {
    flex: 1,
    marginRight: 10,
  },
  timeButton: {
      padding: 10,
      borderRadius: 8,
      alignItems: 'center'
  },
  colorRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 30,
    paddingBottom: 20, // specific for iOS safe area if needed
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      justifyContent: 'center',
  },
  deleteButtonText: {
      color: '#EF4444',
      fontWeight: '600',
  }
});
