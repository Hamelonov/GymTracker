import { useLocalSearchParams } from 'expo-router';
import { push } from '@/lib/nav';
import { Plus, Ruler } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { listMeasurements } from '@/db/repo/measurements';
import { useQuery } from '@/db/version';
import { formatShortDate } from '@/domain/dates';
import type { MeasurementType } from '@/domain/types';
import { roundForDisplay } from '@/domain/units';
import { type ChartPoint, EmptyChart, LineChart } from '@/features/charts/LineChart';
import { MeasurementHistoryList } from '@/features/measurements/MeasurementHistoryList';
import { MeasurementSummaryTiles } from '@/features/measurements/MeasurementSummaryTiles';
import { convertToDisplayUnit, type MeasurementUnits } from '@/features/measurements/measurementUnits';
import { useSettings } from '@/store/settings';
import { EmptyState, IconButton, Screen, SectionTitle } from '@/ui';

/** Примерно сколько подписей дат помещается под графиком. */
const CHART_LABEL_COUNT = 5;

export default function MeasurementTypeScreen() {
  const { type } = useLocalSearchParams<{ type: MeasurementType }>();
  const { t: translate, i18n } = useTranslation();
  const settings = useSettings();
  const measurements = useQuery(() => (type ? listMeasurements(type) : []), [type]);
  const units = useMemo<MeasurementUnits>(
    () => ({ weight: settings.weightUnit, length: settings.measurementUnit }),
    [settings.weightUnit, settings.measurementUnit],
  );

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!type) return [];
    const labelEvery = Math.max(1, Math.ceil(measurements.length / CHART_LABEL_COUNT));
    // Список идёт от новых к старым; график читается слева направо, от старых к новым.
    const oldestFirst = [...measurements].reverse();
    return oldestFirst.map((measurement, index) => ({
      x: index,
      y: roundForDisplay(convertToDisplayUnit(type, measurement.value, units), 1),
      label: index % labelEvery === 0 ? formatShortDate(measurement.measuredAt, i18n.language) : '',
    }));
  }, [type, measurements, units, i18n.language]);

  if (!type) return <Screen header={{ backButton: true }} />;

  const latest = measurements[0];
  const first = measurements[measurements.length - 1];
  const hasChange = latest && first && measurements.length > 1;
  const change = hasChange ? latest.value - first.value : null;

  return (
    <Screen
      header={{
        backButton: true,
        title: translate(`measurements.types.${type}`),
        right: (
          <IconButton
            icon={Plus}
            variant="accent"
            onPress={() => push({ pathname: '/measurements/log', params: { type } })}
            haptic="light"
          />
        ),
      }}
    >
      {measurements.length === 0 ? (
        <EmptyState icon={Ruler} title={translate('measurements.noData')} />
      ) : (
        <>
          <MeasurementSummaryTiles
            type={type}
            latestValue={latest ? latest.value : null}
            change={change}
            units={units}
          />
          {chartPoints.length > 0 ? (
            <LineChart data={chartPoints} formatY={(value) => String(roundForDisplay(value, 1))} />
          ) : (
            <EmptyChart text={translate('measurements.noData')} />
          )}
          <SectionTitle title={translate('exercise.history')} />
          <MeasurementHistoryList type={type} measurements={measurements} units={units} />
        </>
      )}
    </Screen>
  );
}
