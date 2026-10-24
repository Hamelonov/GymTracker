import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Totals } from '@/db/repo/workouts';
import { formatDuration } from '@/domain/units';
import { Text, radius, spacing, useColors } from '@/ui';
import type { WeekStreak } from './weekStreak';

interface StatsSummaryTilesProps {
  totals: Totals;
  streak: WeekStreak;
}

/** Сетка небольших плиток с числами: тренировки, время, подходы и недельные серии. */
export function StatsSummaryTiles({ totals, streak }: StatsSummaryTilesProps) {
  const { t: translate } = useTranslation();
  const weeksLabel = translate('stats.weeks');
  return (
    <View style={styles.tiles}>
      <SummaryTile label={translate('stats.workouts')} value={String(totals.workouts)} />
      <SummaryTile
        label={translate('stats.time')}
        value={formatDuration(totals.durationSec, { compact: true })}
      />
      <SummaryTile label={translate('stats.sets')} value={String(totals.sets)} />
      <SummaryTile label={translate('stats.currentStreak')} value={`${streak.current} ${weeksLabel}`} />
      <SummaryTile label={translate('stats.bestStreak')} value={`${streak.best} ${weeksLabel}`} />
    </View>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface }]}>
      <Text variant="label" color="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="h3" tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  // Три плитки в ряд; flexGrow заполняет промежутки между ними.
  tile: { width: '31%', flexGrow: 1, padding: spacing.md, borderRadius: radius.md, gap: 4 },
});
