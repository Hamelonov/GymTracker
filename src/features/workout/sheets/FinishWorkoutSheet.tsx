import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Sheet, spacing } from '@/ui';
import { WorkoutStats } from '../WorkoutStats';

interface FinishWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  startedAt: number;
  /** Фиксированная длительность при редактировании завершённой тренировки; undefined оставляет живой таймер. */
  durationSec: number | undefined;
  exerciseCount: number;
  setCount: number;
  onFinishPress: () => void;
}

/** Последний взгляд на статистику тренировки перед сохранением. */
export function FinishWorkoutSheet({
  visible,
  onClose,
  startedAt,
  durationSec,
  exerciseCount,
  setCount,
  onFinishPress,
}: FinishWorkoutSheetProps) {
  const { t: translate } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.finishTitle')}>
      <WorkoutStats
        startedAt={startedAt}
        durationSec={durationSec}
        exerciseCount={exerciseCount}
        setCount={setCount}
        style={{ marginBottom: spacing.lg }}
      />
      <Button
        title={translate('workout.finishAndSave')}
        size="lg"
        fullWidth
        onPress={onFinishPress}
        haptic="success"
      />
    </Sheet>
  );
}
