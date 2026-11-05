import React from 'react';
import { Switch } from 'react-native';
import { ListItem, useColors } from '@/ui';

interface SettingSwitchRowProps {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Строка списка настроек с переключателем справа. */
export function SettingSwitchRow({ title, value, onChange, disabled }: SettingSwitchRowProps) {
  const colors = useColors();
  // Включённый бегунок чёрный на жёлтой дорожке, выключенный белый на серой.
  const thumbColor = value ? colors.onAccent : colors.white;
  return (
    <ListItem
      title={title}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ true: colors.accent, false: colors.borderStrong }}
          thumbColor={thumbColor}
        />
      }
    />
  );
}
