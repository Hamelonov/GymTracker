import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Totals } from '@/db/repo/workouts';
import { formatDuration } from '@/domain/units';
import { Stat, spacing } from '@/ui';
import type { WeekStreak } from './weekStreak';

interface StatsSummaryTilesProps {
  totals: Totals;
  streak: WeekStreak;
}

/** Числа периода без плиток: тренировки, время, подходы и недельные серии, по три в ряд. */
export function StatsSummaryTiles({ totals, streak }: StatsSummaryTilesProps) {
  const { t: translate } = useTranslation();
  const weeksLabel = translate('stats.weeks');
  return (
    <View style={styles.grid}>
      <Stat
        size="regular"
        style={styles.cell}
        label={translate('stats.workouts')}
        value={String(totals.workouts)}
      />
      <Stat
        size="regular"
        style={styles.cell}
        label={translate('stats.time')}
        value={formatDuration(totals.durationSec, { compact: true })}
      />
      <Stat size="regular" style={styles.cell} label={translate('stats.sets')} value={String(totals.sets)} />
      <Stat
        size="regular"
        style={styles.cell}
        label={translate('stats.currentStreak')}
        value={`${streak.current} ${weeksLabel}`}
      />
      <Stat
        size="regular"
        style={styles.cell}
        label={translate('stats.bestStreak')}
        value={`${streak.best} ${weeksLabel}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg, marginTop: spacing.lg },
  // Три в ряд: во второй строке остаются два числа, левые.
  cell: { width: '33.33%' },
});
