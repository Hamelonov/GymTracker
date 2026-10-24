import React from 'react';
import { StyleSheet, Switch } from 'react-native';
import { ListItem, spacing, useColors } from '@/ui';

interface SettingSwitchRowProps {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A settings list row with an on/off switch on the right. */
export function SettingSwitchRow({ title, value, onChange }: SettingSwitchRowProps) {
  const colors = useColors();
  return (
    <ListItem
      title={title}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.accent, false: colors.borderStrong }}
          thumbColor={colors.background}
        />
      }
      style={styles.row}
    />
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg },
});
