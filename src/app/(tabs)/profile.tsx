import { push } from '@/lib/nav';
import {
  Calculator,
  ChartLine,
  ChevronRight,
  Database,
  Info,
  PersonStanding,
  Ruler,
  Scale,
  Settings,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSettings } from '@/store/settings';
import { Card, Icon, ListItem, Pressable, Screen, Text, spacing, useColors } from '@/ui';

interface ProfileLink {
  icon: typeof ChartLine;
  title: string;
  href: string;
}

export default function ProfileTab() {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const profileName = useSettings((state) => state.profileName);
  const profileLinks: ProfileLink[] = [
    { icon: ChartLine, title: translate('profile.stats'), href: '/stats' },
    { icon: Ruler, title: translate('profile.measurements'), href: '/measurements' },
    { icon: Scale, title: translate('profile.plateCalculator'), href: '/tools/plates' },
    { icon: Calculator, title: translate('profile.oneRmCalculator'), href: '/tools/one-rm' },
    { icon: PersonStanding, title: translate('profile.repsCalculator'), href: '/tools/reps' },
    { icon: Database, title: translate('profile.data'), href: '/settings/data' },
    { icon: Settings, title: translate('profile.settings'), href: '/settings' },
    { icon: Info, title: translate('profile.about'), href: '/settings/about' },
  ];
  return (
    <Screen
      header={{
        title: translate('profile.title'),
        large: true,
        largeRight: (
          <Pressable style={styles.nameButton} onPress={() => push('/profile/edit')} haptic="selection">
            <Text variant="bodyMedium" numberOfLines={1} style={styles.nameText}>
              {profileName || translate('profile.editTitle')}
            </Text>
            <Icon icon={ChevronRight} size={18} color="faint" />
          </Pressable>
        ),
      }}
      contentStyle={{ paddingBottom: 120 }}
    >
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

const styles = StyleSheet.create({
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  nameButton: { flexDirection: 'row', alignItems: 'center', gap: 2, maxWidth: 160 },
  nameText: { flexShrink: 1 },
});
