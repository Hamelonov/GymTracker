import { addDays } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { addMeasurement } from '@/db/repo/measurements';
import { formatRelativeDay } from '@/domain/dates';
import { MEASUREMENT_TYPES, type MeasurementType } from '@/domain/types';
import { parseNumberInput } from '@/domain/units';
import {
  convertToStoredUnit,
  getMeasurementUnitLabel,
  type MeasurementUnits,
} from '@/features/measurements/measurementUnits';
import { useSettings } from '@/store/settings';
import { useNow } from '@/lib/useNow';
import { Button, Chip, IconButton, Input, Screen, SectionTitle, Text, spacing } from '@/ui';

export default function LogMeasurementScreen() {
  const params = useLocalSearchParams<{ type?: MeasurementType }>();
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const measurementUnit = useSettings((state) => state.measurementUnit);
  const [type, setType] = useState<MeasurementType>(params.type ?? 'weight');
  const [valueText, setValueText] = useState('');
  const [note, setNote] = useState('');
  const now = useNow();
  const [measuredAt, setMeasuredAt] = useState(() => Date.now());
  const units: MeasurementUnits = { weight: weightUnit, length: measurementUnit };
  const unitLabel = getMeasurementUnitLabel(type, units);
  const parsedValue = parseNumberInput(valueText);
  const isNextDayInFuture = addDays(measuredAt, 1).getTime() > now;

  const save = () => {
    if (parsedValue == null) return;
    const storedValue = convertToStoredUnit(type, parsedValue, units);
    addMeasurement(type, storedValue, measuredAt, note.trim());
    router.back();
  };

  const goToPreviousDay = () => setMeasuredAt((current) => addDays(current, -1).getTime());
  const goToNextDay = () => setMeasuredAt((current) => Math.min(now, addDays(current, 1).getTime()));

  return (
    <Screen
      header={{ backButton: 'close', title: translate('measurements.add') }}
      footer={
        <Button
          title={translate('common.save')}
          size="lg"
          fullWidth
          disabled={parsedValue == null}
          onPress={save}
        />
      }
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroller}
      >
        {MEASUREMENT_TYPES.map((measurementType) => (
          <Chip
            key={measurementType}
            label={translate(`measurements.types.${measurementType}`)}
            selected={type === measurementType}
            onPress={() => setType(measurementType)}
          />
        ))}
      </ScrollView>
      <Input
        label={`${translate('measurements.value')} (${unitLabel})`}
        value={valueText}
        onChangeText={setValueText}
        keyboardType="decimal-pad"
        autoFocus
        placeholder="0"
        size="xl"
        containerStyle={styles.fieldSpacing}
      />
      <SectionTitle title={translate('measurements.date')} />
      <View style={styles.dateRow}>
        <IconButton
          icon={ChevronLeft}
          variant="plain"
          label={translate('measurements.date')}
          onPress={goToPreviousDay}
          haptic="selection"
          debounceMs={0}
        />
        <Text variant="h3" style={styles.dateText} align="center">
          {formatRelativeDay(measuredAt, i18n.language, translate)}
        </Text>
        <IconButton
          icon={ChevronRight}
          variant="plain"
          label={translate('measurements.date')}
          disabled={isNextDayInFuture}
          onPress={goToNextDay}
          haptic="selection"
          debounceMs={0}
        />
      </View>
      <Input
        label={translate('measurements.note')}
        value={note}
        onChangeText={setNote}
        placeholder={translate('common.optional')}
        containerStyle={styles.fieldSpacing}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Отрицательный отступ позволяет чипам прокручиваться от края до края экрана, за пределами его полей.
  chipsScroller: { marginHorizontal: -spacing.lg },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  fieldSpacing: { marginTop: spacing.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateText: { flex: 1 },
});
