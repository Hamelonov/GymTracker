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

/** Одна строка внутри упражнения: подходы, сделанные с одним весом. */
interface WeightLine {
  /** «82,5 кг» или null для упражнений без веса. */
  weight: string | null;
  /** «7/6» — повторы по подходам. */
  setsAndReps: string;
}

interface ExerciseRow {
  id: string;
  name: string;
  lines: WeightLine[];
}

/**
 * Всё, что сделано сегодня, в виде таблицы как на тренерской доске:
 *   Выпады   10 кг × 8/8
 *            12 кг × 8
 * Каждый новый вес — отдельная строка в тех же колонках «Вес» и «Подходы/Повторы».
 * Если в тренировке нет упражнений, блок не показывается.
 */
export function TodayDoneBlock({ workoutDetail, formatters, weightUnit }: TodayDoneBlockProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();

  const exerciseRows = useMemo<ExerciseRow[]>(() => {
    const usesDecimalComma = i18n.language.startsWith('ru');
    const unitLabel = unitLabels[weightUnit] ?? weightUnit;
    // «82,5 кг» в русском интерфейсе, «82.5 kg» в английском.
    const formatWeightWithUnit = (weightKg: number) => {
      const number = formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(weightKg, weightUnit), 2));
      return `${usesDecimalComma ? number.replace('.', ',') : number} ${unitLabel}`;
    };

    return (workoutDetail?.exercises ?? []).map((workoutExercise) => {
      const fields = getSetFieldsForExerciseType(workoutExercise.exercise.type);
      const groups = groupSets(workoutExercise.sets, fields, formatters);
      const lines = groups.map((group) => ({
        weight: group.weightKg != null ? formatWeightWithUnit(group.weightKg) : null,
        // Вес показываем в своей колонке, поэтому здесь форматируем группу без него.
        setsAndReps: formatGroup({ ...group, weightKg: null }, formatWeightWithUnit),
      }));
      return {
        id: workoutExercise.id,
        name: exerciseName(workoutExercise.exercise, i18n.language),
        lines: lines.length > 0 ? lines : [{ weight: null, setsAndReps: '—' }],
      };
    });
  }, [workoutDetail, formatters, i18n.language, weightUnit]);

  const anyExerciseHasWeight = exerciseRows.some((row) => row.lines.some((line) => line.weight != null));

  if (exerciseRows.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(160)} style={{ marginTop: spacing.xl }}>
      <SummaryBlockHeader icon={ListChecks} title={translate('workout.todayDone')} />
      <Card raised style={{ backgroundColor: colors.white, borderColor: 'transparent' }}>
        <View style={styles.headerRow}>
          <Text variant="label" color={SUMMARY_MUTED_TEXT_COLOR} style={styles.nameColumn}>
            {translate('workout.exerciseColumn').toUpperCase()}
          </Text>
          <View style={styles.valuesColumn}>
            <View style={styles.headerRow}>
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
          </View>
        </View>

        {exerciseRows.map((row) => (
          <View key={row.id} style={[styles.exerciseRow, summaryStyles.divider]}>
            <Text variant="bodyMedium" color={colors.black} style={styles.nameColumn}>
              {row.name}
            </Text>
            <View style={styles.valuesColumn}>
              {row.lines.map((line, lineIndex) => (
                <View key={lineIndex} style={styles.valueLine}>
                  {anyExerciseHasWeight ? (
                    <>
                      <Text variant="bodyMedium" color={colors.black} tabular style={styles.weightColumn}>
                        {line.weight ?? ''}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        color={SUMMARY_MUTED_TEXT_COLOR}
                        style={styles.timesSignColumn}
                      >
                        {line.weight != null ? '×' : ''}
                      </Text>
                    </>
                  ) : null}
                  <Text variant="bodyMedium" color={colors.black} tabular style={styles.repsColumn}>
                    {line.setsAndReps}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  nameColumn: { width: '30%' },
  valuesColumn: { flex: 1, gap: spacing.xs },
  valueLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  weightColumn: { width: 72, textAlign: 'right' },
  timesSignColumn: { width: 14, textAlign: 'center' },
  repsColumn: { flex: 1 },
});
