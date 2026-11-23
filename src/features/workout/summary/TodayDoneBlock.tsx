import { ListChecks } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import { mergeRepeatedExercises } from '@/db/repo/mergeExerciseHistory';
import type { WorkoutDetail } from '@/db/repo/workouts';
import { buildSetGroups, getTimesSign } from '@/domain/setFormatting';
import { useSettings } from '@/store/settings';
import { Card, Text, spacing, useColors } from '@/ui';
import { SUMMARY_MUTED_TEXT_COLOR, SummaryBlockHeader, summaryStyles } from './SummaryBlockHeader';
import { SummaryTableHeader, summaryTableStyles } from './SummaryTable';

interface TodayDoneBlockProps {
  workoutDetail: WorkoutDetail | undefined;
}

/** Одна строка внутри упражнения: подходы, сделанные с одним весом. */
interface WeightLine {
  /** «82,5 кг» или null для упражнений без веса. */
  weight: string | null;
  /** «7 / 6» — повторы по подходам. */
  setsAndReps: string;
}

interface ExerciseRow {
  id: string;
  name: string;
  lines: WeightLine[];
}

/**
 * Всё, что сделано сегодня, в виде таблицы как на тренерской доске:
 *   Выпады   10 кг × 8 / 8
 *            12 кг × 8
 * Каждый новый вес — отдельная строка в тех же колонках «Вес» и «Подходы/Повторы».
 * Если в тренировке нет упражнений, блок не показывается.
 */
export function TodayDoneBlock({ workoutDetail }: TodayDoneBlockProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  // Подходы пишутся одной строкой на вес: «70кг х 9(1)/8/8».
  const formatOptions = useMemo(
    () => ({ weightUnit, distanceUnit, language: i18n.language }),
    [weightUnit, distanceUnit, i18n.language],
  );

  const exerciseRows = useMemo<ExerciseRow[]>(() => {
    return mergeRepeatedExercises(workoutDetail?.exercises ?? []).map((workoutExercise) => {
      // Разминочные подходы остаются в списке с суффиксом «р».
      const lines = buildSetGroups(workoutExercise.sets, workoutExercise.exercise.type, formatOptions).map(
        (group) => ({
          weight: group.weightText,
          setsAndReps: group.valuesText || '—',
        }),
      );
      return {
        id: workoutExercise.id,
        name: exerciseName(workoutExercise.exercise, i18n.language),
        lines: lines.length > 0 ? lines : [{ weight: null, setsAndReps: '—' }],
      };
    });
  }, [workoutDetail, formatOptions, i18n.language]);

  const anyExerciseHasWeight = exerciseRows.some((row) => row.lines.some((line) => line.weight != null));

  if (exerciseRows.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(160)} style={{ marginTop: spacing.xl }}>
      <SummaryBlockHeader icon={ListChecks} title={translate('workout.todayDone')} />
      <Card raised style={{ backgroundColor: colors.white, borderColor: 'transparent' }}>
        <SummaryTableHeader
          exerciseTitle={translate('workout.exerciseColumn')}
          weightTitle={anyExerciseHasWeight ? translate('workout.weight') : null}
          valuesTitle={translate('workout.setsAndReps')}
        />

        {exerciseRows.map((row) => (
          <View key={row.id} style={[summaryTableStyles.exerciseRow, summaryStyles.divider]}>
            <Text variant="bodyMedium" color={colors.black} style={summaryTableStyles.nameColumn}>
              {row.name}
            </Text>
            <View style={summaryTableStyles.valuesColumn}>
              {row.lines.map((line, lineIndex) => (
                <View key={lineIndex} style={summaryTableStyles.valueLine}>
                  {anyExerciseHasWeight ? (
                    <>
                      <Text
                        variant="bodyMedium"
                        color={colors.black}
                        tabular
                        style={summaryTableStyles.weightColumn}
                      >
                        {line.weight ?? ''}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        color={SUMMARY_MUTED_TEXT_COLOR}
                        style={summaryTableStyles.timesSignColumn}
                      >
                        {line.weight != null ? getTimesSign(i18n.language) : ''}
                      </Text>
                    </>
                  ) : null}
                  <Text
                    variant="bodyMedium"
                    color={colors.black}
                    tabular
                    style={summaryTableStyles.repsColumn}
                  >
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
