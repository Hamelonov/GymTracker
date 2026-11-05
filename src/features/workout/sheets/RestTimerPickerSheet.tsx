import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatDuration } from '@/domain/units';
import { Button, Pressable, Sheet, Text, radius, spacing, useColors } from '@/ui';

const REST_OPTIONS_IN_SECONDS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

interface RestTimerPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Отдых, используемый упражнением сейчас, или null, если упражнение не выбрано. */
  selectedSeconds: number | null;
  defaultRestSeconds: number;
  /** Вызывается с выбранным отдыхом или с null, чтобы вернуться к отдыху по умолчанию. */
  onRestSelect: (seconds: number | null) => void;
}

/** Сетка длительностей отдыха для одного упражнения и кнопка для отдыха по умолчанию. */
export function RestTimerPickerSheet({
  visible,
  onClose,
  selectedSeconds,
  defaultRestSeconds,
  onRestSelect,
}: RestTimerPickerSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.restTimer')}>
      <View style={styles.restOptionsGrid}>
        {REST_OPTIONS_IN_SECONDS.map((seconds) => {
          const isSelected = selectedSeconds === seconds;
          return (
            <Pressable
              key={seconds}
              haptic="selection"
              onPress={() => onRestSelect(seconds)}
              style={[styles.restOption, { backgroundColor: isSelected ? colors.text : colors.surfaceAlt }]}
            >
              <Text variant="bodyMedium" color={isSelected ? colors.background : colors.text} tabular>
                {seconds === 0 ? translate('workout.restOff') : formatDuration(seconds)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        title={translate('workout.restDefault', { sec: formatDuration(defaultRestSeconds) })}
        variant="ghost"
        fullWidth
        onPress={() => onRestSelect(null)}
        style={{ marginTop: spacing.md }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  restOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  restOption: {
    width: '30%',
    flexGrow: 1,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
