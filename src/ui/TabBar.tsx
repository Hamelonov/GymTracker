import type { BottomTabBarProps } from 'expo-router/tabs';
import React from 'react';
import { Pressable as NativePressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { fonts, layout, radius, spacing } from './tokens';

interface TabBarProps extends BottomTabBarProps {
  /** Строка над вкладками: панель растёт вместе с ней, и экраны становятся короче, а не перекрываются. */
  accessory?: React.ReactNode;
}

const TAB_ICON_SIZE = 22;
// Подпись задана по ширине ячейки: без предела крупный системный шрифт обрежет «Упражнения».
const LABEL_MAX_FONT_SCALE = 1.2;

interface TabCellProps {
  label: string;
  isFocused: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}

function TabCell({ label, isFocused, icon, onPress }: TabCellProps) {
  const colors = useColors();
  return (
    <NativePressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={styles.cell}
    >
      <View style={[styles.iconStroke, isFocused ? { backgroundColor: colors.accent } : null]}>{icon}</View>
      <Text
        color={isFocused ? 'text' : 'muted'}
        numberOfLines={1}
        maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
        style={[styles.label, isFocused ? styles.labelFocused : null]}
      >
        {label}
      </Text>
    </NativePressable>
  );
}

/**
 * Своя панель вкладок: стандартная добавляет боковые отступы и обрезает «Упражнения».
 * Анимации и вибрации нет намеренно: вкладки переключают сотни раз.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets, accessory }: TabBarProps) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.background }}>
      {accessory}
      <View
        accessibilityRole="tablist"
        style={[styles.cells, { borderTopColor: colors.border, height: layout.tabBarHeight + insets.bottom }]}
      >
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options;
          const isFocused = index === state.index;
          const handlePress = () => {
            const pressEvent = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !pressEvent.defaultPrevented) navigateToTab(route.key);
          };
          return (
            <TabCell
              key={route.key}
              label={options?.title ?? route.name}
              isFocused={isFocused}
              icon={options?.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? colors.onAccent : colors.textMuted,
                size: TAB_ICON_SIZE,
              })}
              onPress={handlePress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  cell: { flex: 1, alignItems: 'center', paddingTop: spacing.sm },
  iconStroke: {
    width: 56,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { marginTop: spacing.xs, fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
  labelFocused: { fontFamily: fonts.semibold },
});
