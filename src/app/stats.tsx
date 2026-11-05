import { subMonths } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  listTopOneRepMaxRecords,
  listWorkouts,
  muscleSplit,
  topExercises,
  getWorkoutTotals,
  listWorkoutsSince,
} from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatDuration } from '@/domain/units';
import { MuscleSplitCard } from '@/features/stats/MuscleSplitCard';
import { StatsSummaryTiles } from '@/features/stats/StatsSummaryTiles';
import { TopExercisesCard } from '@/features/stats/TopExercisesCard';
import { TopRecordsCard } from '@/features/stats/TopRecordsCard';
import { WeeklyChart } from '@/features/stats/WeeklyChart';
import { calculateWeekStreak } from '@/features/stats/weekStreak';
import { useNow } from '@/lib/useNow';
import { useSettings } from '@/store/settings';
import { Card, Screen, Segmented, Text, spacing } from '@/ui';

type Period = '3m' | '6m' | '1y' | 'all';

const MONTHS_BY_PERIOD: Record<Exclude<Period, 'all'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

/** Метка времени начала периода; 0 означает «за всё время». */
function getPeriodStart(period: Period, now: number): number {
  if (period === 'all') return 0;
  return subMonths(now, MONTHS_BY_PERIOD[period]).getTime();
}

const TOP_RECORDS_COUNT = 8;

export default function StatsScreen() {
  const { t: translate } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const now = useNow();
  const [period, setPeriod] = useState<Period>('3m');
  const periodStart = useMemo(() => getPeriodStart(period, now), [period, now]);

  const allTimeTotals = useQuery(() => getWorkoutTotals(), []);
  const periodTotals = useQuery(() => getWorkoutTotals(periodStart || undefined), [periodStart]);
  const periodWorkouts = useQuery(() => listWorkoutsSince(periodStart), [periodStart]);
  const setsByMuscle = useQuery(() => muscleSplit(periodStart), [periodStart]);
  const mostUsedExercises = useQuery(() => topExercises(periodStart), [periodStart]);
  const topRecords = useQuery(() => listTopOneRepMaxRecords(TOP_RECORDS_COUNT), []);
  const allWorkouts = useQuery(() => listWorkouts(), []);
  const streak = useMemo(
    () =>
      calculateWeekStreak(
        allWorkouts.map((workout) => workout.startedAt),
        now,
      ),
    [allWorkouts, now],
  );

  return (
    <Screen header={{ backButton: true, title: translate('stats.title') }}>
      <Card style={styles.allTimeCard}>
        <AllTimeTile label={translate('stats.workouts')} value={String(allTimeTotals.workouts)} />
        <AllTimeTile
          label={translate('stats.time')}
          value={formatDuration(allTimeTotals.durationSec, { compact: true })}
        />
      </Card>
      <Segmented
        options={[
          { value: '3m', label: translate('stats.period3m') },
          { value: '6m', label: translate('stats.period6m') },
          { value: '1y', label: translate('stats.period1y') },
          { value: 'all', label: translate('stats.periodAll') },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <StatsSummaryTiles totals={periodTotals} streak={streak} />
      <WeeklyChart workouts={periodWorkouts} periodStart={periodStart} now={now} />
      <MuscleSplitCard setsByMuscle={setsByMuscle} />
      <TopExercisesCard exercises={mostUsedExercises} />
      <TopRecordsCard records={topRecords} weightUnit={weightUnit} />
    </Screen>
  );
}

/** Число за всё время, не зависит от выбранного периода: тренировки и время. */
function AllTimeTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.allTimeTile}>
      <Text variant="label" color="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="h3" tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  allTimeCard: { flexDirection: 'row', marginBottom: spacing.lg },
  allTimeTile: { flex: 1, gap: 4 },
});
