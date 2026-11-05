import { Tabs, useFocusEffect } from 'expo-router';
import type { BottomTabNavigationOptions } from 'expo-router/tabs';
import { Dumbbell, History, Library, type LucideIcon, Table2, User } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveWorkoutBar, useIsWorkoutBarVisible } from '@/features/workout/ActiveWorkoutBar';
import { Icon, TabBar, layout, useColors, useToastStore } from '@/ui';

type TabIconRenderer = NonNullable<BottomTabNavigationOptions['tabBarIcon']>;

/** На жёлтом штрихе линия значка толще: тонкая на маркере теряется. */
function createTabIconRenderer(icon: LucideIcon): TabIconRenderer {
  return function renderTabIcon({ color, focused, size }) {
    return <Icon icon={icon} size={size} color={color as string} strokeWidth={focused ? 2.5 : 2} />;
  };
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t: translate } = useTranslation();
  const isWorkoutBarVisible = useIsWorkoutBarVisible();
  const setTabBarOffset = useToastStore((state) => state.setTabBarOffset);
  const workoutBarHeight = isWorkoutBarVisible ? layout.workoutBarHeight : 0;
  const bottomPanelHeight = layout.tabBarHeight + insets.bottom + workoutBarHeight;

  // Поверх вкладок открываются обычные экраны без панели, там тосту подниматься не над чем.
  useFocusEffect(
    useCallback(() => {
      setTabBarOffset(bottomPanelHeight);
      return () => setTabBarOffset(0);
    }, [bottomPanelHeight, setTabBarOffset]),
  );

  return (
    <Tabs
      tabBar={(tabBarProps) => <TabBar {...tabBarProps} accessory={<ActiveWorkoutBar />} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: translate('tabs.workout'), tabBarIcon: createTabIconRenderer(Dumbbell) }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: translate('tabs.history'), tabBarIcon: createTabIconRenderer(History) }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: translate('tabs.log'), tabBarIcon: createTabIconRenderer(Table2) }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: translate('tabs.exercises'), tabBarIcon: createTabIconRenderer(Library) }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: translate('tabs.profile'), tabBarIcon: createTabIconRenderer(User) }}
      />
    </Tabs>
  );
}
