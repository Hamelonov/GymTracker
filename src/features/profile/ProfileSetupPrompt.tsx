import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/store/settings';
import { Button, Input, Sheet, spacing, Text } from '@/ui';

export function ProfileSetupPrompt() {
  const { t: translate } = useTranslation();
  const profileName = useSettings((state) => state.profileName);
  const profileSetupCompleted = useSettings((state) => state.profileSetupCompleted);
  const hasHydrated = useSettings((state) => state.hasHydrated);
  const updateSettings = useSettings((state) => state.update);
  const [nameInput, setNameInput] = useState(profileName);

  const isVisible = hasHydrated && !profileSetupCompleted && profileName.trim().length === 0;
  const saveProfileName = () => {
    const savedName = nameInput.trim();
    if (!savedName) return;
    updateSettings({ profileName: savedName, profileSetupCompleted: true });
  };

  return (
    <Sheet visible={isVisible} onClose={() => undefined} title={translate('onboarding.profileNameTitle')}>
      <View style={styles.content}>
        <Text color="muted">{translate('onboarding.profileNamePrompt')}</Text>
        <Input
          value={nameInput}
          onChangeText={setNameInput}
          placeholder={translate('settings.profileNamePlaceholder')}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={saveProfileName}
        />
        <Button
          title={translate('onboarding.continue')}
          size="lg"
          fullWidth
          disabled={!nameInput.trim()}
          onPress={saveProfileName}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
});
