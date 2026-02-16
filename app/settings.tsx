import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch, Alert, Share, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settingsStore';
import { useGoalStore } from '@/store/goalStore';
import { useStatsStore } from '@/store/statsStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { settings, updateSettings } = useSettingsStore();
  const { goals, deleteGoal } = useGoalStore();
  const { resetProgress } = useStatsStore();
  const { clearAllBlocks } = useScheduleStore();

  const handleToggle = useCallback((key: keyof typeof settings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ [key]: !settings[key] });
  }, [settings]);

  const handleCycleValue = useCallback((key: string, value: any) => {
    Haptics.selectionAsync();
    updateSettings({ [key]: value });
  }, []);

  const handleExportData = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const data = {
      exportDate: new Date().toISOString(),
      settings,
      goals,
    };
    try {
      await Share.share({
        message: JSON.stringify(data, null, 2),
        title: 'FocusFlow Data Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  }, [settings, goals]);

  const handleClearAllData = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Clear All Data',
      'Are you sure? This will delete all goals, schedules, and progress. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Everything', 
          style: 'destructive', 
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            resetProgress();
            clearAllBlocks();
            goals.forEach(g => deleteGoal(g.id));
            Alert.alert('Done', 'All data has been cleared.');
          } 
        }
      ]
    );
  }, [goals]);

  const handleResetOnboarding = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Reset Onboarding',
      'Show the onboarding flow again on next launch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            updateSettings({ isOnboardingComplete: false, hasSeenTips: false });
            Alert.alert('Done', 'Onboarding will show on next launch.');
          }
        }
      ]
    );
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }} 
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
            <IconSymbol name="chevron.left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsToggle 
            label="Enable Notifications" 
            value={settings.notificationsEnabled} 
            onToggle={() => handleToggle('notificationsEnabled')} 
            icon="bell.fill"
          />
          <SettingsOption 
            label="Reminder Timing" 
            value={`${settings.reminderMinutes} min before`} 
            onPress={() => {
              const options = [5, 10, 15, 30];
              const currentIdx = options.indexOf(settings.reminderMinutes);
              const next = options[(currentIdx + 1) % options.length];
              handleCycleValue('reminderMinutes', next);
            }}
          />
          <SettingsToggle 
            label="Sound" 
            value={settings.notificationSound} 
            onToggle={() => handleToggle('notificationSound')} 
          />
          <SettingsToggle 
            label="Vibration" 
            value={settings.notificationVibration} 
            onToggle={() => handleToggle('notificationVibration')} 
          />
        </SettingsSection>

        {/* Focus Sessions */}
        <SettingsSection title="Focus Sessions">
          <SettingsOption 
            label="Work Duration" 
            value={`${settings.pomodoroWorkDuration} min`} 
            onPress={() => {
              const val = settings.pomodoroWorkDuration + 5 > 90 ? 15 : settings.pomodoroWorkDuration + 5;
              handleCycleValue('pomodoroWorkDuration', val);
            }}
          />
          <SettingsOption 
            label="Break Duration" 
            value={`${settings.pomodoroBreakDuration} min`} 
            onPress={() => {
              const val = settings.pomodoroBreakDuration + 1 > 15 ? 2 : settings.pomodoroBreakDuration + 1;
              handleCycleValue('pomodoroBreakDuration', val);
            }}
          />
          <SettingsOption 
            label="Long Break" 
            value={`${settings.pomodoroLongBreakDuration} min`} 
            onPress={() => {
              const val = settings.pomodoroLongBreakDuration + 5 > 30 ? 10 : settings.pomodoroLongBreakDuration + 5;
              handleCycleValue('pomodoroLongBreakDuration', val);
            }}
          />
          <SettingsOption 
            label="Sessions Before Long Break" 
            value={`${settings.pomodoroSessionsBeforeLongBreak}`} 
            onPress={() => {
              const val = settings.pomodoroSessionsBeforeLongBreak >= 6 ? 2 : settings.pomodoroSessionsBeforeLongBreak + 1;
              handleCycleValue('pomodoroSessionsBeforeLongBreak', val);
            }}
          />
          <SettingsToggle 
            label="Auto-start Breaks" 
            value={settings.autoStartBreaks} 
            onToggle={() => handleToggle('autoStartBreaks')} 
          />
          <SettingsOption 
            label="Min Session Length" 
            value={`${settings.minSessionLength} min`} 
            onPress={() => {
               const val = settings.minSessionLength + 5 > 60 ? 5 : settings.minSessionLength + 5;
               handleCycleValue('minSessionLength', val);
            }}
          />
        </SettingsSection>

        {/* Schedule */}
        <SettingsSection title="Schedule">
          <SettingsOption 
            label="Week Starts On" 
            value={settings.weekStartDay} 
            onPress={() => handleCycleValue('weekStartDay', settings.weekStartDay === 'Monday' ? 'Sunday' : 'Monday')}
          />
          <SettingsOption 
            label="Wake Time" 
            value={`${settings.wakeTime}:00`} 
            onPress={() => {
              const val = settings.wakeTime >= 10 ? 5 : settings.wakeTime + 1;
              handleCycleValue('wakeTime', val);
            }}
          />
          <SettingsOption 
            label="Sleep Time" 
            value={`${settings.sleepTime}:00`} 
            onPress={() => {
              const val = settings.sleepTime >= 24 ? 20 : settings.sleepTime + 1;
              handleCycleValue('sleepTime', val);
            }}
          />
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance">
          <SettingsOption 
            label="Theme" 
            value={settings.themeMode.charAt(0).toUpperCase() + settings.themeMode.slice(1)} 
            onPress={() => {
              const modes: ('system' | 'light' | 'dark')[] = ['system', 'light', 'dark'];
              const next = modes[(modes.indexOf(settings.themeMode) + 1) % modes.length];
              handleCycleValue('themeMode', next);
            }}
          />
          <SettingsOption 
            label="Accent Color" 
            value=""
            color={settings.accentColor} 
            onPress={() => {
              const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
              const currentIdx = colors.indexOf(settings.accentColor);
              const next = colors[(currentIdx + 1) % colors.length];
              handleCycleValue('accentColor', next);
            }}
          />
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="Data & Privacy">
          <SettingsAction label="Export Data (JSON)" icon="square.and.arrow.up" onPress={handleExportData} />
          <SettingsAction label="Reset Onboarding" icon="arrow.counterclockwise" onPress={handleResetOnboarding} />
          <SettingsAction label="Reset Progress" icon="arrow.counterclockwise" onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Reset Progress', 'Clear all focus history and statistics?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Reset', style: 'destructive', onPress: () => {
                  resetProgress();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
            ]);
          }} />
          <SettingsAction label="Clear All Data" icon="trash.fill" color="#EF4444" onPress={handleClearAllData} />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <View style={styles.aboutRow}>
            <Text style={[styles.optionLabel, { color: theme.text }]}>Version</Text>
            <Text style={[styles.optionValue, { color: theme.icon }]}>1.0.0 (Gold)</Text>
          </View>
          <SettingsAction label="Privacy Policy" icon="lock.fill" onPress={() => Alert.alert('Privacy', 'Your data is stored locally on your device. We do not collect any information.')} />
          <SettingsAction label="Send Feedback" icon="envelope.fill" onPress={() => Alert.alert('Feedback', 'We appreciate your input! Email us at feedback@focusflow.app')} />
        </SettingsSection>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components with React.memo for performance
const SettingsSection = React.memo(function SettingsSection({ title, children }: any) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  return (
    <View style={styles.section} accessibilityRole="none">
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );
});

const SettingsToggle = React.memo(function SettingsToggle({ label, value, onToggle, icon }: any) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    return (
        <View style={styles.optionRow} accessibilityRole="switch" accessibilityState={{ checked: value }}>
            <View style={styles.optionInfo}>
                {icon && <IconSymbol name={icon} size={18} color={theme.icon} style={{ marginRight: 12 }} />}
                <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
            </View>
            <Switch 
                value={value} 
                onValueChange={onToggle} 
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#f4f3f4'}
            />
        </View>
    );
});

const SettingsOption = React.memo(function SettingsOption({ label, value, onPress, icon, color }: any) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    return (
        <TouchableOpacity 
          style={styles.optionRow} 
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}`}
          accessibilityHint="Tap to change"
        >
            <View style={styles.optionInfo}>
                {icon && <IconSymbol name={icon} size={18} color={theme.icon} style={{ marginRight: 12 }} />}
                <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
            </View>
            <View style={styles.optionRight}>
                {color ? (
                  <View style={[styles.colorCircle, { backgroundColor: color }]} />
                ) : (
                  <Text style={[styles.optionValue, { color: theme.icon }]}>{value}</Text>
                )}
                <IconSymbol name="chevron.right" size={14} color={theme.icon} style={{ marginLeft: 8 }} />
            </View>
        </TouchableOpacity>
    );
});

const SettingsAction = React.memo(function SettingsAction({ label, icon, onPress, color }: any) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    return (
        <TouchableOpacity 
          style={styles.optionRow} 
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
            <View style={styles.optionInfo}>
                <IconSymbol name={icon} size={18} color={color || theme.icon} style={{ marginRight: 12 }} />
                <Text style={[styles.optionLabel, { color: color || theme.text }]}>{label}</Text>
            </View>
            <IconSymbol name="chevron.right" size={14} color={theme.icon} />
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  colorCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.2)',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  }
});
