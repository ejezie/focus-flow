import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settingsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function TimeSettingsCard() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { settings, updateSettings } = useSettingsStore();

  const handleAdjust = (type: 'wakeTime' | 'sleepTime', amount: number) => {
      let newVal = settings[type] + amount;
      if (newVal < 0) newVal = 23;
      if (newVal > 23) newVal = 0;
      updateSettings({ [type]: newVal });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>Schedule Preferences</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <IconSymbol name="clock.fill" size={18} color={theme.primary} />
          <Text style={[styles.settingLabel, { color: theme.text }]}>Wake Up Time</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => handleAdjust('wakeTime', -1)} style={styles.btn}>
            <Text style={{color: theme.primary, fontWeight: 'bold'}}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.value, { color: theme.text }]}>{settings.wakeTime}:00</Text>
          <TouchableOpacity onPress={() => handleAdjust('wakeTime', 1)} style={styles.btn}>
            <Text style={{color: theme.primary, fontWeight: 'bold'}}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <IconSymbol name="clock.fill" size={18} color={theme.accent} />
          <Text style={[styles.settingLabel, { color: theme.text }]}>Sleep Time</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => handleAdjust('sleepTime', -1)} style={styles.btn}>
            <Text style={{color: theme.accent, fontWeight: 'bold'}}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.value, { color: theme.text }]}>{settings.sleepTime}:00</Text>
          <TouchableOpacity onPress={() => handleAdjust('sleepTime', 1)} style={styles.btn}>
            <Text style={{color: theme.accent, fontWeight: 'bold'}}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={[styles.hint, { color: theme.icon }]}>
        The AI scheduler respects these hours to avoid planning sessions during your sleep.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 4,
  },
  btn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    width: 60,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  }
});
