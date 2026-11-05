import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { REPS_PERCENT_TABLE, WORK_RANGE_PERCENT, buildRepsPlan, repsAtPercentOfMax } from '@/domain/repsPlan';
import { formatDuration, parseNumberInput } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { ResultCard } from '@/features/tools/ResultCard';
import { ToolTableRow } from '@/features/tools/ToolTableRow';
import { Input, ListGroup, Screen, SectionTitle, Text, spacing } from '@/ui';

const SET_LABEL_WIDTH = 110;
const PERCENT_LABEL_WIDTH = 60;

/** Положительное целое число или null, пока в поле нет такого числа. */
function parsePositiveInteger(text: string): number | null {
  const value = parseNumberInput(text);
  if (value == null || value < 1) return null;
  return Math.round(value);
}

export default function RepsCalculatorScreen() {
  const { t: translate } = useTranslation();
  const defaultRestSeconds = useSettings((state) => state.defaultRestSeconds);
  const [maxRepsText, setMaxRepsText] = useState('');
  const [setCountText, setSetCountText] = useState('4');
  const [restSecondsText, setRestSecondsText] = useState(() => String(defaultRestSeconds));
  const maxReps = parsePositiveInteger(maxRepsText);
  const setCount = parsePositiveInteger(setCountText);
  const restSeconds = parsePositiveInteger(restSecondsText);
  const plan = maxReps != null && setCount != null ? buildRepsPlan(maxReps, setCount) : [];
  const totalReps = plan.reduce((sum, plannedSet) => sum + plannedSet.reps, 0);
  const totalRestSeconds = restSeconds != null && plan.length > 1 ? restSeconds * (plan.length - 1) : null;

  const formatWorkRange = () => {
    if (maxReps == null) return '—';
    const lowReps = repsAtPercentOfMax(maxReps, WORK_RANGE_PERCENT.low);
    const highReps = repsAtPercentOfMax(maxReps, WORK_RANGE_PERCENT.high);
    return lowReps === highReps ? String(lowReps) : `${lowReps}–${highReps}`;
  };

  const formatRepsAtPercent = (percent: number) => {
    if (maxReps == null) return '—';
    return `${repsAtPercentOfMax(maxReps, percent)} ${translate('common.reps')}`;
  };

  return (
    <Screen header={{ backButton: true, title: translate('tools.repsTitle') }}>
      <Input
        label={translate('tools.maxReps')}
        hint={translate('tools.maxRepsHint')}
        value={maxRepsText}
        onChangeText={setMaxRepsText}
        keyboardType="number-pad"
        autoFocus
        placeholder="10"
        size="lg"
        containerStyle={styles.inputContainer}
      />
      <View style={styles.inputsRow}>
        <Input
          label={translate('tools.setCountLabel')}
          value={setCountText}
          onChangeText={setSetCountText}
          keyboardType="number-pad"
          placeholder="4"
          size="md"
          containerStyle={styles.inputHalf}
        />
        <Input
          label={translate('tools.restSecondsLabel')}
          value={restSecondsText}
          onChangeText={setRestSecondsText}
          keyboardType="number-pad"
          placeholder="90"
          size="md"
          containerStyle={styles.inputHalf}
        />
      </View>
      <ResultCard
        label={translate('tools.workRange')}
        value={formatWorkRange()}
        unit={translate('common.reps')}
        caption={translate('tools.workRangeCaption', {
          low: WORK_RANGE_PERCENT.low,
          high: WORK_RANGE_PERCENT.high,
        })}
      />

      <SectionTitle title={translate('tools.setPlan')} />
      {plan.length > 0 ? (
        <ListGroup>
          {plan.map((plannedSet, index) => (
            <ToolTableRow
              key={index}
              label={translate('tools.setNumber', { number: index + 1 })}
              labelWidth={SET_LABEL_WIDTH}
              isLabelMuted
              value={`${plannedSet.reps} ${translate('common.reps')}`}
              extra={`${plannedSet.percent}%`}
            />
          ))}
          <ToolTableRow
            label={translate('tools.totalReps')}
            labelWidth={SET_LABEL_WIDTH}
            isValueBold
            value={`${totalReps} ${translate('common.reps')}`}
          />
          {totalRestSeconds != null ? (
            <ToolTableRow
              label={translate('tools.totalRestTime')}
              labelWidth={SET_LABEL_WIDTH}
              isLabelMuted
              isValueBold
              value={formatDuration(totalRestSeconds)}
            />
          ) : null}
        </ListGroup>
      ) : null}
      <Text variant="caption" color="muted" style={styles.planHint}>
        {translate('tools.repsPlanHint')}
      </Text>

      <SectionTitle title={translate('tools.percentTable')} />
      <ListGroup>
        {REPS_PERCENT_TABLE.map((percent) => (
          <ToolTableRow
            key={percent}
            label={`${percent}%`}
            labelWidth={PERCENT_LABEL_WIDTH}
            value={formatRepsAtPercent(percent)}
          />
        ))}
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputContainer: { marginTop: spacing.sm },
  inputsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  inputHalf: { flex: 1 },
  planHint: { marginTop: spacing.sm, paddingHorizontal: spacing.xs },
});
