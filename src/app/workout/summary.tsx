import { router } from 'expo-router';
import { ListChecks, Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exerciseName } from '@/db/repo/exercises';
import { getWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatSetsLine, pickRecordMetric, recordGain, type RecordMetric } from '@/domain/summary';
import { setFieldsFor } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { useLastSave } from '@/store/lastSave';
import { useSettings } from '@/store/settings';
import { Button, Card, Icon, Text, spacing, useColors } from '@/ui';

const MUTED = '#6A6A66';
const DIVIDER = '#E6E6E2';

export default function SummaryScreen() {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const result = useLastSave((s) => s.result);
  const settings = useSettings();
  const detail = useQuery(() => (result ? getWorkout(result.workoutId) : undefined), [result?.workoutId]);
  const weightUnit = settings.weightUnit;
  const distanceUnit = settings.distanceUnit;

  const fmt = useMemo(
    () => ({
      weight: (kg: number) => formatWeight(kg, weightUnit),
      duration: (sec: number) => formatDuration(sec),
      distance: (m: number) => formatDistance(m, distanceUnit),
    }),
    [weightUnit, distanceUnit],
  );

  // One row per exercise that set a record: the value that moved, the old record and the gain.
  const recordRows = useMemo(() => {
    if (!result || !detail) return [];
    return detail.exercises
      .map((e) => {
        const hits = result.prs.filter((p) => p.exerciseId === e.exerciseId).flatMap((p) => p.hits);
        if (hits.length === 0) return null;
        const working = e.sets.filter((s) => s.type !== 'warmup');
        const metric = pickRecordMetric(setFieldsFor(e.exercise.type), hits);
        const pick = (s: (typeof working)[number]): number | null =>
          metric === 'weight' ? s.weightKg : metric === 'reps' ? s.reps : metric === 'duration' ? s.durationSec : s.distanceM;
        const bestInWorkout = working.reduce<number | null>((m, s) => {
          const v = pick(s);
          return v != null && (m == null || v > m) ? v : m;
        }, null);
        const show = (v: number | null, m: RecordMetric) =>
          v == null ? '—' : m === 'weight' ? fmt.weight(v) : m === 'duration' ? fmt.duration(v) : m === 'distance' ? fmt.distance(v) : String(Math.round(v));
        const gain = recordGain(hits, metric);
        const label = metric === 'weight' ? t('pr.weight') : metric === 'reps' ? t('workout.reps') : metric === 'duration' ? t('pr.duration') : t('pr.distance');
        return {
          id: e.id,
          name: exerciseName(e.exercise, i18n.language),
          label,
          value: show(gain?.best ?? bestInWorkout, metric),
          before: gain && gain.previous != null && gain.best > gain.previous ? show(gain.previous, metric) : null,
          delta: gain && gain.previous != null && gain.best > gain.previous ? `+${show(gain.best - gain.previous, metric)}` : null,
          first: gain != null && gain.previous == null,
          sets: working.length,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);
  }, [result, detail, fmt, t, i18n.language]);

  // Everything done today: "Bench press — 80 kg × 8/7/6".
  const todayRows = useMemo(
    () =>
      (detail?.exercises ?? []).map((e) => ({
        id: e.id,
        name: exerciseName(e.exercise, i18n.language),
        line: formatSetsLine(e.sets, setFieldsFor(e.exercise.type), fmt),
      })),
    [detail, fmt, i18n.language],
  );

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

        {recordRows.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(80).duration(160)} style={{ marginTop: spacing.xl }}>
            <View style={styles.blockHeader}>
              <Icon icon={Trophy} size={18} color="onAccent" />
              <Text variant="h3" color="onAccent">
                {t('workout.newRecords')}
              </Text>
            </View>
            <Card raised style={{ backgroundColor: c.white, borderColor: 'transparent' }}>
              {recordRows.map((r, i) => (
                <View key={r.id} style={[styles.row, i > 0 ? styles.divider : null]}>
                  <Text variant="bodyMedium" color={c.black}>
                    {r.name}
                  </Text>
                  <View style={styles.cells}>
                    <View style={styles.cell}>
                      <Text variant="label" color={MUTED}>
                        {r.label.toUpperCase()}
                      </Text>
                      <Text variant="h3" color={c.black} tabular numberOfLines={1}>
                        {r.value}
                      </Text>
                      {r.before && r.delta ? (
                        <Text variant="caption" color={MUTED} tabular numberOfLines={1}>
                          {r.before}
                          {'  '}
                          <Text variant="caption" color={c.success} tabular>
                            {r.delta}
                          </Text>
                        </Text>
                      ) : r.first ? (
                        <Text variant="caption" color={c.success} numberOfLines={1}>
                          {t('workout.firstTime')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.cell}>
                      <Text variant="label" color={MUTED}>
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

        {todayRows.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(120).duration(160)} style={{ marginTop: spacing.xl }}>
            <View style={styles.blockHeader}>
              <Icon icon={ListChecks} size={18} color="onAccent" />
              <Text variant="h3" color="onAccent">
                {t('workout.todayDone')}
              </Text>
            </View>
            <Card raised style={{ backgroundColor: c.white, borderColor: 'transparent' }}>
              {todayRows.map((r, i) => (
                <View key={r.id} style={[styles.row, i > 0 ? styles.divider : null]}>
                  <Text variant="bodyMedium" color={c.black}>
                    {r.name}
                  </Text>
                  <Text variant="h3" color={c.black} tabular>
                    {r.line}
                  </Text>
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
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  row: { gap: spacing.xs, paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: DIVIDER },
  cells: { flexDirection: 'row', marginTop: spacing.xs },
  cell: { width: '50%', gap: 2 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
