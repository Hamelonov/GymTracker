import { ChevronRight } from 'lucide-react-native';
import React, { useRef } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { FastPressable } from './FastPressable';
import { Icon } from './Icon';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { layout, spacing } from './tokens';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  tone?: 'danger';
}

// Шторка уезжает ещё 140 мс после нажатия, и второй тап по той же строке повторил бы действие.
const DOUBLE_PRESS_GUARD_MS = 400;

export function ListItem({
  title,
  subtitle,
  left,
  right,
  chevron,
  onPress,
  onLongPress,
  style,
  compact,
  tone,
}: ListItemProps) {
  const colors = useColors();
  const lastPressTime = useRef(0);
  const row = (
    <View style={[styles.row, compact ? styles.compact : null, style]}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.textColumn}>
        <Text variant="bodyMedium" numberOfLines={1} color={tone === 'danger' ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
      {chevron ? <Icon icon={ChevronRight} size={20} color="faint" /> : null}
    </View>
  );

  const isPressable = onPress || onLongPress;
  if (!isPressable) return row;

  const handlePress = () => {
    const now = Date.now();
    if (now - lastPressTime.current < DOUBLE_PRESS_GUARD_MS) return;
    lastPressTime.current = now;
    onPress?.();
  };

  return (
    <FastPressable
      onPress={handlePress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? { backgroundColor: colors.pressed } : null)}
    >
      {row}
    </FastPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: layout.rowMinHeight,
  },
  compact: { paddingVertical: spacing.sm, minHeight: layout.rowCompactMinHeight },
  left: { alignItems: 'center', justifyContent: 'center' },
  textColumn: { flex: 1 },
  subtitle: { marginTop: spacing.xxs },
  right: { flexShrink: 1 },
});
