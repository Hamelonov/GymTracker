import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { Card, SectionTitle, Text, spacing, useColors } from '@/ui';

/** Smallest bar width in percent, so a muscle with very few sets still shows a visible bar. */
const MIN_BAR_PERCENT = 3;

/** "Muscle split" section: working sets per muscle group as horizontal bars, biggest first. */
export function MuscleSplitCard({ setsByMuscle }: { setsByMuscle: Map<MuscleGroup, number> }) {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const totalSets = [...setsByMuscle.values()].reduce((sum, setCount) => sum + setCount, 0);
  const muscleRows = MUSCLE_GROUPS.map((muscle) => ({ muscle, setCount: setsByMuscle.get(muscle) ?? 0 }))
    .filter((row) => row.setCount > 0)
    .sort((first, second) => second.setCount - first.setCount);

  return (
    <>
      <SectionTitle title={translate('stats.muscleSplit')} />
      <Card>
        {muscleRows.length === 0 ? (
          <Text color="faint">{translate('stats.noData')}</Text>
        ) : (
          muscleRows.map((row) => {
            const barPercent = Math.max(MIN_BAR_PERCENT, (row.setCount / totalSets) * 100);
            return (
              <View key={row.muscle} style={styles.muscleRow}>
                <Text variant="caption" style={styles.muscleName} numberOfLines={1}>
                  {translate(`muscles.${row.muscle}`)}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[styles.barFill, { backgroundColor: colors.accent, width: `${barPercent}%` }]}
                  />
                </View>
                <Text variant="caption" color="muted" tabular style={styles.setCount}>
                  {row.setCount}
                </Text>
              </View>
            );
          })
        )}
        <Text variant="caption" color="faint" style={styles.hint}>
          {translate('stats.muscleSplitHint')}
        </Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  muscleName: { width: 110 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  setCount: { width: 36, textAlign: 'right' },
  hint: { marginTop: spacing.sm },
});
