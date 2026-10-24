import { ListPlus, MessageSquarePlus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, spacing } from '@/ui';

interface AddExerciseButtonsProps {
  /** Жёлтые кнопки, пока в тренировке нет ни одного упражнения. */
  isPrimary: boolean;
  onPickFromList: () => void;
  onQuickEntry: () => void;
}

/** Ряд из двух кнопок без подписей: добавить упражнение из списка или вписать подход текстом. */
export function AddExerciseButtons({ isPrimary, onPickFromList, onQuickEntry }: AddExerciseButtonsProps) {
  const { t: translate } = useTranslation();
  const variant = isPrimary ? 'primary' : 'secondary';
  const iconColor = isPrimary ? 'onAccent' : 'text';

  return (
    <View style={styles.row}>
      <Button
        size="lg"
        variant={variant}
        icon={<Icon icon={ListPlus} size={22} color={iconColor} strokeWidth={2.5} />}
        accessibilityLabel={translate('workout.addExerciseFromList')}
        onPress={onPickFromList}
        style={styles.button}
      />
      <Button
        size="lg"
        variant={variant}
        icon={<Icon icon={MessageSquarePlus} size={22} color={iconColor} strokeWidth={2.5} />}
        accessibilityLabel={translate('workout.quickEntryTitle')}
        onPress={onQuickEntry}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  button: { flex: 1 },
});
