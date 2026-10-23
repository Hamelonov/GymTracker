import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { latestMeasurements } from '@/db/repo/measurements';
import { useQuery } from '@/db/version';
import { formatRelativeDay } from '@/domain/dates';
import { MEASUREMENT_TYPES, measurementUnitKind, type MeasurementType } from '@/domain/types';
import { cmToUnit, kgToUnit, roundDisplay, trimNumber } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, IconButton, ListItem, Screen, Text, spacing, useColors } from '@/ui';

export function formatMeasurement(type: MeasurementType, value: number, units: { weight: 'kg' | 'lb'; length: 'cm' | 'in' }): string {
  const kind = measurementUnitKind(type);
  if (kind === 'weight') return `${trimNumber(roundDisplay(kgToUnit(value, units.weight), 1))} ${units.weight}`;
  if (kind === 'percent') return `${trimNumber(roundDisplay(value, 1))} %`;
  return `${trimNumber(roundDisplay(cmToUnit(value, units.length), 1))} ${units.length}`;
}

export default function MeasurementsScreen() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const settings = useSettings();
  const latest = useQuery(() => latestMeasurements(), []);
  const units = { weight: settings.weightUnit, length: settings.measurementUnit } as const;
  return (
    <Screen header={{ back: true, title: t('measurements.title'), right: <IconButton icon={Plus} variant="accent" onPress={() => push('/measurements/log')} haptic="light" /> }}>
      <Card padded={false} style={{ marginTop: spacing.sm }}>
        {MEASUREMENT_TYPES.map((type, i) => {
          const m = latest.get(type);
          return (
            <View key={type} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null}>
              <ListItem
                title={t(`measurements.types.${type}`)}
                subtitle={m ? formatRelativeDay(m.measuredAt, i18n.language, t) : undefined}
                right={
                  <Text variant="bodyMedium" color={m ? 'text' : 'faint'} tabular>
                    {m ? formatMeasurement(type, m.value, units) : '—'}
                  </Text>
                }
                chevron
                onPress={() => push({ pathname: '/measurements/[type]', params: { type } })}
                style={{ paddingHorizontal: spacing.lg }}
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
