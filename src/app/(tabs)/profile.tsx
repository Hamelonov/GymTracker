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
import { Icon, ListGroup, ListItem, Pressable, Screen, Text, layout, spacing } from '@/ui';

interface ProfileLink {
  icon: typeof ChartLine;
  title: string;
  href: string;
}

// Линия начинается под текстом: поле 16, значок 20, промежуток 12.
const DIVIDER_INSET = 48;

export default function ProfileTab() {
  const { t: translate } = useTranslation();
  const profileName = useSettings((state) => state.profileName);
  const progressLinks: ProfileLink[] = [
    { icon: ChartLine, title: translate('profile.stats'), href: '/stats' },
    { icon: Ruler, title: translate('profile.measurements'), href: '/measurements' },
  ];
  const toolLinks: ProfileLink[] = [
    { icon: Scale, title: translate('profile.plateCalculator'), href: '/tools/plates' },
    { icon: Calculator, title: translate('profile.oneRmCalculator'), href: '/tools/one-rm' },
    { icon: PersonStanding, title: translate('profile.repsCalculator'), href: '/tools/reps' },
  ];
  const appLinks: ProfileLink[] = [
    { icon: Database, title: translate('profile.data'), href: '/settings/data' },
    { icon: Settings, title: translate('profile.settings'), href: '/settings' },
    { icon: Info, title: translate('profile.about'), href: '/settings/about' },
  ];

  const renderGroup = (links: ProfileLink[]) => (
    <ListGroup dividerInset={DIVIDER_INSET}>
      {links.map((link) => (
        <ListItem
          key={link.href}
          title={link.title}
          left={<Icon icon={link.icon} size={20} />}
          chevron
          onPress={() => push(link.href as never)}
        />
      ))}
    </ListGroup>
  );

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
            <Icon icon={ChevronRight} size={20} color="muted" />
          </Pressable>
        ),
      }}
      tabScreen
    >
      <View style={styles.groups}>
        {renderGroup(progressLinks)}
        {renderGroup(toolLinks)}
        {renderGroup(appLinks)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groups: { gap: spacing.lg },
  nameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    maxWidth: 160,
    height: layout.touchTarget,
  },
  nameText: { flexShrink: 1 },
});
