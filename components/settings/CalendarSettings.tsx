import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScheduleStore } from "@/store/scheduleStore";
import * as Calendar from "expo-calendar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CalendarSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export function CalendarSettings({ visible, onClose }: CalendarSettingsProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const { connectedCalendarIds, toggleCalendar, requestCalendarPermissions } =
    useScheduleStore();

  const [availableCalendars, setAvailableCalendars] = useState<
    Calendar.Calendar[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (visible) {
      checkPermissionsAndLoad();
    }
  }, [visible]);

  const checkPermissionsAndLoad = async () => {
    console.log("[CalendarSettings] checkPermissionsAndLoad called");
    setLoading(true);
    try {
      console.log("[CalendarSettings] Requesting permissions...");
      const result = await requestCalendarPermissions();
      console.log(
        "[CalendarSettings] Permission result:",
        JSON.stringify(result),
      );
      setHasPermission(result.granted);

      if (result.granted) {
        console.log("[CalendarSettings] Fetching calendars...");
        const calendars = await Calendar.getCalendarsAsync();
        console.log(
          "[CalendarSettings] Raw calendars count:",
          calendars.length,
        );
        setAvailableCalendars(calendars);
      } else if (!result.canAskAgain) {
        console.log(
          "[CalendarSettings] Permission permanently denied, prompting Settings",
        );
        Alert.alert(
          "Calendar Permission Required",
          "Calendar access was denied. Please enable it in your device Settings to sync calendars.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }
    } catch (e) {
      console.error("[CalendarSettings] Error:", e);
      Alert.alert("Error", "Failed to load calendars.");
    }
    setLoading(false);
  };

  const toggleConnection = (id: string, value: boolean) => {
    toggleCalendar(id);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Manage Calendars
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={20}>
              <IconSymbol name="xmark" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Select calendars to sync events from.
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={theme.primary}
              style={{ marginTop: 20 }}
            />
          ) : !hasPermission ? (
            <View style={styles.permissionContainer}>
              <Text style={[styles.permissionText, { color: theme.text }]}>
                Calendar access is required to sync events.
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.primary }]}
                onPress={checkPermissionsAndLoad}
              >
                <Text style={styles.btnText}>Grant Access</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={availableCalendars}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isConnected = connectedCalendarIds.includes(item.id);
                return (
                  <View
                    style={[
                      styles.calendarItem,
                      { borderBottomColor: theme.background },
                    ]}
                  >
                    <View style={styles.calendarInfo}>
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: item.color || theme.primary },
                        ]}
                      />
                      <View>
                        <Text
                          style={[styles.calendarName, { color: theme.text }]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.calendarSource, { color: theme.icon }]}
                        >
                          {item.source.name}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={isConnected}
                      onValueChange={(v) => toggleConnection(item.id, v)}
                      trackColor={{
                        false: theme.background,
                        true: theme.primary,
                      }}
                      thumbColor={"#FFF"}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text
                  style={{
                    color: theme.icon,
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  No calendars found.
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: "70%", // Adjust height
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  permissionContainer: {
    alignItems: "center",
    marginTop: 40,
    gap: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: "#FFF",
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 40,
  },
  calendarItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  calendarInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: "500",
  },
  calendarSource: {
    fontSize: 12,
  },
});
