import { Ellipsis, Play } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { RoutineSummary } from '@/db/repo/routines';
import type { ExerciseRow } from '@/db/schema';
import { formatRelativeDay } from '@/domain/dates';
import { FastPressable, IconButton, Text, spacing, useColors } from '@/ui';

interface RoutineCardProps {
  routine: RoutineSummary;
  /** Упражнения по id, нужны для показа названий упражнений шаблона. */
  exercises: Map<string, ExerciseRow>;
  onStart: (routineId: string) => void;
  onMenu: (routineId: string) => void;
  onPress: (routineId: string) => void;
}

/** Строка шаблона внутри `ListGroup`: название, когда делали, упражнения, меню и кнопка запуска. */
function RoutineCardComponent({ routine, exercises, onStart, onMenu, onPress }: RoutineCardProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const exerciseNames = routine.exerciseIds
    .map((exerciseId) => exercises.get(exerciseId))
    .filter((exercise): exercise is ExerciseRow => !!exercise)
    .map((exercise) => exerciseName(exercise, i18n.language));
  const lastPerformedLabel = routine.lastPerformedAt
    ? translate('home.lastPerformed', {
        date: formatRelativeDay(routine.lastPerformedAt, i18n.language, translate),
      })
    : translate('home.neverPerformed');
  const exercisesSummary =
    exerciseNames.length > 0 ? exerciseNames.join(' · ') : translate('routine.emptyHint');

  return (
    <FastPressable
      onPress={() => onPress(routine.id)}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.pressed } : null]}
    >
      <View style={styles.textColumn}>
        <Text variant="h3" numberOfLines={1}>
          {routine.name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {lastPerformedLabel}
          {' · '}
          {translate('home.exercisesCount', { count: routine.exerciseCount })}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {exercisesSummary}
        </Text>
      </View>
      <IconButton
        icon={Ellipsis}
        label={translate('common.menu')}
        onPress={() => onMenu(routine.id)}
        haptic="selection"
      />
      <IconButton
        icon={Play}
        variant="accent"
        label={translate('home.startRoutine')}
        style={styles.startButton}
        onPress={() => onStart(routine.id)}
      />
    </FastPressable>
  );
}

export const RoutineCard = memo(RoutineCardComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  textColumn: { flex: 1, gap: 2 },
  startButton: { width: 48, height: 48 },
});
