import { FlashList } from '@shopify/flash-list';
import { Trophy } from 'lucide-react-native';
import React, { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { formatRelativeDay } from '@/domain/dates';
import { buildPenGroups, penTimesSign } from '@/domain/pen/serializeWorkout';
import type { DistanceUnit, ExerciseType, WeightUnit } from '@/domain/types';
import { PenGroupLine } from '@/features/history/WorkoutExerciseBlock';
import { push } from '@/lib/nav';
import { EmptyState, FastPressable, Text, spacing, useColors } from '@/ui';

interface ExerciseHistoryTabProps {
  history: ExerciseHistoryEntry[];
  exerciseType: ExerciseType;
  units: { weight: WeightUnit; distance: DistanceUnit };
}

/** Все тренировки, в которых делалось это упражнение, от новых к старым, с их подходами. */
export function ExerciseHistoryTab({ history, exerciseType, units }: ExerciseHistoryTabProps) {
  const { t: translate, i18n } = useTranslation();

  const openWorkout = useCallback((workoutId: string) => {
    push({ pathname: '/workout/[id]', params: { id: workoutId } });
  }, []);

  const renderEntry = useCallback(
    ({ item }: { item: ExerciseHistoryEntry }) => (
      <ExerciseHistoryRow
        entry={item}
        exerciseType={exerciseType}
        weightUnit={units.weight}
        distanceUnit={units.distance}
        language={i18n.language}
        onPress={openWorkout}
      />
    ),
    [exerciseType, units.weight, units.distance, i18n.language, openWorkout],
  );

  if (history.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={translate('exercise.noHistory')}
        hint={translate('exercise.noHistoryHint')}
      />
    );
  }

  return (
    <FlashList
      data={history}
      keyExtractor={(entry) => entry.workoutId}
      renderItem={renderEntry}
      contentContainerStyle={styles.listContent}
    />
  );
}

interface ExerciseHistoryRowProps {
  entry: ExerciseHistoryEntry;
  exerciseType: ExerciseType;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  language: string;
  onPress: (workoutId: string) => void;
}

const ExerciseHistoryRow = memo(function ExerciseHistoryRow({
  entry,
  exerciseType,
  weightUnit,
  distanceUnit,
  language,
  onPress,
}: ExerciseHistoryRowProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const timesSign = penTimesSign(language);
  const groups = useMemo(
    () =>
      buildPenGroups(
        entry.sets,
        exerciseType,
        { weightUnit, distanceUnit, language },
        { includeWeightSign: false },
      ),
    [entry.sets, exerciseType, weightUnit, distanceUnit, language],
  );
  const hasWeightColumn = groups.some((group) => group.weightText != null);

  return (
    <FastPressable
      onPress={() => onPress(entry.workoutId)}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        pressed ? { backgroundColor: colors.pressed } : null,
      ]}
    >
      <View style={styles.rowHeader}>
        <Text variant="bodyMedium" numberOfLines={1} style={styles.workoutName}>
          {entry.workoutName}
        </Text>
        <Text variant="caption" color="muted">
          {formatRelativeDay(entry.startedAt, language, translate)}
        </Text>
      </View>
      {entry.note ? (
        <Text variant="caption" color="muted">
          {entry.note}
        </Text>
      ) : null}
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
    </FastPressable>
  );
});

const styles = StyleSheet.create({
  listContent: { paddingBottom: spacing.xxl },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  workoutName: { flex: 1 },
  lines: { gap: spacing.xs, marginTop: spacing.xs },
});
