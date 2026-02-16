import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScheduleBlock } from '@/constants/types/schedule';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatHMM } from '@/utils/time/timeUtils';

interface UpcomingSessionCardProps {
  session: ScheduleBlock;
  onStart: () => void;
}

export function UpcomingSessionCard({ session, onStart }: UpcomingSessionCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const currentHour = (new Date().getHours()) + (new Date().getMinutes() / 60);
  const isInProgress = session.startHour <= currentHour && (session.startHour + session.duration) > currentHour;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: session.color }]}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={[styles.label, { color: theme.icon }]}>
            {isInProgress ? 'IN PROGRESS' : 'UPCOMING SESSION'}
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>{session.label}</Text>
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={14} color={session.color} />
            <Text style={[styles.time, { color: theme.text }]}>
              {formatHMM(session.startHour)} ({Math.round(session.duration * 60)} min)
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: session.color }]}
            onPress={onStart}
            activeOpacity={0.8}
        >
            <IconSymbol name={isInProgress ? "play.fill" : "paperplane.fill"} size={20} color="#FFF" />
            <Text style={styles.startButtonText}>{isInProgress ? 'Focus' : 'Start'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginVertical: 10,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginLeft: 15,
  },
  startButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  }
});
