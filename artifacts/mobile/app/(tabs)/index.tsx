import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useBP } from "@/context/BPContext";
import { BPCard } from "@/components/BPCard";
import { BPChart } from "@/components/BPChart";
import { StatCard } from "@/components/StatCard";
import {
  getReadingsForDays,
  getAverages,
  getBPCategory,
  getCategoryColor,
} from "@/utils/bpUtils";
import { setDailyReminderEnabled } from "@/utils/reminders";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, isLoading } = useBP();

  const sortedReadings = useMemo(() => {
    return [...readings].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [readings]);

  const latest = sortedReadings[0] ?? null;

  const last7Days = useMemo(() => getReadingsForDays(readings, 7), [readings]);
  const averages = useMemo(() => getAverages(last7Days), [last7Days]);
  const avgCategoryColor = useMemo(() => {
    if (!averages.avgSystolic || !averages.avgDiastolic) return undefined;
    return getCategoryColor(getBPCategory(averages.avgSystolic, averages.avgDiastolic), colors);
  }, [averages, colors]);

  const recentReadings = sortedReadings.slice(0, 5);

  const trendAlert = useMemo(() => {
    if (sortedReadings.length < 3) return null;
    const recent = sortedReadings.slice(0, 3).reverse();
    const sysTrend = recent[2].systolic - recent[0].systolic;
    const diaTrend = recent[2].diastolic - recent[0].diastolic;

    if (sysTrend >= 10 || diaTrend >= 5) {
      return "Readings trending upward. Consider consulting your doctor.";
    }
    return null;
  }, [sortedReadings]);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const setDailyReminder = async () => {
    try {
      await setDailyReminderEnabled(true);
      Alert.alert('Reminder Set', 'You will get a daily notification at 8:00 AM.');
    } catch {
      Alert.alert(
        Platform.OS === 'web' ? 'Not available on web' : 'Permission needed',
        Platform.OS === 'web'
          ? 'Daily reminders are available in the Android and iOS apps.'
          : 'Please enable notifications to set reminders.'
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Loading your data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16 + webTopPadding,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Good morning
          </Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            BP Tracker
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card }]}
            onPress={setDailyReminder}
          >
            <Feather name="bell" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/log")}
          >
            <Feather name="plus" size={22} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trend Alert */}
        {trendAlert && (
          <View style={[styles.alert, { backgroundColor: colors.crisis + "20", borderColor: colors.crisis }]}>
            <Feather name="trending-up" size={18} color={colors.crisis} />
            <Text style={[styles.alertText, { color: colors.foreground }]}>{trendAlert}</Text>
          </View>
        )}

        {/* Latest Reading - Bold focus */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Latest Reading</Text>
          {latest ? (
            <BPCard reading={latest} />
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="heart" size={28} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontWeight: '600', marginTop: 10 }}>No latest reading</Text>
              <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 6 }}>
                Sit quietly for 5 minutes, then log systolic, diastolic, and pulse.
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/log")}>
                <Text style={{ color: colors.primary, marginTop: 10, fontWeight: '600' }}>Log your first reading →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats - Bold data row */}
        {last7Days.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Last 7 Days</Text>
            <View style={styles.statsRow}>
              <StatCard
                label="Avg Systolic"
                value={averages.avgSystolic || "--"}
                unit="mmHg"
                accent={avgCategoryColor}
              />
              <StatCard
                label="Avg Diastolic"
                value={averages.avgDiastolic || "--"}
                unit="mmHg"
                accent={avgCategoryColor}
              />
              <StatCard
                label="Readings"
                value={last7Days.length}
              />
            </View>
          </View>
        )}

        {/* Chart - more prominent */}
        {last7Days.length > 1 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trend (Last 7 Days)</Text>
            <BPChart 
              readings={last7Days} 
              height={240}
              onPointPress={(reading) => {
                if (reading.id) {
                  router.push(`/reading/${reading.id}`);
                }
              }} 
            />
          </View>
        )}

        {/* Recent Readings */}
        {recentReadings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Recent Readings</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/history")}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>See all →</Text>
              </TouchableOpacity>
            </View>

            {recentReadings.map((reading) => (
              <TouchableOpacity
                key={reading.id || reading.timestamp}
                onPress={() => router.push({
                  pathname: "/(tabs)/log",
                  params: { id: reading.id?.toString() }
                })}
              >
                <BPCard reading={reading} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {readings.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="activity" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Start tracking your health
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Log your first blood pressure reading to see insights here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
