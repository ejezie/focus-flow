import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settingsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function PomodoroSettingsCard() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { settings, updateSettings } = useSettingsStore();

  const handleAdjust = (field: keyof typeof settings, amount: number, min: number, max: number) => {
    const currentVal = settings[field] as number;
    const newVal = Math.min(max, Math.max(min, currentVal + amount));
    updateSettings({ [field]: newVal });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>Pomodoro Settings</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <IconSymbol name="timer" size={18} color={theme.primary} />
          <Text style={[styles.settingLabel, { color: theme.text }]}>Work Duration</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroWorkDuration', -5, 15, 90)} style={styles.btn}>
            <Text style={{color: theme.primary, fontWeight: 'bold'}}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.value, { color: theme.text }]}>{settings.pomodoroWorkDuration}m</Text>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroWorkDuration', 5, 15, 90)} style={styles.btn}>
            <Text style={{color: theme.primary, fontWeight: 'bold'}}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <IconSymbol name="leaf.fill" size={18} color="#4ADE80" />
          <Text style={[styles.settingLabel, { color: theme.text }]}>Break Duration</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroBreakDuration', -1, 2, 15)} style={styles.btn}>
            <Text style={{color: '#4ADE80', fontWeight: 'bold'}}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.value, { color: theme.text }]}>{settings.pomodoroBreakDuration}m</Text>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroBreakDuration', 1, 2, 15)} style={styles.btn}>
            <Text style={{color: '#4ADE80', fontWeight: 'bold'}}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <IconSymbol name="star.fill" size={18} color="#2DD4BF" />
          <Text style={[styles.settingLabel, { color: theme.text }]}>Long Break</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroLongBreakDuration', -5, 5, 45)} style={styles.btn}>
            <Text style={{color: '#2DD4BF', fontWeight: 'bold'}}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.value, { color: theme.text }]}>{settings.pomodoroLongBreakDuration}m</Text>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroLongBreakDuration', 5, 5, 45)} style={styles.btn}>
            <Text style={{color: '#2DD4BF', fontWeight: 'bold'}}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <IconSymbol name="list.number" size={18} color={theme.icon} />
          <Text style={[styles.settingLabel, { color: theme.text }]}>Long Break After</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroSessionsBeforeLongBreak', -1, 2, 8)} style={styles.btn}>
            <Text style={{color: theme.icon, fontWeight: 'bold'}}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.value, { color: theme.text }]}>{settings.pomodoroSessionsBeforeLongBreak}</Text>
          <TouchableOpacity onPress={() => handleAdjust('pomodoroSessionsBeforeLongBreak', 1, 2, 8)} style={styles.btn}>
            <Text style={{color: theme.icon, fontWeight: 'bold'}}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 2,
  },
  btn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    width: 50,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
