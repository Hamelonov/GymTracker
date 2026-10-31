import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { REPS_PERCENT_TABLE, WORK_RANGE_PERCENT, buildRepsPlan, repsAtPercentOfMax } from '@/domain/repsPlan';
import { formatDuration, parseNumberInput } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Input, Screen, SectionTitle, Text, spacing, useColors } from '@/ui';

/** Положительное целое число или null, пока в поле нет такого числа. */
function parsePositiveInteger(text: string): number | null {
  const value = parseNumberInput(text);
  if (value == null || value < 1) return null;
  return Math.round(value);
}

export default function RepsCalculatorScreen() {
  const { t: translate } = useTranslation();
  const colors = useColors();
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
        containerStyle={styles.inputContainer}
        style={styles.input}
      />
      <View style={styles.inputsRow}>
        <Input
          label={translate('tools.setCountLabel')}
          value={setCountText}
          onChangeText={setSetCountText}
          keyboardType="number-pad"
          placeholder="4"
          containerStyle={styles.inputHalf}
        />
        <Input
          label={translate('tools.restSecondsLabel')}
          value={restSecondsText}
          onChangeText={setRestSecondsText}
          keyboardType="number-pad"
          placeholder="90"
          containerStyle={styles.inputHalf}
        />
      </View>
      <Card style={[styles.result, { backgroundColor: colors.text }]}>
        <Text variant="label" color={colors.textFaint}>
          {translate('tools.workRange').toUpperCase()}
        </Text>
        <Text variant="display" color={colors.accent} tabular>
          {formatWorkRange()}
          <Text variant="h2" color={colors.textFaint}>
            {' '}
            {translate('common.reps')}
          </Text>
        </Text>
        <Text variant="caption" color={colors.textFaint}>
          {translate('tools.workRangeCaption', {
            low: WORK_RANGE_PERCENT.low,
            high: WORK_RANGE_PERCENT.high,
          })}
        </Text>
      </Card>

      <SectionTitle title={translate('tools.setPlan')} />
      {plan.length > 0 ? (
        <Card padded={false} style={styles.planCard}>
          {plan.map((plannedSet, index) => (
            <View
              key={index}
              style={[
                styles.tableRow,
                index > 0 ? [styles.divider, { borderTopColor: colors.border }] : null,
              ]}
            >
              <Text variant="bodyMedium" color="muted" style={styles.setNumberColumn}>
                {translate('tools.setNumber', { number: index + 1 })}
              </Text>
              <Text variant="bodyMedium" tabular style={styles.repsColumn}>
                {plannedSet.reps} {translate('common.reps')}
              </Text>
              <Text variant="caption" color="muted" tabular>
                {plannedSet.percent}%
              </Text>
            </View>
          ))}
          <View style={[styles.tableRow, styles.divider, { borderTopColor: colors.border }]}>
            <Text variant="bodyMedium" style={styles.setNumberColumn}>
              {translate('tools.totalReps')}
            </Text>
            <Text variant="bodyMedium" tabular style={styles.repsColumn}>
              {totalReps} {translate('common.reps')}
            </Text>
          </View>
          {totalRestSeconds != null ? (
            <View style={[styles.tableRow, styles.divider, { borderTopColor: colors.border }]}>
              <Text variant="bodyMedium" color="muted" style={styles.setNumberColumn}>
                {translate('tools.totalRestTime')}
              </Text>
              <Text variant="bodyMedium" tabular style={styles.repsColumn}>
                {formatDuration(totalRestSeconds)}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}
      <Text variant="caption" color="muted" style={styles.planHint}>
        {translate('tools.repsPlanHint')}
      </Text>

      <SectionTitle title={translate('tools.percentTable')} />
      <Card padded={false}>
        {REPS_PERCENT_TABLE.map((percent, index) => (
          <View
            key={percent}
            style={[styles.tableRow, index > 0 ? [styles.divider, { borderTopColor: colors.border }] : null]}
          >
            <Text variant="bodyMedium" style={styles.percentColumn} tabular>
              {percent}%
            </Text>
            <Text variant="bodyMedium" tabular style={styles.repsColumn}>
              {formatRepsAtPercent(percent)}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputContainer: { marginTop: spacing.sm },
  input: { fontSize: 24, minHeight: 56 },
  inputsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  inputHalf: { flex: 1 },
  result: { marginTop: spacing.lg, alignItems: 'center', gap: 4 },
  planCard: { marginTop: spacing.md },
  planHint: { marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth },
  setNumberColumn: { width: 110 },
  percentColumn: { width: 60 },
  repsColumn: { flex: 1 },
});
