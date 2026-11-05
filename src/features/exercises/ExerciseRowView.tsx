import { Check } from 'lucide-react-native';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import { FastPressable, Icon, Text, spacing, type ThemeColors } from '@/ui';

/** Упражнение с заранее вычисленными строками, чтобы строки списка были дешёвыми для рендера. */
export interface ExerciseListItem {
  exercise: ExerciseRow;
  name: string;
  subtitle: string;
}

const THUMBNAIL_SIZE = 44;
// Линия начинается под текстом: 16 поле, 44 плитка, 12 промежуток.
const DIVIDER_INSET = spacing.lg + THUMBNAIL_SIZE + spacing.md;

interface ExerciseRowViewProps {
  item: ExerciseListItem;
  isSelected: boolean;
  isSelectable: boolean;
  colors: ThemeColors;
  onPress: (exercise: ExerciseRow) => void;
}

/** Одна строка. Обычная нажимаемая область без анимаций: список рисует много таких строк. */
export const ExerciseRowView = memo(function ExerciseRowView({
  item,
  isSelected,
  isSelectable,
  colors,
  onPress,
}: ExerciseRowViewProps) {
  return (
    <FastPressable
      onPress={() => onPress(item.exercise)}
      style={({ pressed }) => [
        styles.row,
        isSelected ? { backgroundColor: colors.accentSoft } : null,
        pressed ? { backgroundColor: colors.pressed } : null,
      ]}
    >
      <MuscleThumbnail
        primary={item.exercise.muscleGroup}
        secondary={item.exercise.secondaryMuscles}
        size={THUMBNAIL_SIZE}
      />
      <View style={styles.textColumn}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      {isSelectable ? (
        <View
          style={[
            styles.checkCircle,
            isSelected
              ? { backgroundColor: colors.accent }
              : { borderWidth: 2, borderColor: colors.borderStrong },
          ]}
        >
          {isSelected ? <Icon icon={Check} size={16} color="onAccent" strokeWidth={3} /> : null}
        </View>
      ) : null}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </FastPressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  textColumn: { flex: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    position: 'absolute',
    bottom: 0,
    left: DIVIDER_INSET,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
