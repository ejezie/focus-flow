import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  withTiming, 
  useDerivedValue,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
  progress: number; // 0 to 1
  remainingTime: string; // "MM:SS"
  phase: 'work' | 'break' | 'long-break';
  size?: number;
  strokeWidth?: number;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({ 
  progress, 
  remainingTime, 
  phase,
  size = 280,
  strokeWidth = 15
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const getPhaseColor = () => {
    switch (phase) {
      case 'work': return theme.primary;
      case 'break': return '#4ADE80'; // Green
      case 'long-break': return '#2DD4BF'; // Teal
      default: return theme.primary;
    }
  };

  const phaseColor = getPhaseColor();

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress);
    return {
      strokeDashoffset: withTiming(strokeDashoffset, { duration: 500 }),
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.card}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={phaseColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.timerText, { color: theme.text }]}>{remainingTime}</Text>
        <Text style={[styles.phaseText, { color: phaseColor }]}>
          {phase.toUpperCase().replace('-', ' ')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: -2,
    opacity: 0.8,
  },
});
