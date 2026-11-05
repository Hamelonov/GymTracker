import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { SectionTitle, Text, radius, spacing, useColors } from '@/ui';

/** Минимальная ширина полосы в процентах, чтобы у мышцы с очень малым числом подходов всё равно была заметная полоса. */
const MIN_BAR_PERCENT = 3;
const MUSCLE_ROW_HEIGHT = 28;
const BAR_HEIGHT = 8;

/** Раздел «Распределение по мышцам»: рабочие подходы по группам мышц в виде горизонтальных полос, от большего к меньшему. */
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
      {muscleRows.length === 0 ? (
        <Text color="muted">{translate('stats.noData')}</Text>
      ) : (
        muscleRows.map((row) => {
          const barPercent = Math.max(MIN_BAR_PERCENT, (row.setCount / totalSets) * 100);
          return (
            <View key={row.muscle} style={styles.muscleRow}>
              <Text variant="caption" style={styles.muscleName} numberOfLines={1}>
                {translate(`muscles.${row.muscle}`)}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                <View style={[styles.barFill, { backgroundColor: colors.text, width: `${barPercent}%` }]} />
              </View>
              <Text variant="caption" tabular style={styles.setCount}>
                {row.setCount}
              </Text>
            </View>
          );
        })
      )}
      <Text variant="caption" color="muted" style={styles.hint}>
        {translate('stats.muscleSplitHint')}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: MUSCLE_ROW_HEIGHT },
  muscleName: { width: 110 },
  barTrack: { flex: 1, height: BAR_HEIGHT, borderRadius: radius.xs, overflow: 'hidden' },
  barFill: { height: BAR_HEIGHT, borderRadius: radius.xs },
  setCount: { width: 36, textAlign: 'right' },
  hint: { marginTop: spacing.sm },
});
