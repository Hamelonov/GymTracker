import { push } from '@/lib/nav';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';
import { DEFAULT_PLATES_KG, DEFAULT_PLATES_LB } from '@/domain/plates';
import { formatDuration, kgToUnit, roundDisplay, trimNumber, unitToKg } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Chip, ListItem, Screen, SectionTitle, Segmented, Text, spacing, useColors } from '@/ui';

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const s = useSettings();
  const platesAvailable = s.weightUnit === 'kg' ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB;
  const platesSelected = new Set(s.platesKg.map((p) => trimNumber(roundDisplay(kgToUnit(p, s.weightUnit), 2))));

  return (
    <Screen header={{ back: true, title: t('settings.title') }}>
      <SectionTitle title={t('settings.appearance')} first />
      <Card style={{ gap: spacing.md }}>
        <Text variant="caption" color="muted">
          {t('settings.theme')}
        </Text>
        <Segmented
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
          value={s.theme}
          onChange={(theme) => s.set({ theme })}
        />
        <Text variant="caption" color="muted">
          {t('settings.language')}
        </Text>
        <Segmented
          options={[
            { value: 'system', label: t('settings.langSystem') },
            { value: 'ru', label: t('settings.langRu') },
            { value: 'en', label: t('settings.langEn') },
          ]}
          value={s.language}
          onChange={(language) => s.set({ language })}
        />
      </Card>

      <SectionTitle title={t('settings.units')} />
      <Card style={{ gap: spacing.md }}>
        <Text variant="caption" color="muted">
          {t('settings.weightUnit')}
        </Text>
        <Segmented options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={s.weightUnit} onChange={(weightUnit) => s.set({ weightUnit, platesKg: (weightUnit === 'kg' ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB.map((p) => unitToKg(p, 'lb'))), barWeightKg: weightUnit === 'kg' ? 20 : unitToKg(45, 'lb') })} />
        <Text variant="caption" color="muted">
          {t('settings.distanceUnit')}
        </Text>
        <Segmented options={[{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }]} value={s.distanceUnit} onChange={(distanceUnit) => s.set({ distanceUnit })} />
        <Text variant="caption" color="muted">
          {t('settings.measurementUnit')}
        </Text>
        <Segmented options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }]} value={s.measurementUnit} onChange={(measurementUnit) => s.set({ measurementUnit })} />
      </Card>

      <SectionTitle title={t('settings.workout')} />
      <Card padded={false}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Text variant="caption" color="muted">
            {t('settings.defaultRest')}
          </Text>
          <View style={styles.chips}>
            {REST_OPTIONS.map((r) => (
              <Chip key={r} label={formatDuration(r)} selected={s.defaultRestSeconds === r} onPress={() => s.set({ defaultRestSeconds: r })} small />
            ))}
          </View>
        </View>
        <Row title={t('settings.autoStartRest')} value={s.autoStartRest} onChange={(autoStartRest) => s.set({ autoStartRest })} />
        <Row title={t('settings.restNotifications')} value={s.restNotifications} onChange={(restNotifications) => s.set({ restNotifications })} />
        <Row title={t('settings.haptics')} value={s.haptics} onChange={(haptics) => s.set({ haptics })} />
        <Row title={t('settings.keepAwake')} value={s.keepAwake} onChange={(keepAwake) => s.set({ keepAwake })} />
        <Row title={t('settings.showRpe')} value={s.showRpe} onChange={(showRpe) => s.set({ showRpe })} />
      </Card>

      <SectionTitle title={t('settings.plates')} />
      <Card style={{ gap: spacing.sm }}>
        <Text variant="caption" color="muted">
          {t('settings.barWeight')}
        </Text>
        <View style={styles.chips}>
          {(s.weightUnit === 'kg' ? [20, 15, 10, 7.5] : [45, 35, 25, 15]).map((b) => (
            <Chip key={b} label={`${b} ${s.weightUnit}`} selected={Math.abs(kgToUnit(s.barWeightKg, s.weightUnit) - b) < 0.01} onPress={() => s.set({ barWeightKg: unitToKg(b, s.weightUnit) })} small />
          ))}
        </View>
        <Text variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
          {t('settings.plates')}
        </Text>
        <View style={styles.chips}>
          {platesAvailable.map((p) => {
            const key = trimNumber(p);
            const selected = platesSelected.has(key);
            return (
              <Chip
                key={p}
                label={key}
                selected={selected}
                small
                onPress={() => {
                  const kg = unitToKg(p, s.weightUnit);
                  const next = selected ? s.platesKg.filter((x) => Math.abs(x - kg) > 0.001) : [...s.platesKg, kg];
                  s.set({ platesKg: next });
                }}
              />
            );
          })}
        </View>
      </Card>

      <SectionTitle title={t('settings.data')} />
      <Card padded={false}>
        <ListItem title={t('profile.data')} chevron onPress={() => push('/settings/data')} style={{ paddingHorizontal: spacing.lg }} />
        <ListItem title={t('settings.about')} chevron onPress={() => push('/settings/about')} style={{ paddingHorizontal: spacing.lg }} />
      </Card>
    </Screen>
  );
}

function Row({ title, value, onChange }: { title: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return <ListItem title={title} right={<Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor={c.bg} />} style={{ paddingHorizontal: spacing.lg }} />;
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
