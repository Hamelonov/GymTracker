import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatDuration } from '@/domain/units';
import { Button, Pressable, Sheet, Text, radius, spacing, useColors } from '@/ui';

const REST_TIME_OPTIONS_SECONDS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

interface RestTimeSheetProps {
  visible: boolean;
  /** Текущий выбранный отдых; null означает, что упражнение использует время отдыха по умолчанию. */
  selectedRestSeconds: number | null | undefined;
  defaultRestSeconds: number;
  onClose: () => void;
  /** Вызывается с null, когда пользователь выбирает «по умолчанию». */
  onSelectRestSeconds: (restSeconds: number | null) => void;
}

/** Сетка длительностей отдыха для одного упражнения шаблона. */
export function RestTimeSheet({
  visible,
  selectedRestSeconds,
  defaultRestSeconds,
  onClose,
  onSelectRestSeconds,
}: RestTimeSheetProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.restTimer')}>
      <View style={styles.optionsGrid}>
        {REST_TIME_OPTIONS_SECONDS.map((seconds) => {
          const isSelected = selectedRestSeconds === seconds;
          return (
            <Pressable
              key={seconds}
              haptic="selection"
              onPress={() => onSelectRestSeconds(seconds)}
              style={[styles.option, { backgroundColor: isSelected ? colors.text : colors.surfaceAlt }]}
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
        onPress={() => onSelectRestSeconds(null)}
        style={{ marginTop: spacing.md }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    width: '30%',
    flexGrow: 1,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
