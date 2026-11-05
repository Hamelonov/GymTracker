import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface ListGroupProps {
  children: React.ReactNode;
  /** С какого места начинается линия: 16 от края, 48 под текстом, если слева значок. */
  dividerInset?: number;
  style?: StyleProp<ViewStyle>;
}

/** Блок строк с линиями между ними: заменяет `Card padded={false}` и ручные разделители. */
export function ListGroup({ children, dividerInset = spacing.lg, style }: ListGroupProps) {
  const colors = useColors();
  return (
    <View style={[styles.group, { backgroundColor: colors.surface }, style]}>
      {React.Children.toArray(children).map((child, index) => (
        <React.Fragment key={React.isValidElement(child) ? child.key : index}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: colors.border, marginLeft: dividerInset }]} />
          ) : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth },
});
