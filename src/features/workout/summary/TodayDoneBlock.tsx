import { ListChecks } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import type { WorkoutDetail } from '@/db/repo/workouts';
import { buildPenGroups, penTimesSign } from '@/domain/pen/serializeWorkout';
import { useSettings } from '@/store/settings';
import { PenLine, PenTableHeader, PenTableRow } from '@/features/pen/PenTable';
import { radius, spacing, useColors } from '@/ui';
import { SummaryBlockHeader } from './SummaryBlockHeader';

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
  // Подходы пишутся так же, как в режиме «Ручка»: «70кг х 9(1)/8/8».
  const penOptions = useMemo(
    () => ({ weightUnit, distanceUnit, language: i18n.language }),
    [weightUnit, distanceUnit, i18n.language],
  );

  const exerciseRows = useMemo<ExerciseRow[]>(() => {
    return (workoutDetail?.exercises ?? []).map((workoutExercise) => {
      // Разминочные подходы остаются в списке с суффиксом «р», как и в тексте «Ручки».
      // Знак «+» у добавленного веса здесь не нужен — это таблица с историей, а не текст «Ручки».
      const lines = buildPenGroups(workoutExercise.sets, workoutExercise.exercise.type, penOptions, {
        includeWeightSign: false,
      }).map((group) => ({
        weight: group.weightText,
        setsAndReps: group.valuesText || '—',
      }));
      return {
        id: workoutExercise.id,
        name: exerciseName(workoutExercise.exercise, i18n.language),
        lines: lines.length > 0 ? lines : [{ weight: null, setsAndReps: '—' }],
      };
    });
  }, [workoutDetail, penOptions, i18n.language]);

  const anyExerciseHasWeight = exerciseRows.some((row) => row.lines.some((line) => line.weight != null));

  if (exerciseRows.length === 0) return null;

  const timesSign = penTimesSign(i18n.language);

  return (
    <Animated.View entering={FadeInDown.delay(120).duration(160)} style={styles.block}>
      <SummaryBlockHeader icon={ListChecks} title={translate('workout.todayDone')} />
      <View style={[styles.paperCard, { backgroundColor: colors.paper }]}>
        <PenTableHeader
          tone="paper"
          nameTitle={translate('workout.exerciseColumn')}
          weightTitle={anyExerciseHasWeight ? translate('workout.weight') : null}
          valuesTitle={translate('workout.setsAndReps')}
        />
        {exerciseRows.map((row) => (
          <PenTableRow key={row.id} name={row.name} tone="paper">
            {row.lines.map((line, lineIndex) => (
              <PenLine
                key={lineIndex}
                tone="paper"
                weight={line.weight}
                values={line.setsAndReps}
                timesSign={timesSign}
                hasWeightColumn={anyExerciseHasWeight}
              />
            ))}
          </PenTableRow>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.xl },
  paperCard: { borderRadius: radius.lg, padding: spacing.lg },
});
