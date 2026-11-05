import { push } from '@/lib/nav';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { DEFAULT_PLATES_KG, DEFAULT_PLATES_LB } from '@/domain/plates';
import type { WeightUnit } from '@/domain/types';
import { formatDuration, unitToKg } from '@/domain/units';
import { PlateSettings } from '@/features/settings/PlateSettings';
import { RestVibrationSetting } from '@/features/settings/RestVibrationSetting';
import { SettingRow } from '@/features/settings/SettingRow';
import { SettingSwitchRow } from '@/features/settings/SettingSwitchRow';
import { useSettings } from '@/store/settings';
import { Chip, ListGroup, ListItem, Screen, SectionTitle, Segmented, spacing } from '@/ui';

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
      <ListGroup>
        <SettingRow label={translate('settings.theme')} layout="stacked">
          <Segmented
            options={[
              { value: 'system', label: translate('settings.themeSystem') },
              { value: 'light', label: translate('settings.themeLight') },
              { value: 'dark', label: translate('settings.themeDark') },
            ]}
            value={settings.theme}
            onChange={(theme) => settings.update({ theme })}
          />
        </SettingRow>
        <SettingRow label={translate('settings.language')} layout="stacked">
          <Segmented
            options={[
              { value: 'system', label: translate('settings.langSystem') },
              { value: 'ru', label: translate('settings.langRu') },
              { value: 'en', label: translate('settings.langEn') },
            ]}
            value={settings.language}
            onChange={(language) => settings.update({ language })}
          />
        </SettingRow>
      </ListGroup>

      <SectionTitle title={translate('settings.units')} />
      <ListGroup>
        <SettingRow label={translate('settings.weightUnit')} layout="inline">
          <Segmented
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            value={settings.weightUnit}
            onChange={handleWeightUnitChange}
          />
        </SettingRow>
        <SettingRow label={translate('settings.distanceUnit')} layout="inline">
          <Segmented
            options={[
              { value: 'km', label: 'km' },
              { value: 'mi', label: 'mi' },
            ]}
            value={settings.distanceUnit}
            onChange={(distanceUnit) => settings.update({ distanceUnit })}
          />
        </SettingRow>
        <SettingRow label={translate('settings.measurementUnit')} layout="inline">
          <Segmented
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'in', label: 'in' },
            ]}
            value={settings.measurementUnit}
            onChange={(measurementUnit) => settings.update({ measurementUnit })}
          />
        </SettingRow>
      </ListGroup>

      <SectionTitle title={translate('settings.workout')} />
      <ListGroup>
        <SettingRow label={translate('settings.defaultRest')} layout="stacked">
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
        </SettingRow>
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
      </ListGroup>

      <SectionTitle title={translate('settings.plates')} />
      <PlateSettings />

      <SectionTitle title={translate('settings.data')} />
      <ListGroup>
        <ListItem title={translate('profile.data')} chevron onPress={() => push('/settings/data')} />
        <ListItem title={translate('settings.about')} chevron onPress={() => push('/settings/about')} />
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
