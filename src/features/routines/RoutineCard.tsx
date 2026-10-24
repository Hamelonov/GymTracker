import { Ellipsis, Play } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { RoutineSummary } from '@/db/repo/routines';
import type { ExerciseRow } from '@/db/schema';
import { formatRelativeDay } from '@/domain/dates';
import { Button, Card, Icon, Pressable, Text, spacing, useColors } from '@/ui';

interface RoutineCardProps {
  routine: RoutineSummary;
  /** Exercises by id, used to show the exercise names of the routine. */
  exercises: Map<string, ExerciseRow>;
  onStart: () => void;
  onMenu: () => void;
  onPress: () => void;
}

export function RoutineCard({ routine, exercises, onStart, onMenu, onPress }: RoutineCardProps) {
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

  return (
    <Pressable onPress={onPress} scaleTo={0.985}>
      <Card raised style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="h3" numberOfLines={1}>
              {routine.name}
            </Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
              {lastPerformedLabel}
              {' · '}
              {translate('home.exercisesCount', { count: routine.exerciseCount })}
            </Text>
          </View>
          <Pressable
            onPress={onMenu}
            haptic="selection"
            hitSlop={8}
            style={[styles.menuButton, { backgroundColor: colors.surfaceAlt }]}
          >
            <Icon icon={Ellipsis} size={18} />
          </Pressable>
        </View>
        {exerciseNames.length > 0 ? (
          <Text variant="caption" color="muted" numberOfLines={2} style={styles.exerciseNames}>
            {exerciseNames.join(' · ')}
          </Text>
        ) : (
          <Text variant="caption" color="faint" style={styles.exerciseNames}>
            {translate('routine.emptyHint')}
          </Text>
        )}
        <Button
          title={translate('home.startRoutine')}
          size="sm"
          icon={<Icon icon={Play} size={14} color="onAccent" strokeWidth={2.5} />}
          onPress={onStart}
          style={styles.startButton}
        />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  menuButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  exerciseNames: { marginTop: spacing.md },
  startButton: { marginTop: spacing.md, alignSelf: 'flex-start' },
});
