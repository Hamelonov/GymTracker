import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Card, ListItem, Screen, Text, radius, spacing, useColors } from '@/ui';

const REPO_URL = 'https://github.com/Hamelonov/GymTracker';

export default function AboutScreen() {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const appVersion = Constants.expoConfig?.version ?? '—';
  return (
    <Screen header={{ backButton: true, title: translate('settings.about') }}>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: colors.accent }]}>
          <Text variant="display" color="onAccent">
            G
          </Text>
        </View>
        <Text variant="h1">GymTracker</Text>
        <Text color="muted" align="center" style={styles.description}>
          {translate('settings.aboutText')}
        </Text>
      </View>
      <Card padded={false}>
        <ListItem
          title={translate('settings.version')}
          right={<Text color="muted">{appVersion}</Text>}
          style={styles.listItem}
        />
        <ListItem
          title={translate('settings.license')}
          right={<Text color="muted">GPL-3.0</Text>}
          style={styles.listItem}
        />
        <ListItem
          title={translate('settings.source')}
          subtitle={REPO_URL}
          chevron
          onPress={() => void Linking.openURL(REPO_URL)}
          style={styles.listItem}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xxl },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  description: { marginTop: spacing.sm, maxWidth: 320 },
  listItem: { paddingHorizontal: spacing.lg },
});
