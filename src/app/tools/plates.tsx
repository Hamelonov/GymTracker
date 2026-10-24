import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { platesPerSide } from '@/domain/plates';
import {
  kgToUnit,
  parseNumberInput,
  roundForDisplay,
  formatNumberWithoutTrailingZeros,
} from '@/domain/units';
import { BarbellDiagram } from '@/features/tools/BarbellDiagram';
import { BAR_WEIGHT_OPTIONS } from '@/features/tools/barWeights';
import { useSettings } from '@/store/settings';
import { Card, Chip, Input, Screen, SectionTitle, Text, spacing } from '@/ui';

const KG_PER_POUND = 0.45359237;

export default function PlatesScreen() {
  const { t: translate } = useTranslation();
  const settings = useSettings();
  const { weightUnit } = settings;
  const [targetText, setTargetText] = useState('');
  const barWeight = roundForDisplay(kgToUnit(settings.barWeightKg, weightUnit), 2);
  const availablePlates = useMemo(
    () =>
      settings.platesKg
        .map((plateKg) => roundForDisplay(kgToUnit(plateKg, weightUnit), 2))
        .sort((first, second) => second - first),
    [settings.platesKg, weightUnit],
  );
  const targetWeight = parseNumberInput(targetText);
  const result = targetWeight != null ? platesPerSide(targetWeight, barWeight, availablePlates) : null;
  const hasPlates = result != null && result.plates.length > 0;
  const heaviestPlate = availablePlates[0] ?? 1;

  const formatWithUnit = (weight: number) => `${formatNumberWithoutTrailingZeros(weight)} ${weightUnit}`;

  const selectBarWeight = (barWeightInUnit: number) => {
    const barWeightKg = weightUnit === 'kg' ? barWeightInUnit : barWeightInUnit * KG_PER_POUND;
    settings.update({ barWeightKg });
  };

  // Показывается вместо схемы, когда блины не нужны или цель не задана.
  const getNoPlatesMessage = (): string => {
    if (targetWeight == null) return '—';
    if (targetWeight <= barWeight) return formatWithUnit(barWeight);
    return translate('tools.remainder', { value: formatWithUnit(result?.remainder ?? 0) });
  };

  return (
    <Screen header={{ backButton: true, title: translate('tools.platesTitle') }}>
      <Input
        label={`${translate('tools.targetWeight')} (${weightUnit})`}
        value={targetText}
        onChangeText={setTargetText}
        keyboardType="decimal-pad"
        autoFocus
        placeholder="100"
        style={styles.targetInput}
        containerStyle={styles.targetInputContainer}
      />
      <SectionTitle title={translate('tools.barWeight')} />
      <View style={styles.chips}>
        {BAR_WEIGHT_OPTIONS[weightUnit].map((barWeightOption) => (
          <Chip
            key={barWeightOption}
            label={`${barWeightOption} ${weightUnit}`}
            selected={Math.abs(barWeight - barWeightOption) < 0.01}
            onPress={() => selectBarWeight(barWeightOption)}
            small
          />
        ))}
      </View>

      <SectionTitle title={translate('tools.perSide')} />
      <Card>
        {hasPlates ? (
          <BarbellDiagram plates={result.plates} heaviestPlate={heaviestPlate} />
        ) : (
          <Text color="faint" align="center" style={styles.noPlatesMessage}>
            {getNoPlatesMessage()}
          </Text>
        )}
        {hasPlates ? (
          <View style={styles.summary}>
            <Text variant="h3" tabular>
              {result.plates.map((plate) => formatNumberWithoutTrailingZeros(plate)).join(' + ')}
            </Text>
            {result.remainder > 0 ? (
              <Text variant="caption" color="danger">
                {translate('tools.remainder', { value: formatWithUnit(result.remainder) })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>
      <Text variant="caption" color="faint" style={styles.availablePlates}>
        {translate('tools.availablePlates')}:{' '}
        {availablePlates.map((plate) => formatNumberWithoutTrailingZeros(plate)).join(', ')} {weightUnit}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  targetInput: { fontSize: 32, minHeight: 64 },
  targetInputContainer: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  noPlatesMessage: { paddingVertical: spacing.lg },
  summary: { marginTop: spacing.md, gap: 4 },
  availablePlates: { marginTop: spacing.md },
});
