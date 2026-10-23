import { Tabs } from 'expo-router';
import { Dumbbell, History, Library, User } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveWorkoutBar } from '@/features/workout/ActiveWorkoutBar';
import { fonts, useColors } from '@/ui';

export const TAB_BAR_HEIGHT = 60;

export default function TabLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.text,
          tabBarInactiveTintColor: c.textFaint,
          tabBarStyle: {
            backgroundColor: c.bg,
            borderTopColor: c.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            elevation: 0,
          },
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },
          sceneStyle: { backgroundColor: c.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t('tabs.workout'), tabBarIcon: ({ color }) => <Dumbbell size={23} color={color} strokeWidth={2.2} /> }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: t('tabs.history'), tabBarIcon: ({ color }) => <History size={23} color={color} strokeWidth={2.2} /> }}
        />
        <Tabs.Screen
          name="exercises"
          options={{ title: t('tabs.exercises'), tabBarIcon: ({ color }) => <Library size={23} color={color} strokeWidth={2.2} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <User size={23} color={color} strokeWidth={2.2} /> }}
        />
      </Tabs>
      <ActiveWorkoutBar bottom={TAB_BAR_HEIGHT + insets.bottom} />
    </>
  );
}
