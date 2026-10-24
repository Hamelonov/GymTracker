import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Sheet, spacing } from '@/ui';
import { WorkoutStats } from '../WorkoutStats';

interface FinishWorkoutSheetProps {
  visible: boolean;
  onClose: () => void;
  startedAt: number;
  /** Fixed duration when editing a finished workout; undefined keeps the live timer. */
  durationSec: number | undefined;
  exerciseCount: number;
  setCount: number;
  onFinishPress: () => void;
}

/** Last look at the workout stats before saving it. */
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
