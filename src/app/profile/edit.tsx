import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/store/settings';
import { Card, Input, Screen, SectionTitle } from '@/ui';

/** Отдельная страница редактирования имени профиля, открывается стрелкой в шапке вкладки «Профиль». */
export default function ProfileEditScreen() {
  const { t: translate } = useTranslation();
  const settings = useSettings();

  return (
    <Screen header={{ backButton: 'close', title: translate('profile.editTitle') }}>
      <SectionTitle title={translate('settings.profile')} first />
      <Card>
        <Input
          label={translate('settings.profileName')}
          value={settings.profileName}
          onChangeText={(profileName) => settings.update({ profileName })}
          placeholder={translate('settings.profileNamePlaceholder')}
          hint={translate('settings.profileNameHint')}
          autoCapitalize="words"
          autoFocus
        />
      </Card>
    </Screen>
  );
}
