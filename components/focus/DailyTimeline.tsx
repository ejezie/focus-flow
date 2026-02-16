import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScheduleBlock } from '@/constants/types/schedule';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatHMM } from '@/utils/time/timeUtils';

interface DailyTimelineProps {
  sessions: ScheduleBlock[];
}

export function DailyTimeline({ sessions }: DailyTimelineProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (sessions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Timeline</Text>
      {sessions.sort((a,b) => a.startHour - b.startHour).map((session, index) => (
        <View key={session.id} style={styles.timelineItem}>
          <View style={styles.timeColumn}>
            <Text style={[styles.timeText, { color: theme.text }]}>{formatHMM(session.startHour)}</Text>
            <View style={[styles.line, { backgroundColor: theme.card }]} />
          </View>
          
          <View style={[styles.sessionCard, { backgroundColor: theme.card, borderLeftColor: session.color }]}>
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionTitle, { color: theme.text }]}>{session.label}</Text>
              <Text style={[styles.sessionDuration, { color: theme.icon }]}>
                {Math.round(session.duration * 60)} min session
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
    minHeight: 70,
  },
  timeColumn: {
    width: 60,
    alignItems: 'center',
    paddingTop: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  line: {
    width: 2,
    flex: 1,
    borderRadius: 1,
  },
  sessionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginLeft: 10,
    borderLeftWidth: 4,
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sessionDuration: {
    fontSize: 12,
  }
});
