import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Goal } from '@/constants/types/goal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface GoalProgressCardProps {
  goal: Goal;
  scheduledHours: number;
}

export function GoalProgressCard({ goal, scheduledHours }: GoalProgressCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const progress = Math.min(scheduledHours / goal.weeklyHours, 1);
  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{goal.title}</Text>
        <Text style={[styles.percentage, { color: goal.color }]}>{percentage}%</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.background }]}>
          <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: goal.color }]} />
        </View>
      </View>
      
      <Text style={[styles.footerText, { color: theme.icon }]}>
        {scheduledHours.toFixed(1)}h / {goal.weeklyHours}h target
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    width: 200,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressContainer: {
    height: 8,
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerText: {
    fontSize: 11,
  }
});
