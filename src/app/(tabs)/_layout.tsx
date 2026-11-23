import { Tabs } from 'expo-router';
import { Dumbbell, History, Table2, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveWorkoutBar } from '@/features/workout/ActiveWorkoutBar';
import { fonts, useColors } from '@/ui';

export const TAB_BAR_HEIGHT = 60;

/** Кнопка вкладки без кружка-ripple: активность показывает жёлтый цвет иконки и подписи, а не нажатие. */
function TabBarButton({
  children,
  style,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityState,
  testID,
}: {
  children: React.ReactNode;
  style?: React.ComponentProps<typeof Pressable>['style'];
  onPress?: React.ComponentProps<typeof Pressable>['onPress'];
  onLongPress?: React.ComponentProps<typeof Pressable>['onLongPress'];
  accessibilityLabel?: string;
  accessibilityState?: React.ComponentProps<typeof Pressable>['accessibilityState'];
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      testID={testID}
      android_ripple={undefined}
      style={style}
    >
      {children}
    </Pressable>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t: translate } = useTranslation();
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            elevation: 0,
          },
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: translate('tabs.workout'),
            tabBarIcon: ({ color }) => <Dumbbell size={23} color={color} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: translate('tabs.history'),
            tabBarIcon: ({ color }) => <History size={23} color={color} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: translate('tabs.log'),
            tabBarIcon: ({ color }) => <Table2 size={23} color={color} strokeWidth={2.2} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: translate('tabs.profile'),
            tabBarIcon: ({ color }) => <User size={23} color={color} strokeWidth={2.2} />,
          }}
        />
      </Tabs>
      <ActiveWorkoutBar bottom={TAB_BAR_HEIGHT + insets.bottom} />
    </>
  );
}
