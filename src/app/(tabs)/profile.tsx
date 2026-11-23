import { push } from '@/lib/nav';
import {
  Calculator,
  ChartLine,
  Database,
  Info,
  PersonStanding,
  Ruler,
  Scale,
  Settings,
  UserRound,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSettings } from '@/store/settings';
import { Card, Icon, ListItem, Screen, spacing, useColors } from '@/ui';

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
    // Имя профиля — первая строка меню: отдельная шапка ради него заняла бы лишнее место.
    { icon: UserRound, title: profileName || translate('profile.editTitle'), href: '/profile/edit' },
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
    <Screen contentStyle={{ paddingTop: spacing.sm, paddingBottom: 120 }}>
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
});
