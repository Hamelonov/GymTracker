import { ChevronUp, Timer } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { formatDuration } from '@/domain/units';
import { push } from '@/lib/nav';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';

export function useElapsed(startedAt: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt == null) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function useRestRemaining(): { remaining: number; total: number; running: boolean } {
  const endsAt = useRestTimer((s) => s.endsAt);
  const total = useRestTimer((s) => s.totalSec);
  const finish = useRestTimer((s) => s.finish);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt == null) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  const remaining = endsAt == null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    if (endsAt != null && now >= endsAt) finish();
  }, [now, endsAt, finish]);
  return { remaining, total, running: endsAt != null };
}

/**
 * Floating pill shown above the tab bar while a workout is in progress and
 * its screen is not open (the active screen toggles `minimized` on blur/focus).
 */
export function ActiveWorkoutBar({ bottom }: { bottom: number }) {
  const workout = useActiveWorkout((s) => s.workout);
  const session = useActiveWorkout((s) => s.session);
  const minimized = useActiveWorkout((s) => s.minimized);
  if (!workout || !minimized || session.mode === 'edit') return null;
  const done = workout.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  return <Bar bottom={bottom} name={workout.name} startedAt={workout.startedAt} done={done} />;
}

function Bar({ bottom, name, startedAt, done }: { bottom: number; name: string; startedAt: number; done: number }) {
  const c = useColors();
  const { t } = useTranslation();
  const elapsed = useElapsed(startedAt);
  const rest = useRestRemaining();
  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutDown.duration(140)} style={[styles.wrap, { bottom: bottom + spacing.sm }]} pointerEvents="box-none">
      <Pressable onPress={() => push('/workout/active')} haptic="light" style={[styles.bar, { backgroundColor: c.text }]}>
        <View style={[styles.dot, { backgroundColor: c.accent }]} />
        <View style={styles.body}>
          <Text variant="caption" color={c.bg} numberOfLines={1}>
            {name || t('workout.defaultName')}
          </Text>
          <Text variant="label" color={c.textFaint}>
            {formatDuration(elapsed)} · {done} {t('common.sets')}
          </Text>
        </View>
        {rest.running ? (
          <View style={[styles.rest, { backgroundColor: c.accent }]}>
            <Icon icon={Timer} size={14} color="onAccent" />
            <Text variant="caption" color="onAccent" tabular>
              {formatDuration(rest.remaining)}
            </Text>
          </View>
        ) : null}
        <Icon icon={ChevronUp} size={18} color={c.bg} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  body: { flex: 1 },
  rest: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, height: 26, borderRadius: radius.pill },
});
