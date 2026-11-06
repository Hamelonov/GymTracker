import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { DropdownOptions, type DropdownItem } from './DropdownOptions';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

interface SelectInputProps {
  label: string;
  items: DropdownItem[];
  /** Несколько значений показываются через запятую. */
  selectedIds: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Поле формы с выбором из списка. Выглядит как Input, а список раскрывается прямо на странице,
 * сдвигая поля ниже: так он не обрезается краем прокрутки и не нужно окно поверх формы.
 */
export function SelectInput({
  label,
  items,
  selectedIds,
  isOpen,
  onToggle,
  onSelect,
  placeholder,
  containerStyle,
}: SelectInputProps) {
  const colors = useColors();
  const selectedNames = items.filter((item) => selectedIds.includes(item.id)).map((item) => item.name);
  const hasSelection = selectedNames.length > 0;

  return (
    <View style={containerStyle}>
      <Text variant="label" color="muted" style={styles.label}>
        {label.toUpperCase()}
      </Text>
      <Pressable
        onPress={onToggle}
        haptic="selection"
        debounceMs={0}
        scaleTo={1}
        style={[
          styles.field,
          { backgroundColor: colors.inputBackground, borderColor: isOpen ? colors.text : 'transparent' },
        ]}
      >
        <Text
          variant="bodyMedium"
          color={hasSelection ? 'text' : 'faint'}
          numberOfLines={1}
          style={styles.value}
        >
          {hasSelection ? selectedNames.join(', ') : placeholder}
        </Text>
        <Icon icon={isOpen ? ChevronUp : ChevronDown} size={18} color="muted" />
      </Pressable>
      {isOpen ? (
        <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <DropdownOptions items={items} selectedIds={selectedIds} onSelect={onSelect} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm, marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    // Слева чуть больше: у TextInput на Android свой отступ, и текст полей иначе не совпадает.
    paddingLeft: spacing.lg + 4,
    paddingRight: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  value: { flex: 1, fontSize: 16 },
  list: {
    maxHeight: 264,
    marginTop: spacing.xs,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
