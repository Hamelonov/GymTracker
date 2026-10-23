import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { platesPerSide } from '@/domain/plates';
import { kgToUnit, parseNumberInput, roundDisplay, trimNumber } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Chip, Input, Screen, SectionTitle, Text, radius, spacing, useColors } from '@/ui';

export default function PlatesScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const s = useSettings();
  const [target, setTarget] = useState('');
  const bar = roundDisplay(kgToUnit(s.barWeightKg, s.weightUnit), 2);
  const plates = useMemo(() => s.platesKg.map((p) => roundDisplay(kgToUnit(p, s.weightUnit), 2)).sort((a, b) => b - a), [s.platesKg, s.weightUnit]);
  const value = parseNumberInput(target);
  const result = value != null ? platesPerSide(value, bar, plates) : null;
  const maxPlate = plates[0] ?? 1;

  return (
    <Screen header={{ back: true, title: t('tools.platesTitle') }}>
      <Input
        label={`${t('tools.targetWeight')} (${s.weightUnit})`}
        value={target}
        onChangeText={setTarget}
        keyboardType="decimal-pad"
        autoFocus
        placeholder="100"
        style={{ fontSize: 32, minHeight: 64 }}
        containerStyle={{ marginTop: spacing.sm }}
      />
      <SectionTitle title={t('tools.barWeight')} />
      <View style={styles.chips}>
        {(s.weightUnit === 'kg' ? [20, 15, 10, 7.5] : [45, 35, 25, 15]).map((b) => (
          <Chip key={b} label={`${b} ${s.weightUnit}`} selected={Math.abs(bar - b) < 0.01} onPress={() => s.set({ barWeightKg: s.weightUnit === 'kg' ? b : b * 0.45359237 })} small />
        ))}
      </View>

      <SectionTitle title={t('tools.perSide')} />
      <Card>
        {result && result.plates.length > 0 ? (
          <View style={styles.bar}>
            <View style={[styles.barLine, { backgroundColor: c.borderStrong }]} />
            {result.plates.map((p, i) => {
              const h = 48 + (p / maxPlate) * 72;
              return (
                <View key={i} style={[styles.plate, { height: h, backgroundColor: i % 2 === 0 ? c.text : c.accent }]}>
                  <Text variant="label" color={i % 2 === 0 ? c.bg : c.onAccent}>
                    {trimNumber(p)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text color="faint" align="center" style={{ paddingVertical: spacing.lg }}>
            {value == null ? '—' : value <= bar ? `${trimNumber(bar)} ${s.weightUnit}` : t('tools.remainder', { value: `${trimNumber(result?.remainder ?? 0)} ${s.weightUnit}` })}
          </Text>
        )}
        {result && result.plates.length > 0 ? (
          <View style={styles.summary}>
            <Text variant="h3" tabular>
              {result.plates.map((p) => trimNumber(p)).join(' + ')}
            </Text>
            {result.remainder > 0 ? (
              <Text variant="caption" color="danger">
                {t('tools.remainder', { value: `${trimNumber(result.remainder)} ${s.weightUnit}` })}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>
      <Text variant="caption" color="faint" style={{ marginTop: spacing.md }}>
        {t('tools.availablePlates')}: {plates.map((p) => trimNumber(p)).join(', ')} {s.weightUnit}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 140, paddingLeft: spacing.lg },
  barLine: { width: 40, height: 10, borderRadius: 5 },
  plate: { width: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  summary: { marginTop: spacing.md, gap: 4 },
});
