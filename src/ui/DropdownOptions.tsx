import { Check } from 'lucide-react-native';
import React from 'react';
import { Pressable as NativePressable, ScrollView, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { spacing } from './tokens';

export interface DropdownItem {
  id: string;
  name: string;
}

interface DropdownOptionsProps {
  items: DropdownItem[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}

const OPTION_ROW_HEIGHT = 44;
// Сколько строк оставить над выбранной: как у <select>, она видна сразу, а не где-то внизу списка.
const ROWS_ABOVE_SELECTED = 2;

/** Прокручиваемые строки выпадающего списка с галочкой у выбранных. */
export function DropdownOptions({ items, selectedIds, onSelect }: DropdownOptionsProps) {
  const colors = useColors();
  const firstSelectedIndex = items.findIndex((item) => selectedIds.includes(item.id));
  const initialOffset = Math.max(0, firstSelectedIndex - ROWS_ABOVE_SELECTED) * OPTION_ROW_HEIGHT;

  return (
    <ScrollView
      contentOffset={{ x: 0, y: initialOffset }}
      persistentScrollbar
      // Список бывает внутри прокручиваемой страницы: без этого Android листает страницу, а не его.
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {items.map((item) => (
        <NativePressable
          key={item.id}
          onPress={() => onSelect(item.id)}
          style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.surfaceAlt } : null]}
        >
          <Text variant="bodyMedium" numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          {selectedIds.includes(item.id) ? <Icon icon={Check} size={18} /> : null}
        </NativePressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: OPTION_ROW_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  name: { flex: 1 },
});
