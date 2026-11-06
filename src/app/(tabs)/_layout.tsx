import { Tabs } from 'expo-router';
import { Dumbbell, History, Library, Table2, User, type LucideIcon } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveWorkoutBar } from '@/features/workout/ActiveWorkoutBar';
import { fonts, motion, radius, useColors } from '@/ui';

export const TAB_BAR_HEIGHT = 64;

/** Кнопка вкладки без кружка-ripple: активность показывает жёлтая капсула под иконкой, а не нажатие. */
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

/** Иконка вкладки на жёлтой капсуле: капсула появляется через opacity и scale, без сдвигов. */
function TabIcon({ icon: IconComponent, isFocused }: { icon: LucideIcon; isFocused: boolean }) {
  const colors = useColors();
  const capsuleProgress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    capsuleProgress.set(
      withTiming(isFocused ? 1 : 0, { duration: motion.quick, easing: Easing.out(Easing.cubic) }),
    );
  }, [isFocused, capsuleProgress]);

  const capsuleStyle = useAnimatedStyle(() => ({
    opacity: capsuleProgress.get(),
    transform: [{ scale: 0.85 + 0.15 * capsuleProgress.get() }],
  }));

  return (
    <View style={styles.iconSlot}>
      <Animated.View style={[styles.capsule, { backgroundColor: colors.accent }, capsuleStyle]} />
      <IconComponent size={22} color={isFocused ? colors.onAccent : colors.textMuted} strokeWidth={2.2} />
    </View>
  );
}

function TabLabel({ title, isFocused }: { title: string; isFocused: boolean }) {
  const colors = useColors();
  return (
    <Text
      numberOfLines={1}
      // Длинное «Упражнения» на узком экране сжимается, а не обрезается многоточием.
      adjustsFontSizeToFit
      style={[
        styles.label,
        {
          color: isFocused ? colors.text : colors.textMuted,
          fontFamily: fonts.semibold,
        },
      ]}
    >
      {title}
    </Text>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t: translate } = useTranslation();

  const renderTabOptions = (titleKey: string, icon: LucideIcon) => ({
    title: translate(titleKey),
    tabBarLabel: ({ focused }: { focused: boolean }) => (
      <TabLabel title={translate(titleKey)} isFocused={focused} />
    ),
    tabBarIcon: ({ focused }: { focused: boolean }) => <TabIcon icon={icon} isFocused={focused} />,
  });

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopWidth: 0,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            elevation: 0,
          },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="index" options={renderTabOptions('tabs.workout', Dumbbell)} />
        <Tabs.Screen name="history" options={renderTabOptions('tabs.history', History)} />
        <Tabs.Screen name="log" options={renderTabOptions('tabs.log', Table2)} />
        <Tabs.Screen name="exercises" options={renderTabOptions('tabs.exercises', Library)} />
        <Tabs.Screen name="profile" options={renderTabOptions('tabs.profile', User)} />
      </Tabs>
      <ActiveWorkoutBar bottom={TAB_BAR_HEIGHT + insets.bottom} />
    </>
  );
}

const styles = StyleSheet.create({
  iconSlot: { width: 46, height: 30, alignItems: 'center', justifyContent: 'center' },
  capsule: { ...StyleSheet.absoluteFill, borderRadius: radius.sm },
  label: { fontSize: 11, marginTop: 2, maxWidth: 72 },
});
