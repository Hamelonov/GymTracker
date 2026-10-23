import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { radius, spacing } from './tokens';

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
  titleColor?: string;
}

export function ListItem({ title, subtitle, left, right, chevron, onPress, onLongPress, style, compact, titleColor }: ListItemProps) {
  const body = (
    <View style={[styles.row, compact ? styles.compact : null, style]}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.body}>
        <Text variant="bodyMedium" numberOfLines={1} color={titleColor}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={2} style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Icon icon={ChevronRight} size={18} color="faint" /> : null}
    </View>
  );
  if (!onPress && !onLongPress) return body;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} scaleTo={0.985} style={{ borderRadius: radius.md }}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, minHeight: 56 },
  compact: { paddingVertical: spacing.sm, minHeight: 44 },
  left: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
});
