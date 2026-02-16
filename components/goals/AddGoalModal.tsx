import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, ScrollView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors } from '@/constants/theme';
import { Goal, GOAL_CATEGORIES, PRESET_GOAL_COLORS, GoalCategory } from '@/constants/types/goal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AddGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  editingGoal?: Goal | null;
  onDelete?: (id: string) => void;
}

export function AddGoalModal({ visible, onClose, onSave, editingGoal, onDelete }: AddGoalModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Study');
  const [priority, setPriority] = useState(3);
  const [weeklyHours, setWeeklyHours] = useState(5);
  const [selectedColor, setSelectedColor] = useState(PRESET_GOAL_COLORS[0]);

  useEffect(() => {
    if (visible) {
      if (editingGoal) {
        setTitle(editingGoal.title);
        setDescription(editingGoal.description || '');
        setCategory(editingGoal.category);
        setPriority(editingGoal.priority);
        setWeeklyHours(editingGoal.weeklyHours);
        setSelectedColor(editingGoal.color);
      } else {
        // Reset defaults
        setTitle('');
        setDescription('');
        setCategory('Study');
        setPriority(3);
        setWeeklyHours(5);
        setSelectedColor(PRESET_GOAL_COLORS[0]);
      }
    }
  }, [visible, editingGoal]);

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title,
      description,
      category,
      priority,
      weeklyHours,
      color: selectedColor,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {editingGoal ? 'Edit Goal' : 'New Goal'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="chevron.right" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <Text style={[styles.label, { color: theme.text }]}>Title</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.icon }
              ]}
              placeholder="e.g. Master React Native"
              placeholderTextColor={theme.icon}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description Input */}
            <Text style={[styles.label, { color: theme.text }]}>Description (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.icon, minHeight: 60 }
              ]}
              placeholder="Add details..."
              placeholderTextColor={theme.icon}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Category Selector */}
            <Text style={[styles.label, { color: theme.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {GOAL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    { 
                        backgroundColor: category === cat ? theme.primary : theme.background,
                        borderColor: theme.icon,
                        borderWidth: category === cat ? 0 : 1,
                    }
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={{ color: category === cat ? '#FFF' : theme.text, fontWeight: '600' }}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Priority Slider */}
            <Text style={[styles.label, { color: theme.text }]}>
                Priority: {priority}
            </Text>
            <View style={styles.sliderContainer}>
                <Slider
                    style={{width: '100%', height: 40}}
                    minimumValue={1}
                    maximumValue={5}
                    step={1}
                    value={priority}
                    onValueChange={setPriority}
                    minimumTrackTintColor={theme.primary}
                    maximumTrackTintColor={theme.icon}
                    thumbTintColor={theme.text}
                />
                <View style={styles.sliderLabels}>
                    <Text style={{color: theme.icon, fontSize: 10}}>Low</Text>
                    <Text style={{color: theme.icon, fontSize: 10}}>High</Text>
                </View>
            </View>

            {/* Weekly Hours Input */}
            <Text style={[styles.label, { color: theme.text }]}>Target Hours/Week: {weeklyHours}h</Text>
            <View style={styles.sliderContainer}>
                <Slider
                    style={{width: '100%', height: 40}}
                    minimumValue={1}
                    maximumValue={40}
                    step={1}
                    value={weeklyHours}
                    onValueChange={setWeeklyHours}
                    minimumTrackTintColor={theme.accent}
                    maximumTrackTintColor={theme.icon}
                    thumbTintColor={theme.text}
                />
            </View>

            {/* Color Picker */}
            <Text style={[styles.label, { color: theme.text }]}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
              {PRESET_GOAL_COLORS.map((color) => (
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
            {editingGoal && onDelete && (
                <TouchableOpacity onPress={() => onDelete(editingGoal.id)} style={[styles.deleteButton]}>
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
    maxHeight: '90%',
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
    maxHeight: 500,
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
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sliderContainer: {
      paddingHorizontal: 10,
  },
  sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
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
