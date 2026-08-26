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
import { useGlucose } from "@/context/GlucoseContext";
import { useMeds } from "@/context/MedsContext";
import { usePremium, FREE_HISTORY_DAYS } from "@/context/PremiumContext";
import { useGlucosePrefs } from "@/context/GlucosePrefsContext";
import { GlucoseInsightCard } from "@/components/GlucoseInsightCard";
import { BPCard } from "@/components/BPCard";
import { GlucoseCard } from "@/components/GlucoseCard";
import { BPChart } from "@/components/BPChart";
import { StatCard } from "@/components/StatCard";
import { TimeOfDayCard } from "@/components/TimeOfDayCard";
import { MedsVsBpCard } from "@/components/MedsVsBpCard";
import {
  getReadingsForDays,
  getAverages,
  getBPCategory,
  getCategoryColor,
} from "@/utils/bpUtils";
import { summarizeTimeOfDay } from "@/utils/timeOfDay";
import { summarizeMedsVsBp } from "@/utils/medAdherence";
import { setDailyReminderEnabled } from "@/utils/reminders";
import { getGlucoseAverage, getGlucoseReadingsForDays, GLUCOSE_DISCLAIMER } from "@/utils/glucoseUtils";
import { generateGlucoseInsight } from "@/utils/glucoseInsights";
import { useTarget } from "@/context/TargetContext";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { readings, isLoading } = useBP();
  const { glucose } = useGlucose();
  const { medications } = useMeds();
  const { isPremium, requirePro } = usePremium();
  const { unit: glucoseUnit } = useGlucosePrefs();
  const { target } = useTarget();

  const sortedReadings = useMemo(() => {
    return [...readings].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [readings]);

  const visibleReadings = useMemo(
    () => (isPremium ? sortedReadings : getReadingsForDays(sortedReadings, FREE_HISTORY_DAYS)),
    [sortedReadings, isPremium]
  );
  const visibleGlucose = useMemo(
    () => (isPremium ? glucose : getGlucoseReadingsForDays(glucose, FREE_HISTORY_DAYS)),
    [glucose, isPremium]
  );
  const hiddenOlderCount = isPremium
    ? 0
    : Math.max(0, readings.length - visibleReadings.length) +
      Math.max(0, glucose.length - visibleGlucose.length);

  // Latest single reading stays visible even if it is older than the free window.
  const latest = sortedReadings[0] ?? null;
  const latestGlucose = glucose[0] ?? null;
  const glucose7d = useMemo(() => getGlucoseReadingsForDays(visibleGlucose, 7), [visibleGlucose]);
  const glucoseAvg7d = getGlucoseAverage(glucose7d);
  const glucoseInsight = useMemo(
    () => generateGlucoseInsight(glucose7d.length ? glucose7d : visibleGlucose, target.glucoseMgdl),
    [visibleGlucose, glucose7d, target.glucoseMgdl]
  );

  const last7Days = useMemo(() => getReadingsForDays(visibleReadings, 7), [visibleReadings]);
  const averages = useMemo(() => getAverages(last7Days), [last7Days]);
  const timeOfDayWindow = useMemo(
    () => (isPremium ? getReadingsForDays(readings, 0) : visibleReadings),
    [readings, visibleReadings, isPremium]
  );
  const timeOfDay = useMemo(
    () => summarizeTimeOfDay(timeOfDayWindow),
    [timeOfDayWindow]
  );
  const medsVsBp = useMemo(() => summarizeMedsVsBp(timeOfDayWindow), [timeOfDayWindow]);
  const activeMedCount = medications.filter((m) => m.active).length;
  const avgCategoryColor = useMemo(() => {
    if (!averages.avgSystolic || !averages.avgDiastolic) return undefined;
    return getCategoryColor(getBPCategory(averages.avgSystolic, averages.avgDiastolic), colors);
  }, [averages, colors]);

  const recentReadings = visibleReadings.slice(0, 5);

  const trendAlert = useMemo(() => {
    if (visibleReadings.length < 3) return null;
    const recent = visibleReadings.slice(0, 3).reverse();
    const sysTrend = recent[2].systolic - recent[0].systolic;
    const diaTrend = recent[2].diastolic - recent[0].diastolic;

    if (sysTrend >= 10 || diaTrend >= 5) {
      return "Readings trending upward. Consider consulting your doctor.";
    }
    return null;
  }, [visibleReadings]);

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
        {trendAlert && (
          <View style={[styles.alert, { backgroundColor: colors.crisis + "20", borderColor: colors.crisis }]}>
            <Feather name="trending-up" size={18} color={colors.crisis} />
            <Text style={[styles.alertText, { color: colors.foreground }]}>{trendAlert}</Text>
          </View>
        )}

        {!isPremium && hiddenOlderCount > 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginHorizontal: 20, marginTop: 12 }}>
            Charts and recents use the last {FREE_HISTORY_DAYS} days. {hiddenOlderCount} older log(s) stay encrypted on this device and unlock with Pro.
          </Text>
        ) : null}

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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
              Latest glucose
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/glucose")}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>See all →</Text>
            </TouchableOpacity>
          </View>
          {latestGlucose ? (
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: "/(tabs)/log", params: { metric: "glucose", gid: String(latestGlucose.id) } })
              }
            >
              <GlucoseCard reading={latestGlucose} unit={glucoseUnit} targetMgdl={target.glucoseMgdl} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="droplet" size={28} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontWeight: "600", marginTop: 10 }}>
                Log your first glucose reading
              </Text>
              <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 6 }}>
                {GLUCOSE_DISCLAIMER}
              </Text>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/(tabs)/log", params: { metric: "glucose" } })}
              >
                <Text style={{ color: colors.primary, marginTop: 10, fontWeight: "600" }}>Log glucose →</Text>
              </TouchableOpacity>
            </View>
          )}
          {glucose7d.length > 0 && glucoseAvg7d != null ? (
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8 }}>
              7-day average {glucoseAvg7d} mg/dL ({glucose7d.length} reading{glucose7d.length === 1 ? "" : "s"}).
              Generic reference bands only.
            </Text>
          ) : null}
          {glucoseInsight ? <GlucoseInsightCard card={glucoseInsight} /> : null}
        </View>

        {timeOfDayWindow.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Time of day
            </Text>
            <TimeOfDayCard
              summaries={timeOfDay}
              isPremium={isPremium}
              onPressPro={() => requirePro('timeOfDayRich')}
            />
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8 }}>
              Averages use your local clock
              {isPremium ? '' : ` (last ${FREE_HISTORY_DAYS} days)`}. Nothing is sent to a server.
            </Text>
          </View>
        )}

        {(activeMedCount > 0 || medsVsBp.taken.count > 0) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Meds vs BP
            </Text>
            <MedsVsBpCard
              summary={medsVsBp}
              isPremium={isPremium}
              activeMedCount={activeMedCount}
              onPressPro={() => requirePro('medsCorrelation')}
            />
          </View>
        )}

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
