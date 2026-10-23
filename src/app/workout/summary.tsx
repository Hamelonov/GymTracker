import { router } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { exerciseName, getExercisesByIds } from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import type { PrType } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';
import { useLastSave } from '@/store/lastSave';
import { useSettings } from '@/store/settings';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { Button, Card, Icon, Text, spacing, useColors } from '@/ui';

export function formatPrValue(type: PrType, value: number, units: { weight: 'kg' | 'lb'; distance: 'km' | 'mi' }): string {
  switch (type) {
    case 'one_rm':
      return formatWeight(Math.round(value * 10) / 10, units.weight);
    case 'weight':
    case 'volume':
      return formatWeight(value, units.weight);
    case 'reps':
      return String(Math.round(value));
    case 'duration':
      return formatDuration(value);
    case 'distance':
      return formatDistance(value, units.distance);
  }
}

export default function SummaryScreen() {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const result = useLastSave((s) => s.result);
  const settings = useSettings();
  const exIds = result?.prs.map((p) => p.exerciseId) ?? [];
  const exMap = useQuery(() => getExercisesByIds(exIds), [exIds.join(',')]);
  const units = { weight: settings.weightUnit, distance: settings.distanceUnit } as const;

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
              {result.prs.map((p, i) => {
                const ex = exMap.get(p.exerciseId);
                return (
                  <View key={`${p.exerciseId}-${p.setIndex}`} style={[styles.prRow, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E6E6E2' } : null]}>
                    <Text variant="bodyMedium" color={c.black} numberOfLines={1} style={{ flex: 1 }}>
                      {ex ? exerciseName(ex, i18n.language) : '…'}
                    </Text>
                    <View style={styles.prValues}>
                      {p.hits.map((h) => (
                        <View key={h.type} style={styles.prPill}>
                          <Text variant="label" color={c.black}>
                            {t(`pr.${h.type}`).toUpperCase()}
                          </Text>
                          <Text variant="bodyMedium" color={c.black} tabular>
                            {formatPrValue(h.type, h.value, units)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
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
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  prValues: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'flex-end' },
  prPill: { alignItems: 'flex-end' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
