import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useStopwatch } from '@/store/stopwatch';
import { Button, Text, fonts, spacing } from '@/ui';
import { useStopwatchElapsedMs } from '../timers';
import { formatHoursMinutesSeconds } from './formatClockTime';
import { CLOCK_FACE_HEIGHT } from './clockLayout';

/** Секундомер из шторки «Часы»: считает дальше, даже когда шторку закрыли. */
export function StopwatchPanel() {
  const { t: translate } = useTranslation();
  const { elapsedMs, isRunning } = useStopwatchElapsedMs();
  const startStopwatch = useStopwatch((state) => state.start);
  const pauseStopwatch = useStopwatch((state) => state.pause);
  const resetStopwatch = useStopwatch((state) => state.reset);
  const hasElapsedTime = elapsedMs > 0;
  const canReset = hasElapsedTime && !isRunning;

  const mainButtonTitle = getMainButtonTitle(isRunning, hasElapsedTime, translate);

  return (
    <View>
      <View style={styles.face}>
        <Text style={styles.time} tabular>
          {formatHoursMinutesSeconds(elapsedMs / 1000)}
        </Text>
      </View>
      <View style={styles.buttonsRow}>
        {canReset ? (
          <Button
            title={translate('workout.clockReset')}
            variant="secondary"
            size="lg"
            onPress={resetStopwatch}
            style={styles.button}
          />
        ) : null}
        <Button
          title={mainButtonTitle}
          variant={isRunning ? 'secondary' : 'primary'}
          size="lg"
          onPress={isRunning ? pauseStopwatch : startStopwatch}
          haptic="medium"
          style={styles.button}
        />
      </View>
    </View>
  );
}

function getMainButtonTitle(
  isRunning: boolean,
  hasElapsedTime: boolean,
  translate: (key: string) => string,
): string {
  if (isRunning) return translate('workout.clockPause');
  if (hasElapsedTime) return translate('workout.clockResume');
  return translate('workout.clockStart');
}

const styles = StyleSheet.create({
  face: {
    height: CLOCK_FACE_HEIGHT,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: { fontSize: 56, lineHeight: 64, fontFamily: fonts.bold, letterSpacing: -1 },
  buttonsRow: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
});
