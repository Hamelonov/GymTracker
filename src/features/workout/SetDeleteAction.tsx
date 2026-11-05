import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Icon, Pressable, layout, radius, spacing, useColors } from '@/ui';

interface SetDeleteActionProps {
  progress: SharedValue<number>;
  onPress: () => void;
}

/** Кнопка удаления, которая открывается свайпом строки подхода влево. */
export function SetDeleteAction({ progress, onPress }: SetDeleteActionProps) {
  const colors = useColors();
  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View style={fadeInStyle}>
      <Pressable
        onPress={onPress}
        style={[styles.deleteButton, { backgroundColor: colors.danger }]}
        haptic="medium"
      >
        <Icon icon={Trash2} size={20} color={colors.background} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    width: 72,
    height: layout.setCellHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    marginRight: spacing.lg,
    borderRadius: radius.sm,
  },
});
