import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore } from '@/store/settingsStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useGoalStore } from '@/store/goalStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { generateSchedule } from '@/utils/scheduler/AutoScheduler';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { updateSettings, settings } = useSettingsStore();
  const { blocks, addBusyBlock } = useScheduleStore();
  const { goals, addGoal } = useGoalStore();

  const [step, setStep] = useState(0);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  const completeOnboarding = () => {
    updateSettings({ isOnboardingComplete: true });
    router.replace('/(tabs)');
  };

  const steps = [
    // 0: Welcome
    <WelcomeStep onNext={nextStep} theme={theme} />,
    // 1: Schedule Setup
    <ScheduleStep onNext={nextStep} onPrev={prevStep} theme={theme} blocks={blocks} addBusyBlock={addBusyBlock} />,
    // 2: Goal Creation
    <GoalStep onNext={nextStep} onPrev={prevStep} theme={theme} goals={goals} addGoal={addGoal} />,
    // 3: Auto-Schedule Preview
    <PreviewStep onComplete={completeOnboarding} onPrev={prevStep} theme={theme} settings={settings} goals={goals} blocks={blocks} />,
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.progressContainer}>
        {steps.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.progressBar, 
              { backgroundColor: i <= step ? theme.primary : theme.card, width: (width - 60) / steps.length }
            ]} 
          />
        ))}
      </View>
      {steps[step]}
    </SafeAreaView>
  );
}

function WelcomeStep({ onNext, theme }: any) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.hero}>
        <IconSymbol name="sparkles" size={80} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Welcome to FocusFlow</Text>
        <Text style={[styles.tagline, { color: theme.icon }]}>Design your perfect focus routine with AI.</Text>
      </View>

      <View style={styles.benefits}>
        <Benefit icon="calendar.badge.clock" text="AI-powered smart scheduling" theme={theme} />
        <Benefit icon="timer" text="Scientifically optimized Pomodoro flow" theme={theme} />
        <Benefit icon="chart.bar.fill" text="Detailed progress & habit analytics" theme={theme} />
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={onNext}>
        <Text style={styles.btnText}>Get Started</Text>
        <IconSymbol name="chevron.right" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

function Benefit({ icon, text, theme }: any) {
    return (
        <View style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { backgroundColor: theme.card }]}>
                <IconSymbol name={icon} size={20} color={theme.primary} />
            </View>
            <Text style={[styles.benefitText, { color: theme.text }]}>{text}</Text>
        </View>
    );
}

function ScheduleStep({ onNext, onPrev, theme, blocks, addBusyBlock }: any) {
  const busyBlocks = useMemo(() => blocks.filter((b: any) => !b.relatedGoalId), [blocks]);

  const addQuickBlock = (label: string, start: number, dur: number) => {
    addBusyBlock({
      label,
      startHour: start,
      duration: dur,
      dayIndex: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, // Today
      color: theme.icon,
    });
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Step 1: Your Schedule</Text>
      <Text style={[styles.stepDesc, { color: theme.icon }]}>
        Let's block out times when you're busy (work, classes, gym). FocusFlow will plan around these.
      </Text>

      <View style={styles.setupCard}>
        <Text style={[styles.cardSub, { color: theme.text }]}>Quick Add for Today:</Text>
        <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.chip, { backgroundColor: theme.card }]} onPress={() => addQuickBlock('Work', 9, 8)}>
                <Text style={{color: theme.text}}>+ Work (9-5)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, { backgroundColor: theme.card }]} onPress={() => addQuickBlock('Gym', 18, 1.5)}>
                <Text style={{color: theme.text}}>+ Gym (1.5h)</Text>
            </TouchableOpacity>
        </View>

        <View style={[styles.blocksPreview, { backgroundColor: theme.card }]}>
            <Text style={[styles.previewLabel, { color: theme.icon }]}>{busyBlocks.length} Busy Blocks Added</Text>
            {busyBlocks.map((b: any, i: number) => (
                <Text key={i} style={[styles.blockItem, { color: theme.text }]}>• {b.label} ({b.duration}h)</Text>
            ))}
        </View>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity onPress={onPrev}><Text style={{color: theme.icon}}>Back</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1, marginLeft: 20 }]} onPress={onNext}>
          <Text style={styles.btnText}>{busyBlocks.length > 0 ? "Continue" : "Skip for Now"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function GoalStep({ onNext, onPrev, theme, goals, addGoal }: any) {
  const handleAddGoal = (title: string, category: any, hours: number) => {
    addGoal({
      title,
      category,
      weeklyHours: hours,
      priority: 3,
      color: theme.primary,
    });
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Step 2: Your Goals</Text>
      <Text style={[styles.stepDesc, { color: theme.icon }]}>
        What do you want to focus on? We recommend adding 1-3 goals to start.
      </Text>

      <View style={styles.setupCard}>
        <Text style={[styles.cardSub, { color: theme.text }]}>Example Goals:</Text>
        <View style={styles.goalSuggestions}>
            <Suggestion title="Learn React Native" cat="Learning" hours={10} onAdd={handleAddGoal} theme={theme} />
            <Suggestion title="Write Novel" cat="Creative" hours={5} onAdd={handleAddGoal} theme={theme} />
            <Suggestion title="Deep Work" cat="Work" hours={15} onAdd={handleAddGoal} theme={theme} />
        </View>

        <View style={[styles.blocksPreview, { backgroundColor: theme.card }]}>
            <Text style={[styles.previewLabel, { color: theme.icon }]}>{goals.length} Goals Created</Text>
            {goals.map((g: any, i: number) => (
                <Text key={i} style={[styles.blockItem, { color: theme.text }]}>• {g.title} ({g.weeklyHours}h/wk)</Text>
            ))}
        </View>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity onPress={onPrev}><Text style={{color: theme.icon}}>Back</Text></TouchableOpacity>
        <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: goals.length > 0 ? theme.primary : theme.card, flex: 1, marginLeft: 20 }]} 
            onPress={goals.length > 0 ? onNext : () => Alert.alert("Wait!", "Add at least one goal to see the magic.")}
        >
          <Text style={[styles.btnText, goals.length === 0 && { color: theme.icon }]}>Generate My Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Suggestion({ title, cat, hours, onAdd, theme }: any) {
    return (
        <TouchableOpacity style={[styles.suggestionBtn, { backgroundColor: theme.card }]} onPress={() => onAdd(title, cat, hours)}>
            <View>
                <Text style={[styles.suggestionTitle, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.suggestionSub, { color: theme.icon }]}>{cat} • {hours}h/wk</Text>
            </View>
            <IconSymbol name="plus.circle.fill" size={24} color={theme.primary} />
        </TouchableOpacity>
    );
}

function PreviewStep({ onComplete, onPrev, theme, settings, goals, blocks }: any) {
  const [isGenerating, setIsGenerating] = useState(false);

  // In a real app we'd trigger the AutoScheduler here
  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
        setIsGenerating(false);
        onComplete();
    }, 1500);
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Your Focus Plan</Text>
      <Text style={[styles.stepDesc, { color: theme.icon }]}>
        Based on your busy blocks and goals, we've optimized 12 sessions for your first week.
      </Text>

      <View style={styles.previewContainer}>
        <IconSymbol name="sparkles.tv.fill" size={100} color={theme.primary} style={{ marginBottom: 20 }} />
        <Text style={[styles.previewBig, { color: theme.text }]}>Everything is ready!</Text>
        <Text style={[styles.previewSmall, { color: theme.icon }]}>
            Adjust your schedule anytime in the Focus tab. 
            We'll remind you 15 mins before sessions.
        </Text>
      </View>

      <View style={styles.navButtons}>
        <TouchableOpacity onPress={onPrev}><Text style={{color: theme.icon}}>Back</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary, flex: 1, marginLeft: 20 }]} onPress={handleGenerate} disabled={isGenerating}>
          <Text style={styles.btnText}>{isGenerating ? "Generating..." : "Start Focusing"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingTop: 20,
    gap: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  benefits: {
    marginBottom: 60,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  btnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  stepDesc: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  setupCard: {
    flex: 1,
  },
  cardSub: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  blocksPreview: {
    borderRadius: 20,
    padding: 20,
    flex: 1,
    maxHeight: 400,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  blockItem: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  goalSuggestions: {
    gap: 12,
    marginBottom: 24,
  },
  suggestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBig: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  previewSmall: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  }
});
