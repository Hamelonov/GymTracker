import { addDays, subMonths } from 'date-fns';
import { push } from '@/lib/nav';
import { Trophy } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import { allRecordsRanked, listWorkouts, muscleSplit, topExercises, totals, weeklySeries } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatShortDate, weekKey, weekStart } from '@/domain/dates';
import { MUSCLE_GROUPS } from '@/domain/types';
import { formatDuration, formatWeight, kgToUnit } from '@/domain/units';
import { ChartEmpty, LineChart } from '@/features/charts/LineChart';
import { useSettings } from '@/store/settings';
import { useNow } from '@/lib/useNow';
import { Card, Chip, Icon, ListItem, Pressable, Screen, SectionTitle, Segmented, Text, radius, spacing, useColors } from '@/ui';

type Period = '3m' | '6m' | '1y' | 'all';
type Metric = 'workouts' | 'volume' | 'duration' | 'sets';

function weekStreakFrom(starts: number[], now: number): { current: number; best: number } {
  const weeks = [...new Set(starts.map((ts) => weekStart(ts).getTime()))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const w of weeks) {
    run = prev != null && w - prev === 7 * 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = w;
  }
  const set = new Set(weeks);
  let cursor = weekStart(now).getTime();
  let current = 0;
  if (!set.has(cursor)) cursor -= 7 * 86400000;
  while (set.has(cursor)) {
    current += 1;
    cursor -= 7 * 86400000;
  }
  return { current, best };
}

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const unit = useSettings((s) => s.weightUnit);
  const now = useNow();
  const [period, setPeriod] = useState<Period>('3m');
  const [metric, setMetric] = useState<Metric>('workouts');
  const from = useMemo(() => (period === 'all' ? 0 : subMonths(now, period === '3m' ? 3 : period === '6m' ? 6 : 12).getTime()), [period, now]);
  const tot = useQuery(() => totals(from || undefined), [from]);
  const series = useQuery(() => weeklySeries(from), [from]);
  const split = useQuery(() => muscleSplit(from), [from]);
  const top = useQuery(() => topExercises(from), [from]);
  const records = useQuery(() => allRecordsRanked(8), []);
  const all = useQuery(() => listWorkouts(), []);
  const streak = useMemo(() => weekStreakFrom(all.map((w) => w.startedAt), now), [all, now]);

  const weekly = useMemo(() => {
    if (series.length === 0) return [];
    const byWeek = new Map<string, { ws: number; workouts: number; volume: number; duration: number; sets: number }>();
    const first = weekStart(from || series[0]!.startedAt);
    const last = weekStart(now);
    for (let d = first; d <= last; d = addDays(d, 7)) byWeek.set(weekKey(d), { ws: d.getTime(), workouts: 0, volume: 0, duration: 0, sets: 0 });
    for (const w of series) {
      const k = weekKey(w.startedAt);
      const b = byWeek.get(k);
      if (!b) continue;
      b.workouts += 1;
      b.volume += w.volumeKg;
      b.duration += w.durationSec;
      b.sets += w.setCount;
    }
    const arr = [...byWeek.values()].slice(-26);
    return arr.map((b, i) => ({
      x: i,
      y: metric === 'workouts' ? b.workouts : metric === 'volume' ? Math.round(kgToUnit(b.volume, unit)) : metric === 'duration' ? Math.round(b.duration / 60) : b.sets,
      label: i % Math.max(1, Math.ceil(arr.length / 6)) === 0 ? formatShortDate(b.ws, i18n.language) : '',
    }));
  }, [series, metric, unit, from, i18n.language, now]);

  const splitTotal = [...split.values()].reduce((a, b) => a + b, 0);
  const splitRows = MUSCLE_GROUPS.map((m) => ({ m, n: split.get(m) ?? 0 })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);

  return (
    <Screen header={{ back: true, title: t('stats.title') }}>
      <Segmented
        options={[
          { value: '3m', label: t('stats.period3m') },
          { value: '6m', label: t('stats.period6m') },
          { value: '1y', label: t('stats.period1y') },
          { value: 'all', label: t('stats.periodAll') },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <View style={styles.tiles}>
        <Tile label={t('stats.workouts')} value={String(tot.workouts)} />
        <Tile label={t('stats.volume')} value={formatWeight(Math.round(tot.volumeKg), unit)} />
        <Tile label={t('stats.time')} value={formatDuration(tot.durationSec, { compact: true })} />
        <Tile label={t('stats.sets')} value={String(tot.sets)} />
        <Tile label={t('stats.currentStreak')} value={`${streak.current} ${t('stats.weeks')}`} />
        <Tile label={t('stats.bestStreak')} value={`${streak.best} ${t('stats.weeks')}`} />
      </View>

      <SectionTitle title={t('stats.weekly')} />
      <View style={[styles.chips, { marginBottom: spacing.md }]}>
        {(['workouts', 'volume', 'duration', 'sets'] as Metric[]).map((m) => (
          <Chip key={m} label={m === 'duration' ? `${t('stats.time')} (${t('common.min')})` : t(`stats.${m}`)} selected={metric === m} onPress={() => setMetric(m)} small />
        ))}
      </View>
      {weekly.length === 0 ? <ChartEmpty text={t('stats.noData')} /> : <LineChart data={weekly} kind="bar" height={200} />}

      <SectionTitle title={t('stats.muscleSplit')} />
      <Card>
        {splitRows.length === 0 ? (
          <Text color="faint">{t('stats.noData')}</Text>
        ) : (
          splitRows.map((r) => (
            <View key={r.m} style={styles.splitRow}>
              <Text variant="caption" style={{ width: 110 }} numberOfLines={1}>
                {t(`muscles.${r.m}`)}
              </Text>
              <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
                <View style={[styles.fill, { backgroundColor: c.accent, width: `${Math.max(3, (r.n / splitTotal) * 100)}%` }]} />
              </View>
              <Text variant="caption" color="muted" tabular style={{ width: 36, textAlign: 'right' }}>
                {r.n}
              </Text>
            </View>
          ))
        )}
        <Text variant="caption" color="faint" style={{ marginTop: spacing.sm }}>
          {t('stats.muscleSplitHint')}
        </Text>
      </Card>

      <SectionTitle title={t('stats.topExercises')} />
      <Card padded={false}>
        {top.length === 0 ? (
          <Text color="faint" style={{ padding: spacing.lg }}>
            {t('stats.noData')}
          </Text>
        ) : (
          top.map((e) => (
            <ListItem key={e.exerciseId} title={exerciseName(e, i18n.language)} right={<Text variant="caption" color="muted">{e.count}×</Text>} chevron onPress={() => push({ pathname: '/exercise/[id]', params: { id: e.exerciseId } })} style={{ paddingHorizontal: spacing.lg }} />
          ))
        )}
      </Card>

      <SectionTitle title={t('stats.recordsTitle')} />
      <Card padded={false}>
        {records.length === 0 ? (
          <Text color="faint" style={{ padding: spacing.lg }}>
            {t('stats.noData')}
          </Text>
        ) : (
          records.map((r) => (
            <Pressable key={r.exerciseId} onPress={() => push({ pathname: '/exercise/[id]', params: { id: r.exerciseId } })} style={styles.recordRow}>
              <Icon icon={Trophy} size={16} color="accent" />
              <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                {exerciseName(r, i18n.language)}
              </Text>
              <Text variant="bodyMedium" tabular>
                {formatWeight(Math.round(r.value * 10) / 10, unit)}
              </Text>
              <Text variant="label" color="faint">
                {t('pr.one_rm')}
              </Text>
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: c.surface }]}>
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
  tile: { width: '31%', flexGrow: 1, padding: spacing.md, borderRadius: radius.md, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  track: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
