import { router, useLocalSearchParams } from 'expo-router';
import { Archive, ArchiveRestore, Ellipsis, Pencil, Trash2, Trophy } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { deleteExercise, exerciseDescription, exerciseHistory, exerciseName, getExercise, getRecordDetails, setExerciseArchived } from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import { formatRelativeDay, formatShortDate } from '@/domain/dates';
import { estimateOneRm } from '@/domain/oneRm';
import { prTypesFor } from '@/domain/records';
import { setFieldsFor, type PrType } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight, kgToUnit, metersToUnit, roundDisplay } from '@/domain/units';
import { ChartEmpty, LineChart } from '@/features/charts/LineChart';
import { formatSetValues } from '@/features/workout/format';
import { useSettings } from '@/store/settings';
import { Button, Card, Chip, EmptyState, Icon, IconButton, ListItem, Pressable, Screen, SectionTitle, Segmented, Sheet, Text, confirm, radius, spacing, useColors } from '@/ui';

type Tab = 'about' | 'history' | 'charts' | 'records';
type Metric = 'weight' | 'one_rm' | 'volume' | 'reps' | 'duration' | 'distance';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>('about');
  const [menu, setMenu] = useState(false);
  const ex = useQuery(() => (id ? getExercise(id) : undefined), [id]);
  const history = useQuery(() => (id ? exerciseHistory(id) : []), [id]);
  const records = useQuery(() => (id ? getRecordDetails(id) : []), [id]);
  const metrics = useMemo<Metric[]>(() => (ex ? (prTypesFor(ex.type) as Metric[]) : []), [ex]);
  const [metric, setMetric] = useState<Metric | null>(null);
  const activeMetric = metric && metrics.includes(metric) ? metric : (metrics[0] ?? 'weight');
  const units = useMemo(() => ({ weight: settings.weightUnit, distance: settings.distanceUnit }), [settings.weightUnit, settings.distanceUnit]);

  const chartData = useMemo(() => {
    const asc = [...history].reverse();
    const pts: { x: number; y: number; label: string }[] = [];
    asc.forEach((h, i) => {
      const working = h.sets.filter((s) => s.type !== 'warmup');
      let v: number | null = null;
      for (const s of working) {
        let m: number | null = null;
        if (activeMetric === 'weight') m = s.weightKg != null ? kgToUnit(s.weightKg, units.weight) : null;
        else if (activeMetric === 'one_rm') m = s.weightKg != null && s.reps ? kgToUnit(estimateOneRm(s.weightKg, s.reps), units.weight) : null;
        else if (activeMetric === 'volume') m = s.weightKg != null && s.reps != null ? kgToUnit(s.weightKg * s.reps, units.weight) : null;
        else if (activeMetric === 'reps') m = s.reps;
        else if (activeMetric === 'duration') m = s.durationSec;
        else if (activeMetric === 'distance') m = s.distanceM != null ? metersToUnit(s.distanceM, units.distance) : null;
        if (m != null) v = activeMetric === 'volume' ? (v ?? 0) + m : Math.max(v ?? -Infinity, m);
      }
      if (v != null && Number.isFinite(v)) pts.push({ x: i, y: roundDisplay(v, 1), label: formatShortDate(h.startedAt, i18n.language) });
    });
    return pts;
  }, [history, activeMetric, units, i18n.language]);

  if (!ex) return <Screen header={{ back: true }} />;
  const name = exerciseName(ex, i18n.language);
  const description = exerciseDescription(ex, i18n.language);
  const fields = setFieldsFor(ex.type);

  const formatRecord = (type: PrType, value: number) => {
    if (type === 'reps') return String(Math.round(value));
    if (type === 'duration') return formatDuration(value);
    if (type === 'distance') return formatDistance(value, units.distance);
    return formatWeight(type === 'one_rm' ? Math.round(value * 10) / 10 : value, units.weight);
  };
  const metricLabel = (m: Metric) =>
    m === 'weight' ? t('exercise.chartHeaviest') : m === 'one_rm' ? t('exercise.chartOneRm') : m === 'volume' ? t('exercise.chartVolume') : m === 'reps' ? t('exercise.chartReps') : m === 'duration' ? t('exercise.chartDuration') : t('exercise.chartDistance');

  return (
    <Screen
      header={{
        back: true,
        title: name,
        subtitle: `${t(`muscles.${ex.muscleGroup}`)} · ${t(`equipment.${ex.equipment}`)}`,
        right: <IconButton icon={Ellipsis} variant="filled" onPress={() => setMenu(true)} haptic="selection" />,
      }}
      stickyHeaderIndices={[0]}
    >
      <View style={{ backgroundColor: c.bg, paddingBottom: spacing.md }}>
        <Segmented
          options={[
            { value: 'about', label: t('exercise.about') },
            { value: 'history', label: t('exercise.history') },
            { value: 'charts', label: t('exercise.charts') },
            { value: 'records', label: t('exercise.records') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'about' ? (
        <View>
          <View style={styles.chips}>
            <Chip label={t(`muscles.${ex.muscleGroup}`)} selected small />
            {ex.secondaryMuscles.map((m) => (
              <Chip key={m} label={t(`muscles.${m}`)} small />
            ))}
            <Chip label={t(`equipment.${ex.equipment}`)} small />
            <Chip label={t(`types.${ex.type}`)} small />
            {ex.isCustom ? <Chip label={t('exercise.custom')} small /> : null}
          </View>
          <SectionTitle title={t('exercise.description')} />
          <Card>
            {description ? (
              <Text style={{ lineHeight: 22 }}>{description}</Text>
            ) : (
              <Text color="faint">{t('exercise.noDescription')}</Text>
            )}
            <Text variant="caption" color="faint" style={{ marginTop: spacing.md }}>
              {t('exercise.descriptionHint')}
            </Text>
          </Card>
          <Button title={t('common.edit')} variant="secondary" full icon={<Icon icon={Pencil} size={16} />} onPress={() => router.push({ pathname: '/exercise/edit', params: { id: ex.id } })} style={{ marginTop: spacing.md }} />
          {history.length > 0 ? (
            <Text variant="caption" color="muted" align="center" style={{ marginTop: spacing.lg }}>
              {t('exercise.timesPerformed', { count: history.length })}
            </Text>
          ) : null}
          {ex.restSeconds != null ? (
            <Text variant="caption" color="muted" align="center" style={{ marginTop: spacing.sm }}>
              {t('exercise.restSeconds')}: {formatDuration(ex.restSeconds)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {tab === 'history' ? (
        history.length === 0 ? (
          <EmptyState icon={Trophy} title={t('exercise.noHistory')} hint={t('exercise.noHistoryHint')} />
        ) : (
          history.map((h) => (
            <Pressable key={h.workoutId} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: h.workoutId } })} scaleTo={0.985}>
              <Card raised style={{ marginBottom: spacing.md }}>
                <View style={styles.histHeader}>
                  <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                    {h.workoutName}
                  </Text>
                  <Text variant="caption" color="muted">
                    {formatRelativeDay(h.startedAt, i18n.language, t)}
                  </Text>
                </View>
                {h.note ? (
                  <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: 4 }}>
                    {h.note}
                  </Text>
                ) : null}
                {h.sets.map((s, i) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text variant="caption" color="faint" style={{ width: 20 }} tabular>
                      {s.type === 'normal' ? i + 1 : t(`workout.setTypeShort.${s.type}`)}
                    </Text>
                    <Text variant="caption" tabular style={{ flex: 1 }}>
                      {formatSetValues(s, fields, units)}
                    </Text>
                    {s.prTypes.length > 0 ? <Icon icon={Trophy} size={12} color="accent" /> : null}
                  </View>
                ))}
              </Card>
            </Pressable>
          ))
        )
      ) : null}

      {tab === 'charts' ? (
        <View>
          <View style={[styles.chips, { marginBottom: spacing.md }]}>
            {metrics.map((m) => (
              <Chip key={m} label={metricLabel(m)} selected={m === activeMetric} onPress={() => setMetric(m)} small />
            ))}
          </View>
          {chartData.length === 0 ? <ChartEmpty text={t('exercise.noHistory')} /> : <LineChart data={chartData} formatY={(v) => (activeMetric === 'duration' ? formatDuration(v) : String(Math.round(v)))} />}
        </View>
      ) : null}

      {tab === 'records' ? (
        records.length === 0 ? (
          <EmptyState icon={Trophy} title={t('exercise.noHistory')} hint={t('exercise.noHistoryHint')} />
        ) : (
          <View style={styles.recordGrid}>
            {records.map((r) => (
              <Pressable key={r.type} onPress={() => r.workoutId && router.push({ pathname: '/workout/[id]', params: { id: r.workoutId } })} style={[styles.record, { backgroundColor: c.surface }]} scaleTo={0.97}>
                <View style={styles.recordTop}>
                  <Icon icon={Trophy} size={14} color="accent" />
                  <Text variant="label" color="muted">
                    {t(`pr.${r.type}`).toUpperCase()}
                  </Text>
                </View>
                <Text variant="h2" tabular>
                  {formatRecord(r.type, r.value)}
                </Text>
                <Text variant="caption" color="faint">
                  {formatRelativeDay(r.achievedAt, i18n.language, t)}
                </Text>
              </Pressable>
            ))}
          </View>
        )
      ) : null}

      <Sheet visible={menu} onClose={() => setMenu(false)} flush>
        <View style={{ paddingHorizontal: spacing.sm }}>
          <ListItem title={t('exercise.edit')} left={<Icon icon={Pencil} />} onPress={() => { setMenu(false); router.push({ pathname: '/exercise/edit', params: { id: ex.id } }); }} />
          <ListItem
            title={ex.archived ? t('exercise.unarchive') : t('exercise.archive')}
            left={<Icon icon={ex.archived ? ArchiveRestore : Archive} />}
            onPress={() => { setExerciseArchived(ex.id, !ex.archived); setMenu(false); }}
          />
          {ex.isCustom ? (
            <ListItem
              title={t('common.delete')}
              titleColor={c.danger}
              left={<Icon icon={Trash2} color="danger" />}
              onPress={async () => {
                setMenu(false);
                if (await confirm({ title: t('exercise.deleteConfirm', { name }), destructive: true, confirmLabel: t('common.delete') })) {
                  deleteExercise(ex.id);
                  router.back();
                }
              }}
            />
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  histHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  record: { width: '47%', flexGrow: 1, padding: spacing.lg, borderRadius: radius.lg, gap: 4 },
  recordTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
