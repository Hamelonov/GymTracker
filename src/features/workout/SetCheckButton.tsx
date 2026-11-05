import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable as NativePressable, StyleSheet } from 'react-native';
import { Icon, layout, radius, useColors, type ThemeColors } from '@/ui';
import { SET_COLUMN_WIDTHS } from './setRowLayout';

interface SetCheckButtonProps {
  isCompleted: boolean;
  canComplete: boolean;
  isNextSet: boolean | undefined;
  label: string | undefined;
  onPress: () => void;
}

type CheckState = 'blocked' | 'ready' | 'next' | 'completed';

// Цель доходит до края экрана: палец попадает в отметку, даже не глядя.
const CHECK_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 16 };

function getCheckState(isCompleted: boolean, canComplete: boolean, isNextSet: boolean | undefined) {
  if (isCompleted) return 'completed';
  if (!canComplete) return 'blocked';
  return isNextSet ? 'next' : 'ready';
}

function getCheckColors(state: CheckState, colors: ThemeColors) {
  const colorsByState: Record<CheckState, { background: string; icon: string }> = {
    blocked: { background: colors.surface, icon: colors.borderStrong },
    ready: { background: colors.surfaceAlt, icon: colors.text },
    next: { background: colors.text, icon: colors.background },
    completed: { background: colors.accent, icon: colors.onAccent },
  };
  return colorsByState[state];
}

/** Отметка подхода. Обычный `Pressable` и никакой анимации: цвет меняется в том же кадре, что и нажатие. */
export function SetCheckButton({ isCompleted, canComplete, isNextSet, label, onPress }: SetCheckButtonProps) {
  const colors = useColors();
  const checkColors = getCheckColors(getCheckState(isCompleted, canComplete, isNextSet), colors);
  return (
    <NativePressable
      disabled={!canComplete}
      onPress={onPress}
      hitSlop={CHECK_HIT_SLOP}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isCompleted, disabled: !canComplete }}
      style={[styles.button, { backgroundColor: checkColors.background }]}
    >
      <Icon icon={Check} size={24} color={checkColors.icon} strokeWidth={3} />
    </NativePressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SET_COLUMN_WIDTHS.checkButton,
    height: layout.setCellHeight,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
