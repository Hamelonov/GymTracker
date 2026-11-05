import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { DEFAULT_PLATES_KG, DEFAULT_PLATES_LB } from '@/domain/plates';
import { kgToUnit, roundForDisplay, formatNumberWithoutTrailingZeros, unitToKg } from '@/domain/units';
import { BAR_WEIGHT_OPTIONS } from '@/features/tools/barWeights';
import { useSettings } from '@/store/settings';
import { Chip, ListGroup, spacing } from '@/ui';
import { SettingRow } from './SettingRow';

/** Группа для выбора веса грифа и того, какие блины может использовать калькулятор блинов. */
export function PlateSettings() {
  const { t: translate } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const platesKg = useSettings((state) => state.platesKg);
  const barWeightKg = useSettings((state) => state.barWeightKg);
  const updateSettings = useSettings((state) => state.update);
  const availablePlates = weightUnit === 'kg' ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB;
  // Блины хранятся в кг; сравниваем их как подписи в текущих единицах.
  const selectedPlateLabels = new Set(
    platesKg.map((plateKg) =>
      formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(plateKg, weightUnit), 2)),
    ),
  );

  const togglePlate = (plate: number, isSelected: boolean) => {
    const plateKg = unitToKg(plate, weightUnit);
    const nextPlatesKg = isSelected
      ? platesKg.filter((selectedPlateKg) => Math.abs(selectedPlateKg - plateKg) > 0.001)
      : [...platesKg, plateKg];
    updateSettings({ platesKg: nextPlatesKg });
  };

  return (
    <ListGroup>
      <SettingRow label={translate('settings.barWeight')} layout="stacked">
        <View style={styles.chips}>
          {BAR_WEIGHT_OPTIONS[weightUnit].map((barWeight) => (
            <Chip
              key={barWeight}
              label={`${barWeight} ${weightUnit}`}
              selected={Math.abs(kgToUnit(barWeightKg, weightUnit) - barWeight) < 0.01}
              onPress={() => updateSettings({ barWeightKg: unitToKg(barWeight, weightUnit) })}
              small
            />
          ))}
        </View>
      </SettingRow>
      <SettingRow label={translate('settings.plates')} layout="stacked">
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
      </SettingRow>
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
