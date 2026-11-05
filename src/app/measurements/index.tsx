import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { latestMeasurements } from '@/db/repo/measurements';
import { useQuery } from '@/db/version';
import { formatRelativeDay } from '@/domain/dates';
import { MEASUREMENT_TYPES } from '@/domain/types';
import { formatMeasurement, type MeasurementUnits } from '@/features/measurements/measurementUnits';
import { useSettings } from '@/store/settings';
import { Card, IconButton, ListItem, Screen, Text, spacing, useColors } from '@/ui';

export default function MeasurementsScreen() {
  const { t: translate, i18n } = useTranslation();
  const colors = useColors();
  const settings = useSettings();
  const latestByType = useQuery(() => latestMeasurements(), []);
  const units: MeasurementUnits = { weight: settings.weightUnit, length: settings.measurementUnit };
  return (
    <Screen
      header={{
        backButton: true,
        title: translate('measurements.title'),
        right: (
          <IconButton icon={Plus} variant="accent" onPress={() => push('/measurements/log')} haptic="light" />
        ),
      }}
    >
      <Card padded={false} style={styles.card}>
        {MEASUREMENT_TYPES.map((type, index) => {
          const latest = latestByType.get(type);
          return (
            <View key={type} style={index > 0 ? [styles.divider, { borderTopColor: colors.border }] : null}>
              <ListItem
                title={translate(`measurements.types.${type}`)}
                subtitle={latest ? formatRelativeDay(latest.measuredAt, i18n.language, translate) : undefined}
                right={
                  <Text variant="bodyMedium" color={latest ? 'text' : 'faint'} tabular>
                    {latest ? formatMeasurement(type, latest.value, units) : '—'}
                  </Text>
                }
                chevron
                onPress={() => push({ pathname: '/measurements/[type]', params: { type } })}
                style={styles.listItem}
              />
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  listItem: { paddingHorizontal: spacing.lg },
});
