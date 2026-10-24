import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { SetRow } from '@/db/schema';
import { formatShortDate } from '@/domain/dates';
import { estimateOneRm } from '@/domain/oneRm';
import type { DistanceUnit, RecordType, WeightUnit } from '@/domain/types';
import { formatDuration, kgToUnit, metersToUnit, roundForDisplay } from '@/domain/units';
import { EmptyChart, LineChart, type ChartPoint } from '@/features/charts/LineChart';
import { Chip, spacing } from '@/ui';

/** Charts use the same metrics as personal records. */
export type ChartMetric = RecordType;

type Units = { weight: WeightUnit; distance: DistanceUnit };

const METRIC_LABEL_KEYS: Record<ChartMetric, string> = {
  weight: 'exercise.chartHeaviest',
  one_rm: 'exercise.chartOneRm',
  volume: 'exercise.chartVolume',
  reps: 'exercise.chartReps',
  duration: 'exercise.chartDuration',
  distance: 'exercise.chartDistance',
};

/** Value of one set for the chosen metric, already converted to the user's units; null if the set has no such value. */
function getSetMetricValue(set: SetRow, metric: ChartMetric, units: Units): number | null {
  switch (metric) {
    case 'weight':
      return set.weightKg != null ? kgToUnit(set.weightKg, units.weight) : null;
    case 'one_rm':
      return set.weightKg != null && set.reps
        ? kgToUnit(estimateOneRm(set.weightKg, set.reps), units.weight)
        : null;
    case 'volume':
      return set.weightKg != null && set.reps != null
        ? kgToUnit(set.weightKg * set.reps, units.weight)
        : null;
    case 'reps':
      return set.reps;
    case 'duration':
      return set.durationSec;
    case 'distance':
      return set.distanceM != null ? metersToUnit(set.distanceM, units.distance) : null;
  }
}

/** One chart point per workout: volume is summed over the sets, every other metric takes the best set. */
function getWorkoutMetricValue(
  entry: ExerciseHistoryEntry,
  metric: ChartMetric,
  units: Units,
): number | null {
  // Warm-up sets would drag the chart down, so they are ignored.
  const workingSets = entry.sets.filter((set) => set.type !== 'warmup');
  let workoutValue: number | null = null;
  for (const set of workingSets) {
    const setValue = getSetMetricValue(set, metric, units);
    if (setValue == null) continue;
    if (metric === 'volume') workoutValue = (workoutValue ?? 0) + setValue;
    else workoutValue = Math.max(workoutValue ?? -Infinity, setValue);
  }
  return workoutValue;
}

interface ExerciseChartsTabProps {
  history: ExerciseHistoryEntry[];
  availableMetrics: ChartMetric[];
  activeMetric: ChartMetric;
  onSelectMetric: (metric: ChartMetric) => void;
  units: Units;
}

export function ExerciseChartsTab({
  history,
  availableMetrics,
  activeMetric,
  onSelectMetric,
  units,
}: ExerciseChartsTabProps) {
  const { t: translate, i18n } = useTranslation();

  const chartPoints = useMemo(() => {
    // History comes newest first; the chart goes left to right in time.
    const oldestFirstHistory = [...history].reverse();
    const points: ChartPoint[] = [];
    oldestFirstHistory.forEach((entry, index) => {
      const value = getWorkoutMetricValue(entry, activeMetric, units);
      if (value != null && Number.isFinite(value)) {
        points.push({
          x: index,
          y: roundForDisplay(value, 1),
          label: formatShortDate(entry.startedAt, i18n.language),
        });
      }
    });
    return points;
  }, [history, activeMetric, units, i18n.language]);

  const formatYAxisValue = (value: number) =>
    activeMetric === 'duration' ? formatDuration(value) : String(Math.round(value));

  return (
    <View>
      <View style={styles.metricChips}>
        {availableMetrics.map((metric) => (
          <Chip
            key={metric}
            label={translate(METRIC_LABEL_KEYS[metric])}
            selected={metric === activeMetric}
            onPress={() => onSelectMetric(metric)}
            small
          />
        ))}
      </View>
      {chartPoints.length === 0 ? (
        <EmptyChart text={translate('exercise.noHistory')} />
      ) : (
        <LineChart data={chartPoints} formatY={formatYAxisValue} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metricChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
});
