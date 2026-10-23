import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Card, ListItem, Screen, Text, radius, spacing, useColors } from '@/ui';

const REPO_URL = 'https://github.com/Hamelonov/GymTracker';

export default function AboutScreen() {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <Screen header={{ back: true, title: t('settings.about') }}>
      <View style={styles.hero}>
        <View style={[styles.logo, { backgroundColor: c.accent }]}>
          <Text variant="display" color="onAccent">
            G
          </Text>
        </View>
        <Text variant="h1">GymTracker</Text>
        <Text color="muted" align="center" style={{ marginTop: spacing.sm, maxWidth: 320 }}>
          {t('settings.aboutText')}
        </Text>
      </View>
      <Card padded={false}>
        <ListItem title={t('settings.version')} right={<Text color="muted">{Constants.expoConfig?.version ?? '—'}</Text>} style={{ paddingHorizontal: spacing.lg }} />
        <ListItem title={t('settings.license')} right={<Text color="muted">GPL-3.0</Text>} style={{ paddingHorizontal: spacing.lg }} />
        <ListItem title={t('settings.source')} subtitle={REPO_URL} chevron onPress={() => void Linking.openURL(REPO_URL)} style={{ paddingHorizontal: spacing.lg }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xxl },
  logo: { width: 88, height: 88, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
});
