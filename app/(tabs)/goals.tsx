import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Colors } from "@/constants/theme";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useGoalStore } from "@/store/goalStore";
import { AddGoalModal } from "@/components/goals/AddGoalModal";
import { Goal } from "@/constants/types/goal";
import * as Haptics from 'expo-haptics';

export default function GoalsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const goals = useGoalStore((state) => state.goals);
  const addGoal = useGoalStore((state) => state.addGoal);
  const updateGoal = useGoalStore((state) => state.updateGoal);
  const deleteGoal = useGoalStore((state) => state.deleteGoal);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const handleAddGoal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingGoal(null);
    setModalVisible(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setModalVisible(true);
  };

  const handleSaveGoal = (goalData: Omit<Goal, "id" | "createdAt">) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
    } else {
      addGoal(goalData);
    }
    setModalVisible(false);
  };

  const handleDeleteGoal = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete Goal", "Are you sure you want to delete this goal? This will remove associated scheduled sessions.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          deleteGoal(id);
          setModalVisible(false);
        },
      },
    ]);
  };

  const renderGoalItem = ({ item }: { item: Goal }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: item.color,
          borderLeftWidth: 4,
        },
      ]}
      onPress={() => handleEditGoal(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.category}, priority ${item.priority}, ${item.weeklyHours} hours per week`}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        <View style={[styles.badge, { backgroundColor: item.color + "20" }]}>
          <Text style={[styles.badgeText, { color: item.color }]}>
            {item.category}
          </Text>
        </View>
      </View>

      {item.description ? (
        <Text
          style={[
            styles.cardDescription,
            { color: theme.icon, fontSize: 13, marginBottom: 8 },
          ]}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={[styles.metric, { marginRight: 16 }]}>
          <IconSymbol name="flag.fill" size={12} color={theme.icon} />
          <Text
            style={[
              styles.metricText,
              { color: theme.icon, fontSize: 12, marginLeft: 4 },
            ]}
          >
            P{item.priority}
          </Text>
        </View>
        <View style={styles.metric}>
          <IconSymbol name="clock.fill" size={12} color={theme.icon} />
          <Text
            style={[
              styles.metricText,
              { color: theme.icon, fontSize: 12, marginLeft: 4 },
            ]}
          >
            {item.weeklyHours}h / week
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Goals</Text>
        <TouchableOpacity onPress={handleAddGoal} style={{ padding: 8 }}>
          <IconSymbol name="plus" size={28} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <IconSymbol name="flag.fill" size={48} color={theme.icon} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Text style={{ color: theme.text, textAlign: "center", fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
              No goals yet
            </Text>
            <Text style={{ color: theme.icon, textAlign: "center", fontSize: 14, marginBottom: 24, maxWidth: 260 }}>
              Goals help you track what matters most. Tap + to create your first goal.
            </Text>
            <TouchableOpacity 
              style={[styles.emptyBtn, { borderColor: theme.primary }]}
              onPress={handleAddGoal}
              accessibilityRole="button"
              accessibilityLabel="Create your first goal"
            >
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Create a Goal</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <AddGoalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
        onDelete={() => editingGoal && handleDeleteGoal(editingGoal.id)}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleAddGoal}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4, // Accent color strip
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricText: {
    fontSize: 12,
    marginLeft: 4,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
