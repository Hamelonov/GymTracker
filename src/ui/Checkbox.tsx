import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { useColors } from './ThemeProvider';

interface CheckboxProps {
  checked: boolean;
}

/** Квадратная галочка без своего обработчика: нажатие ловит строка списка, в которой она стоит. */
export function Checkbox({ checked }: CheckboxProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: checked ? colors.text : 'transparent',
          borderColor: checked ? colors.text : colors.borderStrong,
        },
      ]}
    >
      {checked ? <Icon icon={Check} size={16} color={colors.accent} strokeWidth={3} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
