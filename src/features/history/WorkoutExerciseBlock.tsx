import { push } from '@/lib/nav';
import { ChevronRight, Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { WorkoutDetail } from '@/db/repo/workouts';
import { buildPenGroups, penTimesSign, type PenGroup } from '@/domain/pen/serializeWorkout';
import { formatNumberWithoutTrailingZeros } from '@/domain/units';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import { PenLine, PenTableHeader } from '@/features/pen/PenTable';
import { useSettings } from '@/store/settings';
import { FastPressable, Icon, Marker, Text, spacing } from '@/ui';

type WorkoutExerciseDetail = WorkoutDetail['exercises'][number];
type GroupSet = WorkoutExerciseDetail['sets'][number];

interface WorkoutExerciseBlockProps {
  workoutExercise: WorkoutExerciseDetail;
}

/** RPE нет в записи ручкой, поэтому он идёт отдельной строкой: «@8 / @8,5». Пусто, если RPE нигде не задан. */
function buildRpeText(sets: GroupSet[]): string {
  if (!sets.some((set) => set.rpe != null)) return '';
  return sets
    .map((set) => (set.rpe != null ? `@${formatNumberWithoutTrailingZeros(set.rpe)}` : '–'))
    .join(' / ');
}

function collectRecordTypes(sets: GroupSet[]): string[] {
  const recordTypes = new Set<string>();
  for (const set of sets) {
    for (const recordType of set.prTypes) recordTypes.add(recordType);
  }
  return [...recordTypes];
}

/** Одно упражнение завершённой тренировки: заголовок-ссылка и подходы записью ручкой. */
export function WorkoutExerciseBlock({ workoutExercise }: WorkoutExerciseBlockProps) {
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const penOptions = useMemo(
    () => ({ weightUnit, distanceUnit, language: i18n.language }),
    [weightUnit, distanceUnit, i18n.language],
  );
  const groups = useMemo<PenGroup<GroupSet>[]>(
    () =>
      buildPenGroups(workoutExercise.sets, workoutExercise.exercise.type, penOptions, {
        includeWeightSign: false,
      }),
    [workoutExercise, penOptions],
  );
  const hasWeightColumn = groups.some((group) => group.weightText != null);
  const timesSign = penTimesSign(i18n.language);

  return (
    <View style={styles.block}>
      <FastPressable
        onPress={() => push({ pathname: '/exercise/[id]', params: { id: workoutExercise.exerciseId } })}
        style={styles.titleRow}
      >
        <MuscleThumbnail
          primary={workoutExercise.exercise.muscleGroup}
          secondary={workoutExercise.exercise.secondaryMuscles}
          size={32}
        />
        <Text variant="h3" style={styles.exerciseTitle}>
          {exerciseName(workoutExercise.exercise, i18n.language)}
        </Text>
        <Icon icon={ChevronRight} size={20} color="faint" />
      </FastPressable>
      {workoutExercise.note ? (
        <Text variant="caption" color="muted" style={styles.note}>
          {workoutExercise.note}
        </Text>
      ) : null}
      {groups.length > 0 ? (
        <View style={styles.table}>
          <PenTableHeader
            weightTitle={hasWeightColumn ? translate('workout.weight') : null}
            valuesTitle={translate('workout.setsAndReps')}
          />
          <View style={styles.lines}>
            {groups.map((group, groupIndex) => (
              <PenGroupLine
                key={groupIndex}
                group={group}
                hasWeightColumn={hasWeightColumn}
                timesSign={timesSign}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface PenGroupLineProps {
  group: PenGroup<GroupSet>;
  hasWeightColumn: boolean;
  timesSign: string;
}

function PenGroupLine({ group, hasWeightColumn, timesSign }: PenGroupLineProps) {
  const { t: translate } = useTranslation();
  const rpeText = buildRpeText(group.sets);
  const recordTypes = collectRecordTypes(group.sets);

  const valuesExtra =
    rpeText || recordTypes.length > 0 ? (
      <View style={styles.extras}>
        {rpeText ? (
          <Text variant="caption" color="muted" tabular>
            {rpeText}
          </Text>
        ) : null}
        <View style={styles.recordMarkers}>
          {recordTypes.map((recordType) => (
            <Marker key={recordType} icon={<Icon icon={Trophy} size={12} color="onAccent" />}>
              {translate(`pr.${recordType}`).toUpperCase()}
            </Marker>
          ))}
        </View>
      </View>
    ) : null;

  return (
    <PenLine
      weight={group.weightText}
      values={group.valuesText || '—'}
      timesSign={timesSign}
      hasWeightColumn={hasWeightColumn}
      valuesExtra={valuesExtra}
    />
  );
}

const styles = StyleSheet.create({
  block: { paddingVertical: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  exerciseTitle: { flex: 1 },
  note: { marginTop: spacing.xs },
  table: { marginTop: spacing.sm },
  lines: { gap: spacing.sm },
  extras: { gap: spacing.xs, marginTop: spacing.xs },
  recordMarkers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
