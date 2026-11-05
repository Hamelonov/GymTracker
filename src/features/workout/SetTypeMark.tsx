import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { SetType } from '@/domain/types';
import { Text, fonts, radius, useColors } from '@/ui';

interface SetTypeMarkProps {
  type: SetType;
  /** Номер обычного подхода или буква особого типа. */
  label: string;
  /** Подход ещё не выполнен и его очередь не подошла: номер приглушён. */
  isPending?: boolean;
  /** Следующий подход: номер жирнее остальных. */
  isNextSet?: boolean;
}

/** Номер подхода или значок разминки, дропа и отказа. Одинаков в строке и в шторке выбора типа. */
export function SetTypeMark({ type, label, isPending, isNextSet }: SetTypeMarkProps) {
  const colors = useColors();
  if (type !== 'normal') {
    return (
      <View style={[styles.mark, styles.specialMark, { backgroundColor: colors.text }]}>
        <Text variant="caption" color={colors.background}>
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.mark}>
      <Text
        variant="bodyMedium"
        color={isPending ? 'muted' : 'text'}
        tabular
        style={isNextSet ? styles.nextSetNumber : null}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  specialMark: { borderRadius: radius.xs },
  nextSetNumber: { fontFamily: fonts.semibold },
});
