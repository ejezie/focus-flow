import { Colors } from "@/constants/theme";
import {
  DAYS_OF_WEEK,
  END_HOUR,
  HOUR_HEIGHT,
  ScheduleBlock,
  START_HOUR,
} from "@/constants/types/schedule";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface WeekViewProps {
  blocks: ScheduleBlock[];
  onBlockPress: (block: ScheduleBlock) => void;
  onGridPress: (dayIndex: number, hour: number) => void;
}

export function WeekView({ blocks, onBlockPress, onGridPress }: WeekViewProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [containerWidth, setContainerWidth] = React.useState(0);
  const dayWidth = containerWidth / 7;

  const hours = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, i) => START_HOUR + i,
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width - 45); // 45 for time labels width
  };

  const getBlockStyle = (block: ScheduleBlock) => {
    return {
      top: (block.startHour - START_HOUR) * HOUR_HEIGHT,
      height: block.duration * HOUR_HEIGHT,
      left: 45 + block.dayIndex * dayWidth,
      width: dayWidth - 4, // 2px gap on each side
      backgroundColor: block.source === "calendar" ? theme.card : block.color,
      borderWidth: block.source === "calendar" ? 1 : 0,
      borderColor: block.source === "calendar" ? theme.icon : "transparent",
      opacity: block.source === "calendar" ? 0.8 : 1,
    };
  };

  // Simple overlap detection for visual feedback
  const getConflictStyle = (block: ScheduleBlock) => {
    const isOverlapping = blocks.some(
      (b) =>
        b.id !== block.id &&
        b.dayIndex === block.dayIndex &&
        block.startHour < b.startHour + b.duration &&
        block.startHour + block.duration > b.startHour,
    );

    if (isOverlapping) {
      return {
        borderWidth: 2,
        borderColor: "#EF4444", // Red for conflict
      };
    }
    return {};
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Header (Days) */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.card, borderBottomColor: theme.icon },
          ]}
        >
          <View style={{ width: 45 }} />
          {DAYS_OF_WEEK.map((day, index) => (
            <View key={day} style={[styles.headerDay, { width: dayWidth }]}>
              <Text style={[styles.dayText, { color: theme.text }]}>{day}</Text>
            </View>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={{
            height: (END_HOUR - START_HOUR) * HOUR_HEIGHT + 50,
          }}
        >
          <View style={styles.gridContainer} onLayout={handleLayout}>
            {/* Time Labels & Horizontal Lines */}
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
                <View
                  style={[
                    styles.gridLine,
                    { backgroundColor: theme.card, width: "100%" },
                  ]}
                />
              </View>
            ))}

            <View
              style={{
                position: "absolute",
                left: 2,
                top: HOUR_HEIGHT,
                bottom: 0,
                width: 10,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: theme.icon,
                  fontSize: 10,
                  fontWeight: "bold",
                  transform: [{ rotate: "-90deg" }],
                  width: 100,
                  textAlign: "center",
                }}
              >
                HOURS
              </Text>
            </View>

            {/* Vertical Lines */}
            {DAYS_OF_WEEK.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.verticalLine,
                  { left: 45 + index * dayWidth, backgroundColor: theme.card },
                ]}
              />
            ))}

            {/* Blocks */}
            {blocks.map((block) => (
              <TouchableOpacity
                key={block.id}
                style={[
                  styles.block,
                  getBlockStyle(block),
                  getConflictStyle(block),
                ]}
                onPress={() => onBlockPress(block)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.blockText,
                    block.source === "calendar" && { color: theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {block.label}
                </Text>
                <Text style={styles.blockTime} numberOfLines={1}>
                  {Math.floor(block.startHour)}:
                  {((block.startHour % 1) * 60).toString().padStart(2, "0")}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Transparent Touch Overlay for Empty Slots */}
            {containerWidth > 0 &&
              Array.from({ length: 7 }).map((_, dIndex) => (
                <View
                  key={`touch-${dIndex}`}
                  style={{
                    position: "absolute",
                    left: 45 + dIndex * dayWidth,
                    top: 0,
                    width: dayWidth,
                    height: "100%",
                    zIndex: -1, // Behind blocks
                  }}
                >
                  {/* We can map hour slots here for precise tapping if needed, 
                           or just rely on coordinate math in parent. 
                           Let's do coordinate math if possible, but simple Pressables per hour is easier. */}
                  {hours.slice(0, -1).map((h) => (
                    <TouchableOpacity
                      key={`${dIndex}-${h}`}
                      style={{
                        height: HOUR_HEIGHT,
                        width: "100%",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      onPress={() => onGridPress(dIndex, h)}
                    >
                      <Text
                        style={{
                          color: theme.icon,
                          opacity: 0.7,
                          fontSize: 10,
                        }}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    height: 40,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  headerDay: {
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
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
    height: 1, // Line height
    zIndex: 1, // Labels above background
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
  verticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    zIndex: 0,
  },
  block: {
    position: "absolute",
    borderRadius: 4,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  blockText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  blockTime: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 9,
  },
});
