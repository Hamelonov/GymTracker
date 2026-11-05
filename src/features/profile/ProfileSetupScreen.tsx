import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react-native';
import { useSettings } from '@/store/settings';
import { Button, Input, Screen, spacing, Text, useColors } from '@/ui';

export function ProfileSetupScreen() {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const updateSettings = useSettings((state) => state.update);
  const [nameInput, setNameInput] = useState('');

  const saveProfileName = () => {
    const savedName = nameInput.trim();
    if (!savedName) return;
    updateSettings({ profileName: savedName, profileSetupCompleted: true });
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen scrollable contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
            <UserRound size={34} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Text variant="label" color="muted" style={styles.eyebrow}>
            {translate('onboarding.profileNameEyebrow')}
          </Text>
          <Text variant="h1" align="center">
            {translate('onboarding.profileNameTitle')}
          </Text>
          <Text color="muted" align="center" style={styles.description}>
            {translate('onboarding.profileNamePrompt')}
          </Text>
          <Input
            value={nameInput}
            onChangeText={setNameInput}
            placeholder={translate('settings.profileNamePlaceholder')}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveProfileName}
            containerStyle={styles.input}
          />
          <Button
            title={translate('onboarding.continue')}
            size="lg"
            fullWidth
            disabled={!nameInput.trim()}
            onPress={saveProfileName}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screenContent: { flexGrow: 1, justifyContent: 'center', paddingTop: spacing.xxl },
  content: { alignItems: 'center', gap: spacing.lg },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  eyebrow: { letterSpacing: 1.2 },
  description: { marginTop: spacing.xs, marginBottom: spacing.sm },
  input: { width: '100%' },
});
