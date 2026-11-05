import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PERCENT_TABLE, estimateOneRm, repsAtPercent } from '@/domain/oneRm';
import { parseNumberInput, roundForDisplay, formatNumberWithoutTrailingZeros } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Input, Screen, SectionTitle, Text, spacing, useColors } from '@/ui';

/** Расчётный одноповторный максимум или null, пока в обоих полях нет положительных чисел. */
function estimateOneRmFromInput(weightText: string, repsText: string): number | null {
  const weight = parseNumberInput(weightText);
  const reps = parseNumberInput(repsText);
  if (weight == null || reps == null) return null;
  if (weight <= 0 || reps <= 0) return null;
  return estimateOneRm(weight, Math.round(reps));
}

export default function OneRmScreen() {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const weightUnit = useSettings((state) => state.weightUnit);
  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');
  const oneRm = estimateOneRmFromInput(weightText, repsText);

  const formatPercentOfOneRm = (percent: number) => {
    if (oneRm == null) return '—';
    return `${formatNumberWithoutTrailingZeros(roundForDisplay((oneRm * percent) / 100, 1))} ${weightUnit}`;
  };

  return (
    <Screen header={{ backButton: true, title: translate('tools.oneRmTitle') }}>
      <View style={styles.inputsRow}>
        <Input
          label={`${translate('tools.weightLifted')} (${weightUnit})`}
          value={weightText}
          onChangeText={setWeightText}
          keyboardType="decimal-pad"
          autoFocus
          placeholder="100"
          containerStyle={styles.inputContainer}
          style={styles.input}
        />
        <Input
          label={translate('tools.repsDone')}
          value={repsText}
          onChangeText={setRepsText}
          keyboardType="number-pad"
          placeholder="5"
          containerStyle={styles.inputContainer}
          style={styles.input}
        />
      </View>
      <Card style={[styles.result, { backgroundColor: colors.inverseSurface }]}>
        <Text variant="label" color="inverseMuted">
          {translate('tools.estimated').toUpperCase()}
        </Text>
        <Text variant="display" color="accent" tabular>
          {oneRm != null ? `${formatNumberWithoutTrailingZeros(roundForDisplay(oneRm, 1))}` : '—'}
          <Text variant="h2" color="inverseMuted">
            {' '}
            {weightUnit}
          </Text>
        </Text>
      </Card>
      <SectionTitle title={translate('tools.percentTable')} />
      <Card padded={false}>
        {PERCENT_TABLE.map((percent, index) => (
          <View
            key={percent}
            style={[
              styles.percentRow,
              index > 0 ? [styles.divider, { borderTopColor: colors.border }] : null,
            ]}
          >
            <Text variant="bodyMedium" style={styles.percentColumn} tabular>
              {percent}%
            </Text>
            <Text variant="bodyMedium" tabular style={styles.weightColumn}>
              {formatPercentOfOneRm(percent)}
            </Text>
            <Text variant="caption" color="muted" tabular>
              ~{repsAtPercent(percent)} {translate('common.reps')}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  inputContainer: { flex: 1 },
  input: { fontSize: 24, minHeight: 56 },
  result: { marginTop: spacing.lg, alignItems: 'center', gap: 4 },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  percentColumn: { width: 60 },
  weightColumn: { flex: 1 },
});
