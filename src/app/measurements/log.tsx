import { addDays } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { addMeasurement } from '@/db/repo/measurements';
import { formatRelativeDay } from '@/domain/dates';
import { MEASUREMENT_TYPES, measurementUnitKind, type MeasurementType } from '@/domain/types';
import { parseNumberInput, unitToCm, unitToKg } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { useNow } from '@/lib/useNow';
import { Button, Chip, IconButton, Input, Screen, SectionTitle, Text, spacing } from '@/ui';

export default function LogMeasurementScreen() {
  const params = useLocalSearchParams<{ type?: MeasurementType }>();
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const [type, setType] = useState<MeasurementType>(params.type ?? 'weight');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const now = useNow();
  const [date, setDate] = useState(() => Date.now());
  const kind = measurementUnitKind(type);
  const unitLabel = kind === 'weight' ? settings.weightUnit : kind === 'percent' ? '%' : settings.measurementUnit;
  const parsed = parseNumberInput(value);

  const save = () => {
    if (parsed == null) return;
    const base = kind === 'weight' ? unitToKg(parsed, settings.weightUnit) : kind === 'percent' ? parsed : unitToCm(parsed, settings.measurementUnit);
    addMeasurement(type, base, date, note.trim());
    router.back();
  };

  return (
    <Screen header={{ back: 'close', title: t('measurements.add') }} footer={<Button title={t('common.save')} size="lg" full disabled={parsed == null} onPress={save} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -spacing.lg }}>
        {MEASUREMENT_TYPES.map((m) => (
          <Chip key={m} label={t(`measurements.types.${m}`)} selected={type === m} onPress={() => setType(m)} />
        ))}
      </ScrollView>
      <Input
        label={`${t('measurements.value')} (${unitLabel})`}
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        autoFocus
        placeholder="0"
        containerStyle={{ marginTop: spacing.lg }}
        style={{ fontSize: 28, minHeight: 60 }}
      />
      <SectionTitle title={t('measurements.date')} />
      <View style={styles.dateRow}>
        <IconButton icon={ChevronLeft} variant="filled" onPress={() => setDate((d) => addDays(d, -1).getTime())} haptic="selection" />
        <Text variant="h3" style={{ flex: 1 }} align="center">
          {formatRelativeDay(date, i18n.language, t)}
        </Text>
        <IconButton icon={ChevronRight} variant="filled" disabled={addDays(date, 1).getTime() > now} onPress={() => setDate((d) => Math.min(now, addDays(d, 1).getTime()))} haptic="selection" />
      </View>
      <Input label={t('measurements.note')} value={note} onChangeText={setNote} placeholder={t('common.optional')} containerStyle={{ marginTop: spacing.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
