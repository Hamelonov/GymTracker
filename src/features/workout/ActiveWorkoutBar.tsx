import { ChevronUp, Timer, Trash2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { formatDuration } from '@/domain/units';
import { push } from '@/lib/nav';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { Icon, Pressable, Text, confirm, radius, spacing, useColors } from '@/ui';
import { useElapsedSeconds, useRestCountdown } from './timers';
import { WorkoutName } from './WorkoutName';

const ROUND_BUTTON_SIZE = 44;

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
      hasExercises={workout.exercises.length > 0}
      completedSetCount={completedSetCount}
    />
  );
}

// Отдельный компонент, чтобы хуки таймера тикали только пока «таблетка» показана.
function MinimizedWorkoutPill({
  bottom,
  name,
  startedAt,
  hasExercises,
  completedSetCount,
}: {
  bottom: number;
  name: string;
  startedAt: number;
  hasExercises: boolean;
  completedSetCount: number;
}) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const elapsedSeconds = useElapsedSeconds(startedAt);
  const restCountdown = useRestCountdown();

  const subtitle = hasExercises
    ? `${completedSetCount} ${translate('common.sets')}`
    : translate('workout.noExercises');

  const discardWorkout = async () => {
    const isConfirmed = await confirm({
      title: translate('workout.discardCurrentConfirm'),
      destructive: true,
      confirmLabel: translate('workout.discard'),
    });
    if (!isConfirmed) return;
    useRestTimer.getState().skip();
    useActiveWorkout.getState().clear();
  };

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
        style={[styles.pill, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      >
        <View style={[styles.roundButton, { backgroundColor: colors.surfaceAlt }]}>
          <Icon icon={ChevronUp} size={24} />
        </View>
        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <WorkoutName
              variant="h3"
              numberOfLines={1}
              style={styles.workoutName}
              name={name || translate('workout.defaultName')}
            />
            <Text variant="body" tabular>
              {formatDuration(elapsedSeconds, { compact: true })}
            </Text>
          </View>
          <Text variant="body" color="muted" numberOfLines={1}>
            {subtitle}
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
        <Pressable
          onPress={() => void discardWorkout()}
          hitSlop={8}
          haptic="light"
          style={[styles.roundButton, { backgroundColor: colors.dangerSoft }]}
        >
          <Icon icon={Trash2} size={22} color="danger" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: spacing.md, right: spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    // Тень отделяет плавающую карточку от содержимого вкладки под ней.
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  roundButton: {
    width: ROUND_BUTTON_SIZE,
    height: ROUND_BUTTON_SIZE,
    borderRadius: ROUND_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  workoutName: { flexShrink: 1 },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  restBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    height: 26,
    borderRadius: radius.pill,
  },
});
