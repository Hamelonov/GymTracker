import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { DEFAULT_PLATES_KG, DEFAULT_PLATES_LB } from '@/domain/plates';
import { kgToUnit, roundForDisplay, formatNumberWithoutTrailingZeros, unitToKg } from '@/domain/units';
import { BAR_WEIGHT_OPTIONS } from '@/features/tools/barWeights';
import { useSettings } from '@/store/settings';
import { Card, Chip, Text, spacing } from '@/ui';

/** Карточка для выбора веса грифа и того, какие блины может использовать калькулятор блинов. */
export function PlateSettings() {
  const { t: translate } = useTranslation();
  const settings = useSettings();
  const availablePlates = settings.weightUnit === 'kg' ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB;
  // Блины хранятся в кг; сравниваем их как подписи в текущих единицах.
  const selectedPlateLabels = new Set(
    settings.platesKg.map((plateKg) =>
      formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(plateKg, settings.weightUnit), 2)),
    ),
  );

  const togglePlate = (plate: number, isSelected: boolean) => {
    const plateKg = unitToKg(plate, settings.weightUnit);
    const nextPlatesKg = isSelected
      ? settings.platesKg.filter((selectedPlateKg) => Math.abs(selectedPlateKg - plateKg) > 0.001)
      : [...settings.platesKg, plateKg];
    settings.update({ platesKg: nextPlatesKg });
  };

  return (
    <Card style={styles.card}>
      <Text variant="caption" color="muted">
        {translate('settings.barWeight')}
      </Text>
      <View style={styles.chips}>
        {BAR_WEIGHT_OPTIONS[settings.weightUnit].map((barWeight) => (
          <Chip
            key={barWeight}
            label={`${barWeight} ${settings.weightUnit}`}
            selected={Math.abs(kgToUnit(settings.barWeightKg, settings.weightUnit) - barWeight) < 0.01}
            onPress={() => settings.update({ barWeightKg: unitToKg(barWeight, settings.weightUnit) })}
            small
          />
        ))}
      </View>
      <Text variant="caption" color="muted" style={styles.platesLabel}>
        {translate('settings.plates')}
      </Text>
      <View style={styles.chips}>
        {availablePlates.map((plate) => {
          const plateLabel = formatNumberWithoutTrailingZeros(plate);
          const isSelected = selectedPlateLabels.has(plateLabel);
          return (
            <Chip
              key={plate}
              label={plateLabel}
              selected={isSelected}
              small
              onPress={() => togglePlate(plate, isSelected)}
            />
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  platesLabel: { marginTop: spacing.sm },
});
