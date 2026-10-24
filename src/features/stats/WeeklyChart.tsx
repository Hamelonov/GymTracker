import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutRow } from '@/db/schema';
import { EmptyChart, LineChart } from '@/features/charts/LineChart';
import { Chip, SectionTitle, spacing } from '@/ui';
import { buildWeeklyChartPoints, type WeeklyMetric } from './weeklyChartPoints';

const METRICS: WeeklyMetric[] = ['workouts', 'duration', 'sets'];

interface WeeklyChartProps {
  workouts: WorkoutRow[];
  periodStart: number;
  now: number;
}

/** Раздел «По неделям»: чипы метрик и столбчатый график этой метрики по неделям. */
export function WeeklyChart({ workouts, periodStart, now }: WeeklyChartProps) {
  const { t: translate, i18n } = useTranslation();
  const [metric, setMetric] = useState<WeeklyMetric>('workouts');
  const chartPoints = useMemo(
    () =>
      buildWeeklyChartPoints({
        workouts,
        periodStart,
        now,
        metric,
        language: i18n.language,
      }),
    [workouts, periodStart, now, metric, i18n.language],
  );

  const getMetricLabel = (metricOption: WeeklyMetric) =>
    metricOption === 'duration'
      ? `${translate('stats.time')} (${translate('common.min')})`
      : translate(`stats.${metricOption}`);

  return (
    <>
      <SectionTitle title={translate('stats.weekly')} />
      <View style={styles.chips}>
        {METRICS.map((metricOption) => (
          <Chip
            key={metricOption}
            label={getMetricLabel(metricOption)}
            selected={metric === metricOption}
            onPress={() => setMetric(metricOption)}
            small
          />
        ))}
      </View>
      {chartPoints.length === 0 ? (
        <EmptyChart text={translate('stats.noData')} />
      ) : (
        <LineChart data={chartPoints} kind="bar" height={200} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
});
