import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { formatTime } from '@/domain/dates';
import { formatDuration, padToTwoDigits, unitLabels } from '@/domain/units';
import { Button, Pressable, Sheet, Text, WheelPicker, radius, spacing, useColors } from '@/ui';

const MAX_HOURS = 12;
const HOURS_IN_DAY = 24;
const MINUTES_IN_HOUR = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_MINUTE = 60;

type OpenSection = 'duration' | 'start' | null;

interface WorkoutTimeSheetProps {
  visible: boolean;
  onClose: () => void;
  startedAt: number;
  durationSec: number;
  onStartedAtChange: (startedAt: number) => void;
  onDurationChange: (durationSec: number) => void;
}

interface TimeRowProps {
  label: string;
  value: string;
  isOpen: boolean;
  onPress: () => void;
}

/** Строка «название — значение»: значение лежит на плашке, чтобы было видно, что его можно нажать. */
function TimeRow({ label, value, isOpen, onPress }: TimeRowProps) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} haptic="selection" style={styles.row}>
      <Text variant="h3" style={styles.rowLabel}>
        {label}
      </Text>
      <View style={[styles.valueChip, { backgroundColor: isOpen ? colors.accentSoft : colors.surfaceAlt }]}>
        <Text variant="bodyMedium" tabular>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

function DurationWheels({
  durationSec,
  onDurationChange,
}: Pick<WorkoutTimeSheetProps, 'durationSec' | 'onDurationChange'>) {
  const hourItems = useMemo(
    () => Array.from({ length: MAX_HOURS + 1 }, (_, hour) => `${hour} ${unitLabels.h}`),
    [],
  );
  const minuteItems = useMemo(
    () => Array.from({ length: MINUTES_IN_HOUR }, (_, minute) => `${minute} ${unitLabels.m}`),
    [],
  );
  const hours = Math.floor(durationSec / SECONDS_IN_HOUR);
  const minutes = Math.floor((durationSec % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);

  return (
    <View style={styles.wheels}>
      <WheelPicker
        items={hourItems}
        selectedIndex={Math.min(hours, MAX_HOURS)}
        onSelect={(hour) => onDurationChange(hour * SECONDS_IN_HOUR + minutes * SECONDS_IN_MINUTE)}
      />
      <WheelPicker
        items={minuteItems}
        selectedIndex={minutes}
        onSelect={(minute) => onDurationChange(hours * SECONDS_IN_HOUR + minute * SECONDS_IN_MINUTE)}
      />
    </View>
  );
}

function StartWheels({
  startedAt,
  onStartedAtChange,
}: Pick<WorkoutTimeSheetProps, 'startedAt' | 'onStartedAtChange'>) {
  const hourLabels = useMemo(
    () => Array.from({ length: HOURS_IN_DAY }, (_, hour) => padToTwoDigits(hour)),
    [],
  );
  const minuteLabels = useMemo(
    () => Array.from({ length: MINUTES_IN_HOUR }, (_, minute) => padToTwoDigits(minute)),
    [],
  );
  const current = new Date(startedAt);

  // День не меняется: его уже выбрали в календаре, когда открывали запись.
  const changeTime = (changes: { hour?: number; minute?: number }) => {
    const next = new Date(startedAt);
    next.setHours(changes.hour ?? current.getHours(), changes.minute ?? current.getMinutes(), 0, 0);
    onStartedAtChange(next.getTime());
  };

  return (
    <View style={styles.wheels}>
      <WheelPicker
        items={hourLabels}
        selectedIndex={current.getHours()}
        onSelect={(hour) => changeTime({ hour })}
      />
      <WheelPicker
        items={minuteLabels}
        selectedIndex={current.getMinutes()}
        onSelect={(minute) => changeTime({ minute })}
      />
    </View>
  );
}

/**
 * Шторка «Время» для тренировки, записанной задним числом: строки «Длительность» и «Начало»
 * (только время суток), по нажатию раскрывается барабан выбора. Раскрыта одна строка за раз.
 */
export function WorkoutTimeSheet({
  visible,
  onClose,
  startedAt,
  durationSec,
  onStartedAtChange,
  onDurationChange,
}: WorkoutTimeSheetProps) {
  const { t: translate } = useTranslation();
  const [openSection, setOpenSection] = useState<OpenSection>(null);

  const toggleSection = (section: Exclude<OpenSection, null>) =>
    setOpenSection((current) => (current === section ? null : section));

  return (
    <Sheet visible={visible} onClose={onClose} title={translate('workout.timeSheetTitle')}>
      <TimeRow
        label={translate('workout.durationRow')}
        value={formatDuration(durationSec, { compact: true })}
        isOpen={openSection === 'duration'}
        onPress={() => toggleSection('duration')}
      />
      {openSection === 'duration' ? (
        <DurationWheels durationSec={durationSec} onDurationChange={onDurationChange} />
      ) : null}
      <TimeRow
        label={translate('workout.startRow')}
        value={formatTime(startedAt)}
        isOpen={openSection === 'start'}
        onPress={() => toggleSection('start')}
      />
      {openSection === 'start' ? (
        <StartWheels startedAt={startedAt} onStartedAtChange={onStartedAtChange} />
      ) : null}
      <Button title={translate('common.done')} fullWidth onPress={onClose} style={styles.doneButton} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowLabel: { flexShrink: 1 },
  valueChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  wheels: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  doneButton: { marginTop: spacing.md },
});
