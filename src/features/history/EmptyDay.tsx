import { CalendarDays } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, spacing } from '@/ui';

interface EmptyDayProps {
  onLogWorkout: () => void;
}

/** День без тренировок: пустой календарь, подпись и кнопка, которая открывает ввод тренировки на этот день. */
export function EmptyDay({ onLogWorkout }: EmptyDayProps) {
  const { t: translate } = useTranslation();
  return (
    <View style={styles.container}>
      <Icon icon={CalendarDays} size={72} color="faint" strokeWidth={1.5} />
      <Text variant="h3" color="muted" align="center">
        {translate('history.noWorkoutsOnDay')}
      </Text>
      <Button title={translate('history.logWorkout')} fullWidth onPress={onLogWorkout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xxl * 2 },
});
