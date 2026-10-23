import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PERCENT_TABLE, estimateOneRm, repsAtPercent } from '@/domain/oneRm';
import { parseNumberInput, roundDisplay, trimNumber } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Input, Screen, SectionTitle, Text, spacing, useColors } from '@/ui';

export default function OneRmScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const unit = useSettings((s) => s.weightUnit);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const w = parseNumberInput(weight);
  const r = parseNumberInput(reps);
  const oneRm = w != null && r != null && w > 0 && r > 0 ? estimateOneRm(w, Math.round(r)) : null;

  return (
    <Screen header={{ back: true, title: t('tools.oneRmTitle') }}>
      <View style={styles.row}>
        <Input label={`${t('tools.weightLifted')} (${unit})`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" autoFocus placeholder="100" containerStyle={{ flex: 1 }} style={{ fontSize: 24, minHeight: 56 }} />
        <Input label={t('tools.repsDone')} value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="5" containerStyle={{ flex: 1 }} style={{ fontSize: 24, minHeight: 56 }} />
      </View>
      <Card style={[styles.result, { backgroundColor: c.text }]}>
        <Text variant="label" color={c.textFaint}>
          {t('tools.estimated').toUpperCase()}
        </Text>
        <Text variant="display" color={c.accent} tabular>
          {oneRm != null ? `${trimNumber(roundDisplay(oneRm, 1))}` : '—'}
          <Text variant="h2" color={c.textFaint}>
            {' '}
            {unit}
          </Text>
        </Text>
      </Card>
      <SectionTitle title={t('tools.percentTable')} />
      <Card padded={false}>
        {PERCENT_TABLE.map((p, i) => (
          <View key={p} style={[styles.pRow, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null]}>
            <Text variant="bodyMedium" style={{ width: 60 }} tabular>
              {p}%
            </Text>
            <Text variant="bodyMedium" tabular style={{ flex: 1 }}>
              {oneRm != null ? `${trimNumber(roundDisplay((oneRm * p) / 100, 1))} ${unit}` : '—'}
            </Text>
            <Text variant="caption" color="muted" tabular>
              ~{repsAtPercent(p)} {t('common.reps')}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  result: { marginTop: spacing.lg, alignItems: 'center', gap: 4 },
  pRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
