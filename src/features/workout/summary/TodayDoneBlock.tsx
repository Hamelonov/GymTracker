import { ListChecks } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import type { WorkoutDetail } from '@/db/repo/workouts';
import { formatGroup, groupSets, type ValueFormatters } from '@/domain/summary';
import { getSetFieldsForExerciseType, type WeightUnit } from '@/domain/types';
import { kgToUnit, roundForDisplay, formatNumberWithoutTrailingZeros, unitLabels } from '@/domain/units';
import { Card, Text, spacing, useColors } from '@/ui';
import { SUMMARY_MUTED_TEXT_COLOR, SummaryBlockHeader, summaryStyles } from './SummaryBlockHeader';

interface TodayDoneBlockProps {
  workoutDetail: WorkoutDetail | undefined;
  formatters: ValueFormatters;
  weightUnit: WeightUnit;
}

/**
 * Everything done today, written like a training board:
 *   Bench press   82,5 × 7/6, 80 × 8
 * The first weight sits in the "Weight" column, reps in the "Reps" column,
 * and further weights continue on the same line after a comma.
 * Renders nothing when the workout has no exercises.
 */
export function TodayDoneBlock({ workoutDetail, formatters, weightUnit }: TodayDoneBlockProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();

  const todayRows = useMemo(() => {
    const usesDecimalComma = i18n.language.startsWith('ru');
    const unitLabel = unitLabels[weightUnit] ?? weightUnit;
    // "82,5 кг" in Russian, "82.5 kg" in English.
    const formatWeightWithUnit = (weightKg: number) => {
      const number = formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(weightKg, weightUnit), 2));
      return `${usesDecimalComma ? number.replace('.', ',') : number} ${unitLabel}`;
    };

    return (workoutDetail?.exercises ?? []).map((workoutExercise) => {
      const fields = getSetFieldsForExerciseType(workoutExercise.exercise.type);
      const [firstGroup, ...otherGroups] = groupSets(workoutExercise.sets, fields, formatters);

      // The first group fills the Weight and Sets/Reps columns; groups done at
      // another weight continue in the Sets/Reps column after a comma.
      const firstGroupReps = firstGroup
        ? formatGroup({ ...firstGroup, weightKg: null }, formatWeightWithUnit)
        : '—';
      const otherGroupsText = otherGroups.map((group) => formatGroup(group, formatWeightWithUnit)).join(', ');

      return {
        id: workoutExercise.id,
        name: exerciseName(workoutExercise.exercise, i18n.language),
        weight: firstGroup?.weightKg != null ? formatWeightWithUnit(firstGroup.weightKg) : null,
        setsAndReps: otherGroupsText ? `${firstGroupReps}, ${otherGroupsText}` : firstGroupReps,
      };
    });
  }, [workoutDetail, formatters, i18n.language, weightUnit]);
  const anyExerciseHasWeight = todayRows.some((row) => row.weight != null);

  if (todayRows.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(160)} style={{ marginTop: spacing.xl }}>
      <SummaryBlockHeader icon={ListChecks} title={translate('workout.todayDone')} />
      <Card raised style={{ backgroundColor: colors.white, borderColor: 'transparent' }}>
        <View style={styles.boardRow}>
          <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR} style={styles.nameColumn}>
            {translate('workout.exerciseColumn').toUpperCase()}
          </Text>
          {anyExerciseHasWeight ? (
            <>
              <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR} style={styles.weightColumn}>
                {translate('workout.weight').toUpperCase()}
              </Text>
              <View style={styles.timesSignColumn} />
            </>
          ) : null}
          <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR} style={styles.repsColumn}>
            {translate('workout.setsAndReps').toUpperCase()}
          </Text>
        </View>
        {todayRows.map((row) => (
          <View key={row.id} style={[styles.boardRow, summaryStyles.divider, styles.boardLine]}>
            <Text variant="bodyMedium" color={colors.black} style={styles.nameColumn}>
              {row.name}
            </Text>
            {anyExerciseHasWeight ? (
              <>
                <Text variant="bodyMedium" color={colors.black} tabular style={styles.weightColumn}>
                  {row.weight ?? ''}
                </Text>
                <Text variant="bodyMedium" color={SUMMARY_MUTED_TEXT_COLOR} style={styles.timesSignColumn}>
                  {row.weight != null ? '×' : ''}
                </Text>
              </>
            ) : null}
            <Text variant="bodyMedium" color={colors.black} tabular style={styles.repsColumn}>
              {row.setsAndReps}
            </Text>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  boardRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  boardLine: { paddingVertical: spacing.md },
  nameColumn: { width: '30%' },
  weightColumn: { width: 72, textAlign: 'right' },
  timesSignColumn: { width: 14, textAlign: 'center' },
  repsColumn: { flex: 1 },
});
