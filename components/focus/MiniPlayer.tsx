import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusStore } from '@/store/focusStore';

export function MiniPlayer() {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const activeSession = useFocusStore(s => s.activeSession);
  const pauseSession = useFocusStore(s => s.pauseSession);
  const resumeSession = useFocusStore(s => s.resumeSession);

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [slideAnim] = useState(new Animated.Value(100));

  // segments looks like ["(tabs)", "index"] or ["focus", "active"]
  const isOnFocusScreen = segments.join('/') === 'focus/active';
  const shouldShow = activeSession && !activeSession.isFinished && !isOnFocusScreen;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : 100,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [shouldShow]);

  // Timer tick
  useEffect(() => {
    if (!activeSession || activeSession.isFinished) return;

    const tick = () => {
      if (activeSession.isPaused) {
        setRemainingSeconds(activeSession.remainingTimeAtPause || 0);
      } else {
        const elapsed = (Date.now() - activeSession.startTime) / 1000;
        setRemainingSeconds(Math.max(0, activeSession.duration - elapsed));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.isPaused, activeSession?.startTime, activeSession?.duration, activeSession?.isFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const phaseColor = activeSession?.phase === 'work' 
    ? theme.primary 
    : activeSession?.phase === 'break' 
      ? '#10B981' 
      : '#14B8A6';

  const progressWidth = activeSession 
    ? ((1 - remainingSeconds / activeSession.duration) * 100) + '%'
    : '0%';

  if (!shouldShow && segments.join('/') === 'focus/active') return null;
  if (!activeSession || activeSession.isFinished) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.card,
          transform: [{ translateY: slideAnim }],
        //   borderTopColor: phaseColor,
        }
      ]}
    >
      {/* Progress bar at top */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: phaseColor }]} />
      </View>

      {/* Content */}
      <TouchableOpacity 
        style={styles.content}
        onPress={() => {
          console.log('[MiniPlayer] Expanding to full timer');
          router.push('/focus/active');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.leftSection}>
          <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
          <View>
            <Text style={[styles.goalName, { color: theme.text }]} numberOfLines={1}>
              {activeSession.goalName}
            </Text>
            <Text style={[styles.phaseLabel, { color: theme.icon }]}>
              {activeSession.phase === 'work' ? 'Focus' : 'Break'} • {formatTime(remainingSeconds)}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.miniBtn, { backgroundColor: phaseColor }]}
            onPress={(e) => {
              e.stopPropagation?.();
              console.log('[MiniPlayer] Play/Pause pressed');
              activeSession.isPaused ? resumeSession() : pauseSession();
            }}
          >
            <IconSymbol 
              name={activeSession.isPaused ? "play.fill" : "pause.fill"} 
              size={18} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 85,
    left: 12,
    right: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: '40%',
  },
  progressTrack: {
    height: 3,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goalName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  phaseLabel: {
    fontSize: 12,
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 12,
  },
  miniBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
