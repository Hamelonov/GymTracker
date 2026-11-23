import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useRestTimer } from '@/store/restTimer';
import { Button, Pressable, Text, fonts, radius, spacing, useColors } from '@/ui';
import { useRestCountdown } from '../timers';
import { formatMinutesSeconds } from './formatClockTime';
import { CLOCK_FACE_HEIGHT } from './clockLayout';

const TIMER_STEP_SECONDS = 15;
const DEFAULT_TIMER_SECONDS = 60;
const MAX_TIMER_SECONDS = 59 * 60 + 45;
const RING_DIAMETER = 240;

/**
 * Таймер из шторки «Часы». Это тот же таймер, что и отдых между подходами: так одна полоска
 * внизу экрана, один сигнал и одно уведомление, а не два независимых таймера.
 */
export function TimerPanel() {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const { remaining, running } = useRestCountdown();
  const startTimer = useRestTimer((state) => state.start);
  const adjustTimer = useRestTimer((state) => state.adjust);
  const stopTimer = useRestTimer((state) => state.skip);
  const [selectedSeconds, setSelectedSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const shownSeconds = running ? remaining : selectedSeconds;

  const changeBy = (deltaSeconds: number) => {
    // Идущий таймер сдвигается сам, а выбранное время меняется только до запуска.
    if (running) {
      adjustTimer(deltaSeconds);
      return;
    }
    const changedSeconds = selectedSeconds + deltaSeconds;
    setSelectedSeconds(Math.min(MAX_TIMER_SECONDS, Math.max(TIMER_STEP_SECONDS, changedSeconds)));
  };

  return (
    <View>
      <View style={styles.face}>
        <View style={[styles.ring, { borderColor: colors.accent }]}>
          <Text style={styles.time} tabular>
            {formatMinutesSeconds(shownSeconds)}
          </Text>
        </View>
        <AdjustButton label={`−${TIMER_STEP_SECONDS}`} onPress={() => changeBy(-TIMER_STEP_SECONDS)} isLeft />
        <AdjustButton label={`+${TIMER_STEP_SECONDS}`} onPress={() => changeBy(TIMER_STEP_SECONDS)} />
      </View>
      <Button
        title={running ? translate('workout.clockStop') : translate('workout.clockStart')}
        variant={running ? 'secondary' : 'primary'}
        size="lg"
        fullWidth
        onPress={running ? stopTimer : () => startTimer(selectedSeconds)}
        haptic="medium"
      />
    </View>
  );
}

function AdjustButton({ label, onPress, isLeft }: { label: string; onPress: () => void; isLeft?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      style={[
        styles.adjustButton,
        isLeft ? styles.adjustLeft : styles.adjustRight,
        { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <Text variant="bodyMedium">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    height: CLOCK_FACE_HEIGHT,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: RING_DIAMETER,
    height: RING_DIAMETER,
    borderRadius: RING_DIAMETER / 2,
    borderWidth: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontSize: 56, lineHeight: 64, fontFamily: fonts.bold, letterSpacing: -1 },
  adjustButton: {
    position: 'absolute',
    bottom: 0,
    minWidth: 56,
    height: 36,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustLeft: { left: 0 },
  adjustRight: { right: 0 },
});
