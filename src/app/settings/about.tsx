import { format } from 'date-fns';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { dateLocale } from '@/domain/dates';
import { useAppUpdate } from '@/features/settings/useAppUpdate';
import { Button, Card, Icon, ListItem, Screen, Text, radius, spacing, useColors } from '@/ui';

const REPO_URL = 'https://github.com/Hamelonov/GymTracker';

/**
 * Какой код сейчас запущен: встроенный в сборку или пришедший обновлением по воздуху.
 * По дате видно, дошла ли последняя правка до телефона.
 */
function describeCurrentUpdate(language: string, translate: (key: string) => string): string {
  const source =
    Updates.isEmbeddedLaunch || !Updates.createdAt
      ? translate('settings.updateEmbedded')
      : format(Updates.createdAt, 'P HH:mm', { locale: dateLocale(language) });
  return Updates.channel ? `${source} · ${Updates.channel}` : source;
}

export default function AboutScreen() {
  const { t: translate, i18n } = useTranslation();
  const colors = useColors();
  const appVersion = Constants.expoConfig?.version ?? '—';
  const { updateApp, buttonTitle, isBusy } = useAppUpdate();
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
          title={translate('settings.update')}
          right={<Text color="muted">{describeCurrentUpdate(i18n.language, translate)}</Text>}
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
      <Button
        title={buttonTitle}
        variant="secondary"
        icon={<Icon icon={RefreshCw} size={18} />}
        disabled={isBusy}
        fullWidth
        onPress={() => void updateApp()}
        style={styles.updateButton}
      />
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
  updateButton: { marginTop: spacing.lg },
});
