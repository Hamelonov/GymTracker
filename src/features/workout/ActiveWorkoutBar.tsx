import { ChevronUp, Timer } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { formatDuration } from '@/domain/units';
import { push } from '@/lib/nav';
import { useActiveWorkout } from '@/store/activeWorkout';
import {
  FastPressable,
  Icon,
  Text,
  layout,
  motionDuration,
  playHaptic,
  radius,
  spacing,
  useColors,
} from '@/ui';
import { useElapsedSeconds, useRestCountdown } from './timers';
import { WorkoutName } from './WorkoutName';

/** Идёт ли свёрнутая тренировка: экран тренировки переключает `minimized` при потере и получении фокуса. */
export function useIsWorkoutBarVisible(): boolean {
  return useActiveWorkout(
    (state) => Boolean(state.workout) && state.minimized && state.session.mode !== 'edit',
  );
}

/** Жёлтая строка над вкладками, пока идёт тренировка и её экран не открыт. Верхняя часть `TabBar`. */
export function ActiveWorkoutBar() {
  const workout = useActiveWorkout((state) => state.workout);
  const isVisible = useIsWorkoutBarVisible();
  if (!workout || !isVisible) return null;
  const completedSetCount = workout.exercises.reduce(
    (count, exercise) => count + exercise.sets.filter((set) => set.completed).length,
    0,
  );
  return (
    <MinimizedWorkoutRow
      name={workout.name}
      startedAt={workout.startedAt}
      completedSetCount={completedSetCount}
    />
  );
}

// Отдельный компонент, чтобы хуки таймера тикали только пока строка показана.
function MinimizedWorkoutRow({
  name,
  startedAt,
  completedSetCount,
}: {
  name: string;
  startedAt: number;
  completedSetCount: number;
}) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const elapsedSeconds = useElapsedSeconds(startedAt);
  const restCountdown = useRestCountdown();
  const handlePress = () => {
    push('/workout/active');
    playHaptic('light');
  };
  return (
    <Animated.View entering={FadeIn.duration(motionDuration.fast)}>
      <FastPressable
        onPress={handlePress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? colors.accentPressed : colors.accent },
        ]}
      >
        <View style={[styles.liveMark, { backgroundColor: colors.onAccent }]} />
        <View style={styles.textColumn}>
          <WorkoutName
            variant="bodyMedium"
            color="onAccent"
            signColor="onAccentMuted"
            numberOfLines={1}
            name={name || translate('workout.defaultName')}
          />
          <Text variant="caption" color="onAccentMuted" numberOfLines={1} tabular>
            {formatDuration(elapsedSeconds)} · {completedSetCount} {translate('common.sets')}
          </Text>
        </View>
        {restCountdown.running ? (
          <View style={[styles.restBadge, { backgroundColor: colors.onAccent }]}>
            <Icon icon={Timer} size={16} color="accent" />
            <Text variant="caption" color="accent" tabular>
              {formatDuration(restCountdown.remaining)}
            </Text>
          </View>
        ) : null}
        <Icon icon={ChevronUp} size={20} color="onAccent" />
      </FastPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.workoutBarHeight,
    paddingHorizontal: spacing.lg,
  },
  liveMark: { width: 8, height: 8, borderRadius: 2 },
  textColumn: { flex: 1 },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    height: 32,
    borderRadius: radius.sm,
  },
});
