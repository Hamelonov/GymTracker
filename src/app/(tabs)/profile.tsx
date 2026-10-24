import { push } from '@/lib/nav';
import { Calculator, ChartLine, Database, Info, Ruler, Scale, Settings } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { getWorkoutTotals } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatDuration } from '@/domain/units';
import { Card, Icon, ListItem, Screen, SectionTitle, Text, spacing, useColors } from '@/ui';

interface ProfileLink {
  icon: typeof ChartLine;
  title: string;
  href: string;
}

export default function ProfileTab() {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const allTimeTotals = useQuery(() => getWorkoutTotals(), []);
  const profileLinks: ProfileLink[] = [
    { icon: ChartLine, title: translate('profile.stats'), href: '/stats' },
    { icon: Ruler, title: translate('profile.measurements'), href: '/measurements' },
    { icon: Scale, title: translate('profile.plateCalculator'), href: '/tools/plates' },
    { icon: Calculator, title: translate('profile.oneRmCalculator'), href: '/tools/one-rm' },
    { icon: Database, title: translate('profile.data'), href: '/settings/data' },
    { icon: Settings, title: translate('profile.settings'), href: '/settings' },
    { icon: Info, title: translate('profile.about'), href: '/settings/about' },
  ];
  return (
    <Screen header={{ title: translate('profile.title'), large: true }} contentStyle={{ paddingBottom: 120 }}>
      <Card style={styles.statsCard}>
        <StatTile label={translate('stats.workouts')} value={String(allTimeTotals.workouts)} />
        <StatTile
          label={translate('stats.time')}
          value={formatDuration(allTimeTotals.durationSec, { compact: true })}
        />
      </Card>
      <SectionTitle title={translate('common.more')} />
      <Card padded={false}>
        {profileLinks.map((link, index) => (
          <View
            key={link.href}
            style={
              index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : null
            }
          >
            <ListItem
              title={link.title}
              left={
                <View style={[styles.iconCircle, { backgroundColor: colors.surfaceAlt }]}>
                  <Icon icon={link.icon} size={18} />
                </View>
              }
              chevron
              onPress={() => push(link.href as never)}
              style={{ paddingHorizontal: spacing.lg }}
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
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
  statsCard: { flexDirection: 'row' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
