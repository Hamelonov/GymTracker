import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Ruler, Trash2 } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { deleteMeasurement, listMeasurements } from '@/db/repo/measurements';
import { useQuery } from '@/db/version';
import { formatDateTime, formatShortDate } from '@/domain/dates';
import { measurementUnitKind, type MeasurementType } from '@/domain/types';
import { cmToUnit, kgToUnit, roundDisplay } from '@/domain/units';
import { ChartEmpty, LineChart } from '@/features/charts/LineChart';
import { useSettings } from '@/store/settings';
import { Card, EmptyState, IconButton, ListItem, Screen, SectionTitle, Text, confirm, spacing, useColors } from '@/ui';
import { formatMeasurement } from './index';

export default function MeasurementTypeScreen() {
  const { type } = useLocalSearchParams<{ type: MeasurementType }>();
  const { t, i18n } = useTranslation();
  const c = useColors();
  const settings = useSettings();
  const rows = useQuery(() => (type ? listMeasurements(type) : []), [type]);
  const units = useMemo(() => ({ weight: settings.weightUnit, length: settings.measurementUnit }) as const, [settings.weightUnit, settings.measurementUnit]);
  const kind = type ? measurementUnitKind(type) : 'length';
  const chart = useMemo(
    () =>
      [...rows].reverse().map((m, i) => ({
        x: i,
        y: roundDisplay(kind === 'weight' ? kgToUnit(m.value, units.weight) : kind === 'percent' ? m.value : cmToUnit(m.value, units.length), 1),
        label: i % Math.max(1, Math.ceil(rows.length / 5)) === 0 ? formatShortDate(m.measuredAt, i18n.language) : '',
      })),
    [rows, kind, units, i18n.language],
  );
  if (!type) return <Screen header={{ back: true }} />;
  const latest = rows[0];
  const first = rows[rows.length - 1];
  const change = latest && first && rows.length > 1 ? latest.value - first.value : null;
  return (
    <Screen header={{ back: true, title: t(`measurements.types.${type}`), right: <IconButton icon={Plus} variant="accent" onPress={() => router.push({ pathname: '/measurements/log', params: { type } })} haptic="light" /> }}>
      {rows.length === 0 ? (
        <EmptyState icon={Ruler} title={t('measurements.noData')} />
      ) : (
        <>
          <View style={styles.tiles}>
            <View style={[styles.tile, { backgroundColor: c.surface }]}>
              <Text variant="label" color="muted">
                {t('measurements.latest').toUpperCase()}
              </Text>
              <Text variant="h2" tabular>
                {latest ? formatMeasurement(type, latest.value, units) : '—'}
              </Text>
            </View>
            <View style={[styles.tile, { backgroundColor: c.surface }]}>
              <Text variant="label" color="muted">
                {t('measurements.change').toUpperCase()}
              </Text>
              <Text variant="h2" tabular color={change == null ? 'faint' : change > 0 ? 'success' : change < 0 ? 'danger' : 'text'}>
                {change == null ? '—' : `${change > 0 ? '+' : ''}${formatMeasurement(type, change, units)}`}
              </Text>
            </View>
          </View>
          {chart.length > 0 ? <LineChart data={chart} formatY={(v) => String(roundDisplay(v, 1))} /> : <ChartEmpty text={t('measurements.noData')} />}
          <SectionTitle title={t('exercise.history')} />
          <Card padded={false}>
            {rows.map((m, i) => (
              <View key={m.id} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null}>
                <ListItem
                  title={formatMeasurement(type, m.value, units)}
                  subtitle={`${formatDateTime(m.measuredAt, i18n.language)}${m.note ? ` · ${m.note}` : ''}`}
                  right={
                    <IconButton
                      icon={Trash2}
                      size={18}
                      color="muted"
                      onPress={async () => {
                        if (await confirm({ title: t('measurements.deleteConfirm'), destructive: true, confirmLabel: t('common.delete') })) deleteMeasurement(m.id);
                      }}
                    />
                  }
                  style={{ paddingHorizontal: spacing.lg }}
                />
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  tile: { flex: 1, padding: spacing.lg, borderRadius: 16, gap: 4 },
});
