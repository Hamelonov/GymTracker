import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatDuration, unitLabels } from '@/domain/units';
import { Button, Sheet, Text, WheelPicker, spacing } from '@/ui';

const REST_STEP_SECONDS = 15;
const MAX_REST_SECONDS = 10 * 60;
const SECONDS_IN_MINUTE = 60;

/** 0 («Выкл»), 15, 30 … 600 секунд: шаг барабана такой же, как у кнопок «−15 / +15» у таймера. */
const REST_OPTIONS_IN_SECONDS = Array.from(
  { length: MAX_REST_SECONDS / REST_STEP_SECONDS + 1 },
  (_, step) => step * REST_STEP_SECONDS,
);

/** Подпись строки барабана: «45 s», «3 min 0 s» — минуты и секунды всегда вместе. */
function formatRestOption(seconds: number, offLabel: string): string {
  if (seconds === 0) return offLabel;
  if (seconds < SECONDS_IN_MINUTE) return `${seconds} ${unitLabels.s}`;
  const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
  return `${minutes} ${unitLabels.m} ${seconds % SECONDS_IN_MINUTE} ${unitLabels.s}`;
}

/** Ближайшая строка барабана к текущему отдыху: отдых, не кратный 15 секундам, не должен ломать барабан. */
function nearestOptionIndex(seconds: number): number {
  const index = Math.round(seconds / REST_STEP_SECONDS);
  return Math.min(REST_OPTIONS_IN_SECONDS.length - 1, Math.max(0, index));
}

interface RestTimerPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Название упражнения, для которого выбирается отдых; показывается под заголовком. */
  exerciseName?: string;
  /** Отдых, используемый упражнением сейчас, или null, если упражнение не выбрано. */
  selectedSeconds: number | null;
  defaultRestSeconds: number;
  /** Вызывается с выбранным отдыхом или с null, чтобы вернуться к отдыху по умолчанию. */
  onRestSelect: (seconds: number | null) => void;
}

/**
 * Выбор отдыха для одного упражнения: барабан с шагом 15 секунд и кнопка «Готово».
 * Выбранное значение применяется только по «Готово»; отдельная кнопка возвращает отдых по умолчанию.
 */
export function RestTimerPickerSheet({
  visible,
  onClose,
  exerciseName,
  selectedSeconds,
  defaultRestSeconds,
  onRestSelect,
}: RestTimerPickerSheetProps) {
  const { t: translate } = useTranslation();
  const startSeconds = selectedSeconds ?? defaultRestSeconds;
  // Выбор живёт в шторке до «Готово»; при каждом открытии он начинается с отдыха упражнения.
  const [pendingSeconds, setPendingSeconds] = useState(startSeconds);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPendingSeconds(startSeconds);
  }

  const offLabel = translate('workout.restOff');
  const optionLabels = useMemo(
    () => REST_OPTIONS_IN_SECONDS.map((seconds) => formatRestOption(seconds, offLabel)),
    [offLabel],
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.restTimer')}>
      {exerciseName ? (
        <Text variant="caption" color="muted" style={styles.exerciseName}>
          {exerciseName}
        </Text>
      ) : null}
      <View style={styles.wheelRow}>
        <WheelPicker
          items={optionLabels}
          selectedIndex={nearestOptionIndex(startSeconds)}
          onSelect={(index) => setPendingSeconds(REST_OPTIONS_IN_SECONDS[index] ?? 0)}
        />
      </View>
      <Button
        title={translate('common.done')}
        size="lg"
        fullWidth
        onPress={() => onRestSelect(pendingSeconds)}
        haptic="medium"
        style={styles.doneButton}
      />
      <Button
        title={translate('workout.restDefault', { sec: formatDuration(defaultRestSeconds) })}
        variant="ghost"
        fullWidth
        onPress={() => onRestSelect(null)}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  exerciseName: { marginBottom: spacing.sm },
  wheelRow: { flexDirection: 'row', marginBottom: spacing.md },
  doneButton: { marginBottom: spacing.xs },
});
