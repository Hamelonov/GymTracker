import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Pressable, Text, spacing, useColors } from '@/ui';
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
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Pressable onPress={onMinimizePress} hitSlop={10} style={styles.minimizeButton} haptic="selection">
        {isEditing ? <Icon icon={ArrowLeft} size={24} /> : <Icon icon={ChevronDown} size={26} />}
      </Pressable>
      <Pressable style={styles.nameColumn} onPress={onNamePress}>
        <WorkoutName
          variant="h3"
          numberOfLines={1}
          align="center"
          name={workoutName || translate('workout.defaultName')}
        />
        {dateText != null ? (
          <Text variant="caption" color="muted">
            {dateText}
          </Text>
        ) : null}
      </Pressable>
      <Button title={finishButtonTitle} size="sm" onPress={onFinishPress} disabled={!canFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameColumn: { flex: 1, alignItems: 'center' },
  minimizeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
