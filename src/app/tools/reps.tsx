import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  REPS_PERCENT_TABLE,
  SET_COUNT_OPTIONS,
  WORK_RANGE_PERCENT,
  buildRepsPlan,
  repsAtPercentOfMax,
} from '@/domain/repsPlan';
import { parseNumberInput } from '@/domain/units';
import { Card, Input, Screen, SectionTitle, Segmented, Text, spacing, useColors } from '@/ui';

/** Максимум повторений или null, пока в поле нет положительного числа. */
function parseMaxReps(maxRepsText: string): number | null {
  const maxReps = parseNumberInput(maxRepsText);
  if (maxReps == null || maxReps < 1) return null;
  return Math.round(maxReps);
}

export default function RepsCalculatorScreen() {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const [maxRepsText, setMaxRepsText] = useState('');
  const [setCount, setSetCount] = useState<string>('4');
  const maxReps = parseMaxReps(maxRepsText);
  const plan = maxReps != null ? buildRepsPlan(maxReps, Number(setCount)) : [];
  const totalReps = plan.reduce((sum, plannedSet) => sum + plannedSet.reps, 0);

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
      <Segmented
        options={SET_COUNT_OPTIONS.map((count) => ({
          value: String(count),
          label: translate('tools.setCount', { count }),
        }))}
        value={setCount}
        onChange={setSetCount}
      />
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
