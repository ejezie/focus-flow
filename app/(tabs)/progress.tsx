import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStatsStore } from '@/store/statsStore';
import { useGoalStore } from '@/store/goalStore';
import { LineChart, PieChart, ContributionGraph } from 'react-native-chart-kit';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);
  
  const { dailyHistory, goalStats, currentStreak, longestStreak, lifetimeMinutes } = useStatsStore();
  const { goals } = useGoalStore();

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayMins = dailyHistory[today]?.minutes || 0;
  const todaySessions = dailyHistory[today]?.sessions || 0;
  const hasAnyData = lifetimeMinutes > 0;

  // Last 7 days chart data
  const weeklyData = useMemo(() => {
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0));
      data.push((dailyHistory[dayStr]?.minutes || 0) / 60);
    }
    // Ensure chart always has valid data (at least one non-zero value for rendering)
    if (data.every(v => v === 0)) (data as any)[data.length - 1] = 0.01;
    return { labels, datasets: [{ data }] };
  }, [dailyHistory]);

  // Goal distribution pie chart
  const goalDistribution = useMemo(() => {
    return Object.values(goalStats)
      .map(gs => {
        const goal = goals.find(g => g.id === gs.goalId);
        return {
          name: goal?.title?.substring(0, 16) || 'Unknown',
          minutes: gs.minutes,
          color: goal?.color || theme.icon,
          legendFontColor: theme.text,
          legendFontSize: 11,
        };
      })
      .filter(g => g.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  }, [goalStats, goals, theme]);

  // Heatmap data (ContributionGraph)
  const heatmapValues = useMemo(() => {
    const values = Object.values(dailyHistory).map(h => ({
      date: h.date,
      count: Math.ceil(h.minutes / 15),
    }));
    // ContributionGraph needs at least one value
    if (values.length === 0) {
      values.push({ date: today, count: 0 });
    }
    return values;
  }, [dailyHistory, today]);

  // Best day this week
  const bestDay = useMemo(() => {
    const last7 = weeklyData.datasets[0].data;
    const maxIndex = last7.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);
    const d = new Date();
    d.setDate(d.getDate() - (6 - maxIndex));
    return {
      hours: last7[maxIndex],
      day: d.toLocaleDateString('en-US', { weekday: 'long' })
    };
  }, [weeklyData]);

  const weeklyTotal = useMemo(() => 
    weeklyData.datasets[0].data.reduce((a, b) => a + b, 0),
    [weeklyData]
  );

  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => theme.icon,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
  }), [theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Progress</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>
              {hasAnyData ? 'Track your journey to focus' : 'Start focusing to see your progress'}
            </Text>
        </View>

        {/* Today's Overview */}
        <View style={styles.overviewGrid} accessibilityRole="summary">
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                <View style={styles.statHeader}>
                    <IconSymbol name="timer" size={16} color={theme.primary} />
                    <Text style={[styles.statLabel, { color: theme.icon }]}>TODAY</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>
                    {Math.round(todayMins / 60 * 10) / 10}h
                </Text>
                <Text style={[styles.statSub, { color: theme.icon }]}>
                  {todaySessions} session{todaySessions !== 1 ? 's' : ''}
                </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
                <View style={styles.statHeader}>
                    <IconSymbol name="bolt.fill" size={16} color="#FBBF24" />
                    <Text style={[styles.statLabel, { color: theme.icon }]}>STREAK</Text>
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{currentStreak}d</Text>
                <Text style={[styles.statSub, { color: theme.icon }]}>Best: {longestStreak}d</Text>
            </View>
        </View>

        {/* Weekly Chart */}
        <View style={[styles.chartContainer, { backgroundColor: theme.card }]}>
            <View style={styles.chartHeader}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Weekly Focus Hours</Text>
                <Text style={[styles.chartValue, { color: theme.primary }]}>
                     {weeklyTotal.toFixed(1)}h Total
                </Text>
            </View>
            <LineChart
                data={weeklyData}
                width={screenWidth - 72}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
            />
            {bestDay.hours > 0.01 && (
              <View style={styles.bestDayBox}>
                  <IconSymbol name="trophy.fill" size={14} color="#FBBF24" />
                  <Text style={[styles.bestDayText, { color: theme.icon }]}>
                      Best: <Text style={{fontWeight: 'bold', color: theme.text}}>{bestDay.day}</Text> ({bestDay.hours.toFixed(1)}h)
                  </Text>
              </View>
            )}
        </View>

        {/* Goal Progress */}
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Goal Progress</Text>
        </View>

        <View style={[styles.goalProgressCard, { backgroundColor: theme.card }]}>
            {goals.length > 0 ? (
                goals.map(goal => {
                    const minutes = goalStats[goal.id]?.minutes || 0;
                    const targetMinutes = goal.weeklyHours * 60;
                    const progress = targetMinutes > 0 ? Math.min(1, minutes / targetMinutes) : 0;
                    return (
                        <View key={goal.id} style={styles.goalRow} accessibilityLabel={`${goal.title}: ${Math.round(progress * 100)}% complete`}>
                            <View style={styles.goalInfo}>
                                <Text style={[styles.goalLabel, { color: theme.text }]} numberOfLines={1}>{goal.title}</Text>
                                <Text style={[styles.goalPercent, { color: theme.icon }]}>
                                    {Math.round(progress * 100)}% • {Math.round(minutes / 60 * 10) / 10}h / {goal.weeklyHours}h
                                </Text>
                            </View>
                            <View style={[styles.progressBarBg, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                <View 
                                    style={[
                                        styles.progressBarFill, 
                                        { backgroundColor: goal.color, width: `${Math.max(progress * 100, 1)}%` }
                                    ]} 
                                />
                            </View>
                        </View>
                    );
                })
            ) : (
                <View style={styles.emptyInner}>
                    <IconSymbol name="flag.fill" size={32} color={theme.icon} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <Text style={[styles.emptyText, { color: theme.icon }]}>Create goals to track weekly progress</Text>
                </View>
            )}
        </View>

        {/* Analytics */}
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Analytics</Text>
        </View>

        {goalDistribution.length > 0 ? (
            <View style={[styles.pieCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Time Distribution</Text>
                <PieChart
                    data={goalDistribution}
                    width={screenWidth - 40}
                    height={180}
                    chartConfig={chartConfig}
                    accessor={"minutes"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                />
            </View>
        ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.card }]}>
                <IconSymbol name="chart.bar.fill" size={36} color={theme.icon} style={{ opacity: 0.4, marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: theme.icon }]}>Complete focus sessions to see distribution</Text>
            </View>
        )}

        {/* Heatmap */}
        {hasAnyData && (
          <View style={[styles.heatmapCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Focus Intensity</Text>
              <ContributionGraph
                  values={heatmapValues}
                  endDate={new Date()}
                  numDays={105}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  }}
                  tooltipDataAttrs={() => ({})}
              />
          </View>
        )}

        {/* Lifetime */}
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
        </View>

        <View style={[styles.statsRow, { backgroundColor: theme.card }]}>
            <View style={styles.lifetimeStat}>
                <Text style={[styles.lifetimeValue, { color: theme.text }]}>
                    {Math.round(lifetimeMinutes / 60)}
                </Text>
                <Text style={[styles.lifetimeLabel, { color: theme.icon }]}>LIFETIME HOURS</Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.lifetimeStat}>
                <Text style={[styles.lifetimeValue, { color: theme.text }]}>
                    {Object.keys(dailyHistory).length}
                </Text>
                <Text style={[styles.lifetimeLabel, { color: theme.icon }]}>TOTAL DAYS</Text>
            </View>
        </View>

        <View style={styles.achievementsGrid}>
            <AchievementBadge 
                icon="flag.fill" 
                color="#6366F1" 
                label="First Step" 
                unlocked={lifetimeMinutes > 0} 
                sub="Complete 1 session"
            />
             <AchievementBadge 
                icon="flame.fill" 
                color="#EF4444" 
                label="On Fire" 
                unlocked={currentStreak >= 7} 
                sub="7 day streak"
            />
             <AchievementBadge 
                icon="star.fill" 
                color="#FBBF24" 
                label="Master" 
                unlocked={lifetimeMinutes >= 6000} 
                sub="100 hours focused"
            />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const AchievementBadge = React.memo(function AchievementBadge({ icon, color, label, unlocked, sub }: any) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    
    return (
        <View 
          style={[styles.achievementCard, { backgroundColor: theme.card, opacity: unlocked ? 1 : 0.4 }]}
          accessibilityLabel={`${label}: ${unlocked ? 'Unlocked' : 'Locked'}. ${sub}`}
        >
            <View style={[styles.badgeIcon, { backgroundColor: unlocked ? color : theme.icon }]}>
                <IconSymbol name={icon} size={20} color="#FFF" />
            </View>
            <Text style={[styles.badgeLabel, { color: theme.text }]}>{label}</Text>
            <Text style={[styles.badgeSub, { color: theme.icon }]}>{sub}</Text>
            {!unlocked && <View style={styles.lockedOverlay} />}
        </View>
    );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  chartContainer: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginLeft: -20,
  },
  bestDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  bestDayText: {
    fontSize: 13,
    marginLeft: 8,
  },
  goalProgressCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
  },
  goalRow: {
    marginBottom: 16,
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  goalPercent: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  pieCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  heatmapCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  lifetimeStat: {
    flex: 1,
    alignItems: 'center',
  },
  lifetimeValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  lifetimeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  vDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  achievementsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  achievementCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 110,
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeSub: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInner: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  }
});
