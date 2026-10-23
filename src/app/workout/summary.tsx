import { router } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exerciseName } from '@/db/repo/exercises';
import { getWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { setFieldsFor, type PrType } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';
import { useLastSave } from '@/store/lastSave';
import { useSettings } from '@/store/settings';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { Button, Card, Icon, Text, spacing, useColors } from '@/ui';

export default function SummaryScreen() {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const result = useLastSave((s) => s.result);
  const settings = useSettings();
  const detail = useQuery(() => (result ? getWorkout(result.workoutId) : undefined), [result?.workoutId]);
  const units = { weight: settings.weightUnit, distance: settings.distanceUnit } as const;

  // One row per exercise that set a record: its main value and how many working sets were done.
  const recordRows = useMemo(() => {
    if (!result || !detail) return [];
    const withPr = new Set(result.prs.map((p) => p.exerciseId));
    return detail.exercises
      .filter((e) => withPr.has(e.exerciseId))
      .map((e) => {
        const working = e.sets.filter((s) => s.type !== 'warmup');
        const fields = setFieldsFor(e.exercise.type);
        const max = (pick: (s: (typeof working)[number]) => number | null) =>
          working.reduce<number | null>((m, s) => {
            const v = pick(s);
            return v != null && (m == null || v > m) ? v : m;
          }, null);
        // Old record before this workout: the "previous" of the first hit of that type.
        const hitsOf = (type: PrType) => result.prs.filter((p) => p.exerciseId === e.exerciseId).flatMap((p) => p.hits.filter((h) => h.type === type));
        const gain = (type: PrType, fmt: (v: number) => string): { before: string | null; delta: string | null; first: boolean } => {
          const hits = hitsOf(type);
          if (hits.length === 0) return { before: null, delta: null, first: false };
          const best = Math.max(...hits.map((h) => h.value));
          const prev = hits[0]?.previous ?? null;
          if (prev == null) return { before: null, delta: null, first: true };
          const d = best - prev;
          return d > 0 ? { before: fmt(prev), delta: `+${fmt(d)}`, first: false } : { before: null, delta: null, first: false };
        };
        let main: { label: string; value: string; before: string | null; delta: string | null; first: boolean };
        if (fields.weight) main = { label: t('pr.weight'), value: formatWeight(max((s) => s.weightKg), units.weight), ...gain('weight', (d) => formatWeight(d, units.weight)) };
        else if (fields.distance) main = { label: t('pr.distance'), value: formatDistance(max((s) => s.distanceM), units.distance), ...gain('distance', (d) => formatDistance(d, units.distance)) };
        else if (fields.duration) main = { label: t('pr.duration'), value: formatDuration(max((s) => s.durationSec)), ...gain('duration', (d) => formatDuration(d)) };
        else main = { label: t('workout.reps'), value: String(max((s) => s.reps) ?? '—'), ...gain('reps', (d) => String(Math.round(d))) };
        return { id: e.id, name: exerciseName(e.exercise, i18n.language), main, sets: working.length };
      });
  }, [result, detail, t, i18n.language, units.weight, units.distance]);

  const done = () => {
    useLastSave.getState().set(null);
    if (result) router.replace({ pathname: '/workout/[id]', params: { id: result.workoutId } });
    else router.replace('/');
  };

  if (!result) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <Button title={t('common.close')} variant="ghost" onPress={done} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.accent }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + 120, paddingHorizontal: spacing.lg }}>
        <Animated.View entering={FadeInUp.duration(160)}>
          <Text variant="display" color="onAccent">
            {t('workout.summaryTitle')}
          </Text>
          <Text variant="body" color="onAccent" style={{ marginTop: spacing.sm, opacity: 0.75 }}>
            {t('workout.summarySubtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(160)} style={{ marginTop: spacing.xxl }}>
          <WorkoutStats variant="inverse" durationSec={result.durationSec} exerciseCount={result.exerciseCount} setCount={result.setCount} prCount={result.prs.reduce((a, p) => a + p.hits.length, 0)} />
        </Animated.View>

        {result.prs.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(80).duration(160)} style={{ marginTop: spacing.xl }}>
            <View style={styles.prHeader}>
              <Icon icon={Trophy} size={18} color="onAccent" />
              <Text variant="h3" color="onAccent">
                {t('workout.newRecords')}
              </Text>
            </View>
            <Card raised style={{ backgroundColor: c.white, borderColor: 'transparent' }}>
              {recordRows.map((r, i) => (
                <View key={r.id} style={[styles.prRow, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E6E6E2' } : null]}>
                  <Text variant="bodyMedium" color={c.black}>
                    {r.name}
                  </Text>
                  <View style={styles.prValues}>
                    <View style={styles.prCell}>
                      <Text variant="label" color="#6A6A66">
                        {r.main.label.toUpperCase()}
                      </Text>
                      <Text variant="h3" color={c.black} tabular numberOfLines={1}>
                        {r.main.value}
                      </Text>
                      {r.main.before && r.main.delta ? (
                        <Text variant="caption" color="#6A6A66" tabular numberOfLines={1}>
                          {r.main.before}{'  '}
                          <Text variant="caption" color={c.success} tabular>
                            {r.main.delta}
                          </Text>
                        </Text>
                      ) : r.main.first ? (
                        <Text variant="caption" color={c.success} numberOfLines={1}>
                          {t('workout.firstTime')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.prCell}>
                      <Text variant="label" color="#6A6A66">
                        {t('workout.setsDone').toUpperCase()}
                      </Text>
                      <Text variant="h3" color={c.black} tabular>
                        {r.sets}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button title={t('common.done')} size="lg" full variant="secondary" onPress={done} style={{ backgroundColor: c.black }} textColor={c.accent} haptic="light" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  prRow: { gap: spacing.sm, paddingVertical: spacing.md },
  prValues: { flexDirection: 'row' },
  prCell: { width: '50%', gap: 2 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
