import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width, height } = Dimensions.get('window');

export function QuickTipsOverlay({ onDismiss }: { onDismiss: () => void }) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [tipIndex, setTipIndex] = useState(0);

  const tips = [
    {
        title: "Home Hub",
        desc: "Check your upcoming focus sessions and current streaks here.",
        icon: "house.fill",
        position: { top: 120, left: 40 }
    },
    {
        title: "Smart Schedule",
        desc: "Add your busy times and let our AI plan your focus blocks automatically.",
        icon: "calendar",
        position: { bottom: 100, left: 40 }
    },
    {
        title: "Focus Mode",
        desc: "Tap any upcoming session to enter full-screen Pomodoro mode.",
        icon: "timer",
        position: { bottom: 100, right: 40 }
    }
  ];

  const handleNext = () => {
    if (tipIndex < tips.length - 1) {
        setTipIndex(tipIndex + 1);
    } else {
        onDismiss();
    }
  };

  const currentTip = tips[tipIndex];

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.tipCard, { backgroundColor: theme.card, ...currentTip.position as any }]}>
            <View style={styles.tipHeader}>
                <IconSymbol name={currentTip.icon as any} size={24} color={theme.primary} />
                <Text style={[styles.tipTitle, { color: theme.text }]}>{currentTip.title}</Text>
            </View>
            <Text style={[styles.tipDesc, { color: theme.icon }]}>{currentTip.desc}</Text>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: theme.primary }]} onPress={handleNext}>
                <Text style={styles.btnText}>{tipIndex === tips.length - 1 ? "Got it!" : "Next"}</Text>
            </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  tipCard: {
    position: 'absolute',
    width: width * 0.8,
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tipDesc: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  nextBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
