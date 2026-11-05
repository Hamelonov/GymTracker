import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, FastPressable, IconButton, Text, layout, radius, spacing, useColors } from '@/ui';
import { WorkoutName } from './WorkoutName';

interface ActiveWorkoutHeaderProps {
  workoutName: string;
  /** Дата тренировки, показывается под названием только при редактировании завершённой тренировки. */
  dateText: string | null;
  /** Правка завершённой тренировки открыта как обычная страница: кнопка слева — «назад», а не «свернуть». */
  isEditing: boolean;
  finishButtonTitle: string;
  canFinish: boolean;
  onMinimizePress: () => void;
  onNamePress: () => void;
  onFinishPress: () => void;
}

/** Верхняя панель активной тренировки: свернуть или назад, название тренировки (нажимается), кнопка завершения. */
export function ActiveWorkoutHeader({
  workoutName,
  dateText,
  isEditing,
  finishButtonTitle,
  canFinish,
  onMinimizePress,
  onNamePress,
  onFinishPress,
}: ActiveWorkoutHeaderProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();

  return (
    <View style={styles.header}>
      <IconButton
        icon={isEditing ? ArrowLeft : ChevronDown}
        size={24}
        label={translate(isEditing ? 'common.back' : 'workout.minimize')}
        onPress={onMinimizePress}
        haptic="selection"
        style={styles.leadingButton}
      />
      <FastPressable
        onPress={onNamePress}
        accessibilityRole="button"
        style={({ pressed }) => [styles.nameColumn, pressed ? { backgroundColor: colors.pressed } : null]}
      >
        <WorkoutName variant="h3" numberOfLines={1} name={workoutName || translate('workout.defaultName')} />
        {dateText != null ? (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {dateText}
          </Text>
        ) : null}
      </FastPressable>
      {/* Завершение наверху намеренно: действие редкое, случайно задеть его потным пальцем не должно быть легко. */}
      <Button title={finishButtonTitle} size="sm" onPress={onFinishPress} disabled={!canFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.headerHeight,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  // Рисунок стрелки уже своей кнопки: со сдвигом он стоит на линии поля экрана.
  leadingButton: { marginLeft: -spacing.md },
  nameColumn: {
    flex: 1,
    minHeight: layout.touchTarget,
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
});
