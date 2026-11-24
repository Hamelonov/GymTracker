import { Check } from 'lucide-react-native';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import type { MuscleGroup } from '@/domain/types';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import { FastPressable, Icon, Text, spacing, type ThemeColors } from '@/ui';

/**
 * Упражнение с заранее вычисленными полями: строки списка остаются дешёвыми для рендера,
 * а поиск и сортировка не пересчитывают названия при каждом нажатии клавиши.
 */
export interface ExerciseListItem {
  exercise: ExerciseRow;
  name: string;
  subtitle: string;
  usageCount: number;
  // Название в нижнем регистре: по нему сортируем без медленного Intl.Collator.
  sortKey: string;
  // Оба названия (английское и русское) в нижнем регистре одной строкой для поиска.
  searchHaystack: string;
}

/** Стабильная пустая ссылка для мемоизированных строк списка. */
const NO_SECONDARY_MUSCLES: MuscleGroup[] = [];

interface ExerciseRowViewProps {
  item: ExerciseListItem;
  isSelected: boolean;
  isSelectable: boolean;
  colors: ThemeColors;
  onPress: (exercise: ExerciseRow) => void;
}

/** Одна строка. Обычный RN Pressable: список рендерит много таких строк, и они должны быть дешёвыми. */
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
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <MuscleThumbnail
        primary={item.exercise.muscleGroup}
        // В длинном списке превью рисует только основную мышцу: SVG-тело в каждой строке дорогое.
        secondary={NO_SECONDARY_MUSCLES}
        size={44}
      />
      <View style={styles.rowText}>
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
            {
              borderColor: isSelected ? colors.text : colors.borderStrong,
              backgroundColor: isSelected ? colors.text : 'transparent',
            },
          ]}
        >
          {isSelected ? <Icon icon={Check} size={14} color={colors.background} strokeWidth={3} /> : null}
        </View>
      ) : null}
    </FastPressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  rowText: { flex: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
