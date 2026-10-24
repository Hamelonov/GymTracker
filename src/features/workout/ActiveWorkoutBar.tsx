import { ChevronUp, Timer } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { formatDuration } from '@/domain/units';
import { push } from '@/lib/nav';
import { useActiveWorkout } from '@/store/activeWorkout';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { useElapsedSeconds, useRestCountdown } from './timers';

/**
 * Плавающая «таблетка» над панелью вкладок, пока идёт тренировка и
 * её экран не открыт (экран тренировки переключает `minimized` при потере/получении фокуса).
 */
export function ActiveWorkoutBar({ bottom }: { bottom: number }) {
  const workout = useActiveWorkout((state) => state.workout);
  const session = useActiveWorkout((state) => state.session);
  const minimized = useActiveWorkout((state) => state.minimized);
  if (!workout || !minimized || session.mode === 'edit') return null;
  const completedSetCount = workout.exercises.reduce(
    (count, exercise) => count + exercise.sets.filter((set) => set.completed).length,
    0,
  );
  return (
    <MinimizedWorkoutPill
      bottom={bottom}
      name={workout.name}
      startedAt={workout.startedAt}
      completedSetCount={completedSetCount}
    />
  );
}

// Отдельный компонент, чтобы хуки таймера тикали только пока «таблетка» показана.
function MinimizedWorkoutPill({
  bottom,
  name,
  startedAt,
  completedSetCount,
}: {
  bottom: number;
  name: string;
  startedAt: number;
  completedSetCount: number;
}) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const elapsedSeconds = useElapsedSeconds(startedAt);
  const restCountdown = useRestCountdown();
  return (
    <Animated.View
      entering={FadeInDown.duration(120)}
      exiting={FadeOutDown.duration(100)}
      style={[styles.wrapper, { bottom: bottom + spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => push('/workout/active')}
        haptic="light"
        style={[styles.pill, { backgroundColor: colors.text }]}
      >
        <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
        <View style={styles.textColumn}>
          <Text variant="caption" color={colors.background} numberOfLines={1}>
            {name || translate('workout.defaultName')}
          </Text>
          <Text variant="label" color={colors.textFaint}>
            {formatDuration(elapsedSeconds)} · {completedSetCount} {translate('common.sets')}
          </Text>
        </View>
        {restCountdown.running ? (
          <View style={[styles.restBadge, { backgroundColor: colors.accent }]}>
            <Icon icon={Timer} size={14} color="onAccent" />
            <Text variant="caption" color="onAccent" tabular>
              {formatDuration(restCountdown.remaining)}
            </Text>
          </View>
        ) : null}
        <Icon icon={ChevronUp} size={18} color={colors.background} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  textColumn: { flex: 1 },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    height: 26,
    borderRadius: radius.pill,
  },
});
