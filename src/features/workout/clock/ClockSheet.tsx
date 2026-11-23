import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Segmented, Sheet, spacing } from '@/ui';
import { StopwatchPanel } from './StopwatchPanel';
import { TimerPanel } from './TimerPanel';

type ClockTab = 'timer' | 'stopwatch';

interface ClockSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Шторка «Часы» с экрана тренировки: таймер и секундомер на двух вкладках. */
export function ClockSheet({ visible, onClose }: ClockSheetProps) {
  const { t: translate } = useTranslation();
  const [tab, setTab] = useState<ClockTab>('timer');

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.clock')}>
      <Segmented
        options={[
          { value: 'timer', label: translate('workout.clockTimer') },
          { value: 'stopwatch', label: translate('workout.clockStopwatch') },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View style={{ marginTop: spacing.md }}>{tab === 'timer' ? <TimerPanel /> : <StopwatchPanel />}</View>
    </Sheet>
  );
}
