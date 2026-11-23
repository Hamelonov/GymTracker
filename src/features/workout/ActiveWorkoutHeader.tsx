import { AlarmClock, ArrowLeft, ChevronDown } from 'lucide-react-native';
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
  onClockPress: () => void;
  onFinishPress: () => void;
}

/**
 * Верхняя панель активной тренировки: свернуть или назад, рядом с ним слева название тренировки (нажимается),
 * справа будильник («Часы») и кнопка завершения.
 */
export function ActiveWorkoutHeader({
  workoutName,
  dateText,
  isEditing,
  finishButtonTitle,
  canFinish,
  onMinimizePress,
  onNamePress,
  onClockPress,
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
          align="left"
          name={workoutName || translate('workout.defaultName')}
        />
        {dateText != null ? (
          <Text variant="caption" color="muted">
            {dateText}
          </Text>
        ) : null}
      </Pressable>
      {/* Таймер и секундомер нужны только живой тренировке, а не правке уже сохранённой. */}
      {!isEditing ? (
        <Pressable onPress={onClockPress} hitSlop={6} style={styles.clockButton} haptic="selection">
          <Icon icon={AlarmClock} size={24} />
        </Pressable>
      ) : null}
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
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameColumn: { flex: 1, alignItems: 'flex-start' },
  minimizeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  clockButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
