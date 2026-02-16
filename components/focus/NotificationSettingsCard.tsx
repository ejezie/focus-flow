import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settingsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function NotificationSettingsCard() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { settings, updateSettings } = useSettingsStore();

  const reminderOptions = [5, 15, 30];

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <Text style={[styles.title, { color: theme.text }]}>Notification Preferences</Text>
      
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <IconSymbol name="paperplane.fill" size={18} color={theme.primary} />
          <Text style={[styles.settingLabel, { color: theme.text }]}>Focus Reminders</Text>
        </View>
        <Switch 
            value={settings.notificationsEnabled}
            onValueChange={(val) => updateSettings({ notificationsEnabled: val })}
            trackColor={{ false: '#767577', true: theme.primary }}
            thumbColor={'#f4f3f4'}
        />
      </View>

      {settings.notificationsEnabled && (
        <View style={styles.subSection}>
          <Text style={[styles.subTitle, { color: theme.icon }]}>REMINDER BEFORE SESSION</Text>
          <View style={styles.optionsContainer}>
            {reminderOptions.map(min => (
              <TouchableOpacity 
                key={min}
                onPress={() => updateSettings({ reminderMinutes: min })}
                style={[
                    styles.option, 
                    { backgroundColor: theme.background },
                    settings.reminderMinutes === min && { borderColor: theme.primary, borderWidth: 2 }
                ]}
              >
                <Text style={[
                    styles.optionText, 
                    { color: settings.reminderMinutes === min ? theme.primary : theme.text }
                ]}>
                    {min}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      <Text style={[styles.hint, { color: theme.icon }]}>
        These alerts help you stay on track with your scheduled focus blocks.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
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
    marginBottom: 16,
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
  subSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  subTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  option: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  }
});
