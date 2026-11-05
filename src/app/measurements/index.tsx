import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { latestMeasurements } from '@/db/repo/measurements';
import { useQuery } from '@/db/version';
import { formatRelativeDay } from '@/domain/dates';
import { MEASUREMENT_TYPES } from '@/domain/types';
import { formatMeasurement, type MeasurementUnits } from '@/features/measurements/measurementUnits';
import { useSettings } from '@/store/settings';
import { IconButton, ListGroup, ListItem, Screen, Text } from '@/ui';

export default function MeasurementsScreen() {
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const measurementUnit = useSettings((state) => state.measurementUnit);
  const latestByType = useQuery(() => latestMeasurements(), []);
  const units: MeasurementUnits = { weight: weightUnit, length: measurementUnit };
  return (
    <Screen
      header={{
        backButton: true,
        title: translate('measurements.title'),
        right: (
          <IconButton
            icon={Plus}
            variant="accent"
            label={translate('common.add')}
            onPress={() => push('/measurements/log')}
            haptic="light"
          />
        ),
      }}
    >
      <ListGroup>
        {MEASUREMENT_TYPES.map((type) => {
          const latest = latestByType.get(type);
          return (
            <ListItem
              key={type}
              title={translate(`measurements.types.${type}`)}
              subtitle={latest ? formatRelativeDay(latest.measuredAt, i18n.language, translate) : undefined}
              right={
                <Text variant="bodyMedium" color={latest ? 'text' : 'faint'} tabular>
                  {latest ? formatMeasurement(type, latest.value, units) : '—'}
                </Text>
              }
              chevron
              onPress={() => push({ pathname: '/measurements/[type]', params: { type } })}
            />
          );
        })}
      </ListGroup>
    </Screen>
  );
}
