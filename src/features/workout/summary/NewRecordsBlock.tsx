import { Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import type { SaveResult, WorkoutDetail } from '@/db/repo/workouts';
import { pickRecordMetric, recordGain, type ValueFormatters, type RecordMetric } from '@/domain/summary';
import { getSetFieldsForExerciseType, type SetValues } from '@/domain/types';
import { Card, Text, spacing, useColors } from '@/ui';
import { SUMMARY_MUTED_TEXT_COLOR, SummaryBlockHeader, summaryStyles } from './SummaryBlockHeader';

const RECORD_LABEL_KEYS: Record<RecordMetric, string> = {
  weight: 'pr.weight',
  reps: 'workout.reps',
  duration: 'pr.duration',
  distance: 'pr.distance',
};

/** One exercise that set a record: the value that moved, the old record and the gain. */
interface RecordRow {
  id: string;
  name: string;
  label: string;
  value: string;
  /** Old record, shown only when this workout beat it. */
  previousValue: string | null;
  /** "+2.5 kg" style difference to the old record. */
  gainText: string | null;
  isFirstTime: boolean;
  workingSetCount: number;
}

type SetMetricValues = Pick<SetValues, 'weightKg' | 'reps' | 'durationSec' | 'distanceM'>;

function setValueForMetric(set: SetMetricValues, metric: RecordMetric): number | null {
  switch (metric) {
    case 'weight':
      return set.weightKg;
    case 'reps':
      return set.reps;
    case 'duration':
      return set.durationSec;
    case 'distance':
      return set.distanceM;
  }
}

function formatRecordValue(value: number | null, metric: RecordMetric, formatters: ValueFormatters): string {
  if (value == null) return '—';
  switch (metric) {
    case 'weight':
      return formatters.weight(value);
    case 'duration':
      return formatters.duration(value);
    case 'distance':
      return formatters.distance(value);
    case 'reps':
      return String(Math.round(value));
  }
}

interface NewRecordsBlockProps {
  saveResult: SaveResult;
  workoutDetail: WorkoutDetail | undefined;
  formatters: ValueFormatters;
}

/** "New records" card of the summary screen; renders nothing when no record was set. */
export function NewRecordsBlock({ saveResult, workoutDetail, formatters }: NewRecordsBlockProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();

  const recordRows = useMemo(() => {
    if (!workoutDetail) return [];
    const rows: RecordRow[] = [];
    for (const workoutExercise of workoutDetail.exercises) {
      const hits = saveResult.prs
        .filter((record) => record.exerciseId === workoutExercise.exerciseId)
        .flatMap((record) => record.hits);
      if (hits.length === 0) continue;

      const workingSets = workoutExercise.sets.filter((set) => set.type !== 'warmup');
      const metric = pickRecordMetric(getSetFieldsForExerciseType(workoutExercise.exercise.type), hits);
      let bestInWorkout: number | null = null;
      for (const set of workingSets) {
        const value = setValueForMetric(set, metric);
        if (value != null && (bestInWorkout == null || value > bestInWorkout)) bestInWorkout = value;
      }

      const gain = recordGain(hits, metric);
      let previousValue: string | null = null;
      let gainText: string | null = null;
      if (gain && gain.previous != null && gain.best > gain.previous) {
        previousValue = formatRecordValue(gain.previous, metric, formatters);
        gainText = `+${formatRecordValue(gain.best - gain.previous, metric, formatters)}`;
      }

      rows.push({
        id: workoutExercise.id,
        name: exerciseName(workoutExercise.exercise, i18n.language),
        label: translate(RECORD_LABEL_KEYS[metric]),
        value: formatRecordValue(gain?.best ?? bestInWorkout, metric, formatters),
        previousValue,
        gainText,
        isFirstTime: gain != null && gain.previous == null,
        workingSetCount: workingSets.length,
      });
    }
    return rows;
  }, [saveResult, workoutDetail, formatters, translate, i18n.language]);

  if (recordRows.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(160)} style={{ marginTop: spacing.xl }}>
      <SummaryBlockHeader icon={Trophy} title={translate('workout.newRecords')} />
      <Card raised style={{ backgroundColor: colors.white, borderColor: 'transparent' }}>
        {recordRows.map((row, index) => (
          <View key={row.id} style={[styles.recordRow, index > 0 ? summaryStyles.divider : null]}>
            <Text variant="bodyMedium" color={colors.black}>
              {row.name}
            </Text>
            <View style={styles.cells}>
              <View style={styles.cell}>
                <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR}>
                  {row.label.toUpperCase()}
                </Text>
                <Text variant="h3" color={colors.black} tabular numberOfLines={1}>
                  {row.value}
                </Text>
                <RecordChange row={row} />
              </View>
              <View style={styles.cell}>
                <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR}>
                  {translate('workout.setsDone').toUpperCase()}
                </Text>
                <Text variant="h3" color={colors.black} tabular>
                  {row.workingSetCount}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

/** Old record and gain under the new value, or "first time" for an exercise never done before. */
function RecordChange({ row }: { row: RecordRow }) {
  const colors = useColors();
  const { t: translate } = useTranslation();

  if (row.previousValue && row.gainText) {
    return (
      <Text variant="caption" color={SUMMARY_MUTED_TEXT_COLOR} tabular numberOfLines={1}>
        {row.previousValue}
        {'  '}
        <Text variant="caption" color={colors.success} tabular>
          {row.gainText}
        </Text>
      </Text>
    );
  }
  if (row.isFirstTime) {
    return (
      <Text variant="caption" color={colors.success} numberOfLines={1}>
        {translate('workout.firstTime')}
      </Text>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  recordRow: { gap: spacing.xs, paddingVertical: spacing.md },
  cells: { flexDirection: 'row', marginTop: spacing.xs },
  cell: { width: '50%', gap: 2 },
});
