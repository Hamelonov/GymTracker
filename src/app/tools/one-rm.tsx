import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PERCENT_TABLE, estimateOneRm, repsAtPercent } from '@/domain/oneRm';
import { parseNumberInput, roundForDisplay, formatNumberWithoutTrailingZeros } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { ResultCard } from '@/features/tools/ResultCard';
import { ToolTableRow } from '@/features/tools/ToolTableRow';
import { Input, ListGroup, Screen, SectionTitle, spacing } from '@/ui';

const PERCENT_LABEL_WIDTH = 60;

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
          size="lg"
        />
        <Input
          label={translate('tools.repsDone')}
          value={repsText}
          onChangeText={setRepsText}
          keyboardType="number-pad"
          placeholder="5"
          containerStyle={styles.inputContainer}
          size="lg"
        />
      </View>
      <ResultCard
        label={translate('tools.estimated')}
        value={oneRm != null ? formatNumberWithoutTrailingZeros(roundForDisplay(oneRm, 1)) : '—'}
        unit={weightUnit}
      />
      <SectionTitle title={translate('tools.percentTable')} />
      <ListGroup>
        {PERCENT_TABLE.map((percent) => (
          <ToolTableRow
            key={percent}
            label={`${percent}%`}
            labelWidth={PERCENT_LABEL_WIDTH}
            value={formatPercentOfOneRm(percent)}
            extra={`~${repsAtPercent(percent)} ${translate('common.reps')}`}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  inputContainer: { flex: 1 },
});
