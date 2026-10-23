import { router } from 'expo-router';
import { Calculator, ChartLine, Database, Info, Ruler, Scale, Settings } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { totals } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatDuration, formatWeight } from '@/domain/units';
import { useSettings } from '@/store/settings';
import { Card, Icon, ListItem, Screen, SectionTitle, Text, spacing, useColors } from '@/ui';

export default function ProfileTab() {
  const { t } = useTranslation();
  const c = useColors();
  const unit = useSettings((s) => s.weightUnit);
  const all = useQuery(() => totals(), []);
  const rows: { icon: typeof ChartLine; title: string; href: string }[] = [
    { icon: ChartLine, title: t('profile.stats'), href: '/stats' },
    { icon: Ruler, title: t('profile.measurements'), href: '/measurements' },
    { icon: Scale, title: t('profile.plateCalculator'), href: '/tools/plates' },
    { icon: Calculator, title: t('profile.oneRmCalculator'), href: '/tools/one-rm' },
    { icon: Database, title: t('profile.data'), href: '/settings/data' },
    { icon: Settings, title: t('profile.settings'), href: '/settings' },
    { icon: Info, title: t('profile.about'), href: '/settings/about' },
  ];
  return (
    <Screen header={{ title: t('profile.title'), large: true }} contentStyle={{ paddingBottom: 120 }}>
      <Card style={styles.stats}>
        <Stat label={t('stats.workouts')} value={String(all.workouts)} />
        <Stat label={t('stats.volume')} value={formatWeight(Math.round(all.volumeKg), unit)} />
        <Stat label={t('stats.time')} value={formatDuration(all.durationSec, { compact: true })} />
      </Card>
      <SectionTitle title={t('common.more')} />
      <Card padded={false}>
        {rows.map((r, i) => (
          <View key={r.href} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null}>
            <ListItem
              title={r.title}
              left={
                <View style={[styles.iconWrap, { backgroundColor: c.surfaceAlt }]}>
                  <Icon icon={r.icon} size={18} />
                </View>
              }
              chevron
              onPress={() => router.push(r.href as never)}
              style={{ paddingHorizontal: spacing.lg }}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text variant="label" color="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="h3" tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row' },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
