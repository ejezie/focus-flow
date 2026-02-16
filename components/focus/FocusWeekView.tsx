import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  Animated,
  Dimensions,
} from "react-native";
import * as Haptics from 'expo-haptics';
import {
  ScheduleBlock,
  DAYS_OF_WEEK,
  START_HOUR,
  END_HOUR,
  HOUR_HEIGHT,
} from "@/constants/types/schedule";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCurrentDayIndex, getCurrentHourFraction, formatHMM } from "@/utils/time/timeUtils";

interface FocusWeekViewProps {
  blocks: ScheduleBlock[];
  onSessionPress: (block: ScheduleBlock) => void;
  onSessionLongPress: (block: ScheduleBlock) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function FocusWeekView({ blocks, onSessionPress, onSessionLongPress }: FocusWeekViewProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 45);
  const [currentHour, setCurrentHour] = useState(getCurrentHourFraction());
  const dayWidth = containerWidth / 7;

  // Update current time line every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(getCurrentHourFraction());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width - 45); // 45 for time labels width
  };

  const getBlockStyle = (block: ScheduleBlock) => {
    const isFocus = block.relatedGoalId !== undefined;
    return {
      top: (block.startHour - START_HOUR) * HOUR_HEIGHT,
      height: block.duration * HOUR_HEIGHT,
      left: 45 + block.dayIndex * dayWidth,
      width: dayWidth - 4,
      backgroundColor: isFocus ? block.color : theme.card,
      opacity: isFocus ? 1 : 0.6,
      borderWidth: isFocus ? 0 : 1,
      borderColor: theme.icon,
    };
  };

  const hours = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i,
  );

  const currentDayIndex = getCurrentDayIndex();
  const showTimeLine = currentHour >= START_HOUR && currentHour <= END_HOUR;

  return (
    <View style={styles.container}>
      {/* Header (Days) */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.card }]}>
        <View style={{ width: 45 }} />
        {DAYS_OF_WEEK.map((day, index) => (
          <View key={day} style={[styles.headerDay, { width: dayWidth }]}>
            <Text style={[
                styles.dayText, 
                { color: index === currentDayIndex ? theme.primary : theme.text }
            ]}>
                {day}
            </Text>
            {index === currentDayIndex && (
                <View style={[styles.todayDot, { backgroundColor: theme.primary }]} />
            )}
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          height: (END_HOUR - START_HOUR) * HOUR_HEIGHT + 50,
        }}
      >
        <View style={styles.gridContainer} onLayout={handleLayout}>
          {/* Time Labels & Grid Lines */}
          {hours.map((hour) => (
            <View
              key={hour}
              style={[
                styles.hourRow,
                { top: (hour - START_HOUR) * HOUR_HEIGHT },
              ]}
            >
              <Text style={[styles.timeLabel, { color: theme.icon }]}>
                {hour}:00
              </Text>
              <View style={[styles.gridLine, { backgroundColor: theme.card, opacity: 0.5 }]} />
            </View>
          ))}

          {/* Current Time Line */}
          {showTimeLine && (
            <View style={[
                styles.currentTimeLine, 
                { 
                    top: (currentHour - START_HOUR) * HOUR_HEIGHT,
                    backgroundColor: theme.accent 
                }
            ]}>
                <View style={[styles.currentTimeCircle, { backgroundColor: theme.accent }]} />
            </View>
          )}

          {/* Vertical Lines */}
          {DAYS_OF_WEEK.map((_, index) => (
            <View
              key={index}
              style={[
                styles.verticalLine,
                { left: 45 + index * dayWidth, backgroundColor: theme.card, opacity: 0.3 },
              ]}
            />
          ))}

          {/* Blocks */}
          {blocks.map((block) => {
            const isFocus = block.relatedGoalId !== undefined;
            const pmCount = Math.floor(block.duration * 60 / 30); // Approx 30m blocks (25+5)
            
            return (
              <TouchableOpacity
                key={block.id}
                style={[
                    styles.block, 
                    getBlockStyle(block),
                    isFocus && styles.focusBlockShadow
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSessionPress(block);
                }}
                onLongPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onSessionLongPress(block);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.blockContent}>
                    <Text 
                        style={[styles.blockText, { color: isFocus ? '#FFF' : theme.text }]} 
                        numberOfLines={1}
                    >
                        {block.label}
                    </Text>
                    {isFocus && block.duration >= 0.75 && (
                        <>
                            <Text style={styles.blockDetails}>
                                {pmCount} Pomos • {Math.round(block.duration * 60)}m
                            </Text>
                            <Text style={styles.blockTime}>
                                {formatHMM(block.startHour)}
                            </Text>
                        </>
                    )}
                    {isFocus && block.duration < 0.75 && (
                        <Text style={styles.blockTime}>
                            {formatHMM(block.startHour)} ({Math.round(block.duration * 60)}m)
                        </Text>
                    )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    height: 50,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerDay: {
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  todayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      marginTop: 2,
  },
  gridContainer: {
    flex: 1,
    position: "relative",
    minHeight: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
  },
  hourRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    height: 1,
  },
  timeLabel: {
    width: 40,
    fontSize: 10,
    textAlign: "right",
    marginRight: 5,
  },
  gridLine: {
    height: 1,
    flex: 1,
  },
  currentTimeLine: {
      position: 'absolute',
      left: 40,
      right: 0,
      height: 2,
      zIndex: 100,
      alignItems: 'flex-start',
  },
  currentTimeCircle: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: -4,
      marginTop: -3,
  },
  verticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
  },
  block: {
    position: "absolute",
    borderRadius: 8,
    padding: 4,
    zIndex: 10,
  },
  focusBlockShadow: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
  },
  blockContent: {
      flex: 1,
      justifyContent: 'flex-start',
  },
  blockText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  blockDetails: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 9,
      marginTop: 2,
  },
  blockTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    marginTop: 1,
  },
});
