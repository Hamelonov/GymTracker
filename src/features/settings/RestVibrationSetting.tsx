import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  REST_VIBRATION_STRENGTHS,
  type RestVibrationStrength,
  restVibrationPattern,
  vibrateWithPattern,
} from '@/lib/restAlert';
import { useSettings } from '@/store/settings';
import { Segmented } from '@/ui';
import { SettingRow } from './SettingRow';

const STRENGTH_LABEL_KEYS: Record<RestVibrationStrength, string> = {
  off: 'settings.restVibrationOff',
  light: 'settings.restVibrationLight',
  medium: 'settings.restVibrationMedium',
  strong: 'settings.restVibrationStrong',
};

/** Выбор силы вибрации в конце отдыха; при выборе сразу даёт её почувствовать. */
export function RestVibrationSetting() {
  const { t: translate } = useTranslation();
  const restVibration = useSettings((state) => state.restVibration);
  const updateSettings = useSettings((state) => state.update);

  const handleStrengthChange = (strength: RestVibrationStrength) => {
    updateSettings({ restVibration: strength });
    vibrateWithPattern(restVibrationPattern(strength));
  };

  return (
    <SettingRow
      label={translate('settings.restVibration')}
      layout="stacked"
      hint={translate('settings.restVibrationHint')}
    >
      <Segmented
        options={REST_VIBRATION_STRENGTHS.map((strength) => ({
          value: strength,
          label: translate(STRENGTH_LABEL_KEYS[strength]),
        }))}
        value={restVibration}
        onChange={handleStrengthChange}
        // Выбор сам даёт почувствовать вибрацию, вторая поверх неё только мешает.
        hasHaptic={false}
      />
    </SettingRow>
  );
}
