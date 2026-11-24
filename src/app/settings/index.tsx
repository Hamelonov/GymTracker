import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { DEFAULT_PLATES_KG, DEFAULT_PLATES_LB } from '@/domain/plates';
import type { WeightUnit } from '@/domain/types';
import { formatDuration, unitToKg } from '@/domain/units';
import { PlateSettings } from '@/features/settings/PlateSettings';
import { SettingSwitchRow } from '@/features/settings/SettingSwitchRow';
import { RestVibrationSetting } from '@/features/settings/RestVibrationSetting';
import { SetSeparatorSetting } from '@/features/settings/SetSeparatorSetting';
import { useSettings } from '@/store/settings';
import { Card, Chip, Screen, SectionTitle, Segmented, Text, spacing } from '@/ui';

const REST_SECONDS_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 240];

export default function SettingsScreen() {
  const { t: translate } = useTranslation();
  const settings = useSettings();

  // Смена единиц также сбрасывает блины и гриф на стандартный набор для этих единиц.
  const handleWeightUnitChange = (weightUnit: WeightUnit) => {
    const isKg = weightUnit === 'kg';
    settings.update({
      weightUnit,
      platesKg: isKg ? DEFAULT_PLATES_KG : DEFAULT_PLATES_LB.map((plate) => unitToKg(plate, 'lb')),
      barWeightKg: isKg ? 20 : unitToKg(45, 'lb'),
    });
  };

  return (
    <Screen header={{ backButton: true, title: translate('settings.title') }}>
      <SectionTitle title={translate('settings.appearance')} first />
      <Card style={styles.segmentedCard}>
        <Text variant="caption" color="muted">
          {translate('settings.theme')}
        </Text>
        <Segmented
          options={[
            { value: 'system', label: translate('settings.themeSystem') },
            { value: 'light', label: translate('settings.themeLight') },
            { value: 'dark', label: translate('settings.themeDark') },
          ]}
          value={settings.theme}
          onChange={(theme) => settings.update({ theme })}
        />
        <Text variant="caption" color="muted">
          {translate('settings.language')}
        </Text>
        <Segmented
          options={[
            { value: 'system', label: translate('settings.langSystem') },
            { value: 'ru', label: translate('settings.langRu') },
            { value: 'en', label: translate('settings.langEn') },
          ]}
          value={settings.language}
          onChange={(language) => settings.update({ language })}
        />
      </Card>

      <SectionTitle title={translate('settings.units')} />
      <Card style={styles.segmentedCard}>
        <Text variant="caption" color="muted">
          {translate('settings.weightUnit')}
        </Text>
        <Segmented
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value={settings.weightUnit}
          onChange={handleWeightUnitChange}
        />
        <Text variant="caption" color="muted">
          {translate('settings.distanceUnit')}
        </Text>
        <Segmented
          options={[
            { value: 'km', label: 'km' },
            { value: 'mi', label: 'mi' },
          ]}
          value={settings.distanceUnit}
          onChange={(distanceUnit) => settings.update({ distanceUnit })}
        />
        <Text variant="caption" color="muted">
          {translate('settings.measurementUnit')}
        </Text>
        <Segmented
          options={[
            { value: 'cm', label: 'cm' },
            { value: 'in', label: 'in' },
          ]}
          value={settings.measurementUnit}
          onChange={(measurementUnit) => settings.update({ measurementUnit })}
        />
      </Card>

      <SectionTitle title={translate('settings.workout')} />
      <Card padded={false}>
        <View style={styles.restSection}>
          <Text variant="caption" color="muted">
            {translate('settings.defaultRest')}
          </Text>
          <View style={styles.chips}>
            {REST_SECONDS_OPTIONS.map((restSeconds) => (
              <Chip
                key={restSeconds}
                label={formatDuration(restSeconds)}
                selected={settings.defaultRestSeconds === restSeconds}
                onPress={() => settings.update({ defaultRestSeconds: restSeconds })}
                small
              />
            ))}
          </View>
        </View>
        <SettingSwitchRow
          title={translate('settings.autoStartRest')}
          value={settings.autoStartRest}
          onChange={(autoStartRest) => settings.update({ autoStartRest })}
        />
        <SettingSwitchRow
          title={translate('settings.restNotifications')}
          value={settings.restNotifications}
          onChange={(restNotifications) => settings.update({ restNotifications })}
        />
        <RestVibrationSetting />
        <SetSeparatorSetting />
        <SettingSwitchRow
          title={translate('settings.haptics')}
          value={settings.haptics}
          onChange={(haptics) => settings.update({ haptics })}
        />
        <SettingSwitchRow
          title={translate('settings.keepAwake')}
          value={settings.keepAwake}
          onChange={(keepAwake) => settings.update({ keepAwake })}
        />
      </Card>

      <SectionTitle title={translate('settings.plates')} />
      <PlateSettings />
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmentedCard: { gap: spacing.md },
  restSection: { padding: spacing.lg, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
