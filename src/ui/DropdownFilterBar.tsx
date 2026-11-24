import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable as NativePressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { DropdownOptions, type DropdownItem } from './DropdownOptions';
import { Icon } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useColors } from './ThemeProvider';
import { radius, spacing } from './tokens';

export interface DropdownFilter {
  key: string;
  items: DropdownItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Подпись поля, пока ничего не выбрано. */
  placeholder?: string;
  /** Без ширины поле занимает всё свободное место, а список — весь ряд. */
  fieldWidth?: number;
  /** Ширина списка, если названиям тесно в поле. */
  listWidth?: number;
}

interface DropdownFilterBarProps {
  filters: DropdownFilter[];
  /** Элемент в начале ряда, например поле поиска. */
  leading?: React.ReactNode;
  /** Содержимое под фильтрами: список открывается поверх него. */
  children: React.ReactNode;
  /** Выбор режима прямо в шапке экрана: плоское поле по центру и тонкая линия снизу. */
  isHeader?: boolean;
}

const LIST_MAX_HEIGHT = 320;

function SelectField({
  label,
  isOpen,
  isHeader,
  onPress,
  style,
}: {
  label: string;
  isOpen: boolean;
  isHeader: boolean;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  if (isHeader) {
    return (
      <Pressable onPress={onPress} haptic="selection" debounceMs={0} style={styles.headerField}>
        <Text variant="h3" numberOfLines={1}>
          {label}
        </Text>
        <Icon icon={isOpen ? ChevronUp : ChevronDown} size={20} />
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      debounceMs={0}
      style={[
        styles.field,
        { backgroundColor: colors.surface, borderColor: isOpen ? colors.text : colors.border },
        style,
      ]}
    >
      <Text variant="bodyMedium" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <Icon icon={isOpen ? ChevronUp : ChevronDown} size={18} color="muted" />
    </Pressable>
  );
}

function DropdownList({
  filter,
  onSelect,
  style,
}: {
  filter: DropdownFilter;
  onSelect: (id: string) => void;
  style: StyleProp<ViewStyle>;
}) {
  const colors = useColors();

  return (
    <View style={[styles.list, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, style]}>
      <DropdownOptions
        items={filter.items}
        selectedIds={filter.selectedId ? [filter.selectedId] : []}
        onSelect={onSelect}
      />
    </View>
  );
}

function getFieldStyle(filter: DropdownFilter): ViewStyle {
  return filter.fieldWidth ? { width: filter.fieldWidth } : styles.flexibleField;
}

function getListPosition(filter: DropdownFilter, isHeader: boolean, screenWidth: number): ViewStyle {
  if (!filter.fieldWidth) return styles.fullWidthList;
  const listWidth = filter.listWidth ?? filter.fieldWidth;
  if (isHeader) return { left: (screenWidth - listWidth) / 2, width: listWidth };
  return { right: spacing.lg, width: listWidth };
}

/**
 * Ряд фильтров: список открывается прямо под полем, как <select>, без шторок и окон.
 * Список лежит в том же контейнере, что и содержимое: снаружи родителя Android не отдаёт ему нажатия.
 */
export function DropdownFilterBar({ filters, leading, children, isHeader = false }: DropdownFilterBarProps) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  const [barHeight, setBarHeight] = useState(0);
  const openFilter = filters.find((filter) => filter.key === openFilterKey);
  const isListOpen = openFilter != null;
  // Список сразу под полем: нижний отступ ряда он перекрывает, чтобы не висеть в воздухе.
  // У шапки нижнего отступа нет, поэтому список начинается прямо под её линией.
  const listTop = isHeader ? barHeight : barHeight - spacing.sm + spacing.xs;

  const closeList = () => setOpenFilterKey(null);
  const toggleList = (filterKey: string) =>
    setOpenFilterKey((currentKey) => (currentKey === filterKey ? null : filterKey));

  // Кнопка «назад» закрывает список, а не уводит с экрана.
  useEffect(() => {
    if (!isListOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpenFilterKey(null);
      return true;
    });
    return () => subscription.remove();
  }, [isListOpen]);

  return (
    <View style={styles.container}>
      <View
        style={[styles.bar, isHeader ? [styles.headerBar, { borderBottomColor: colors.border }] : null]}
        onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
      >
        {leading}
        {filters.map((filter) => {
          const selectedName = filter.items.find((item) => item.id === filter.selectedId)?.name;
          return (
            <SelectField
              key={filter.key}
              label={selectedName ?? filter.placeholder ?? ''}
              isOpen={filter.key === openFilterKey}
              isHeader={isHeader}
              onPress={() => toggleList(filter.key)}
              style={getFieldStyle(filter)}
            />
          );
        })}
      </View>

      {/* Пока список открыт, содержимое не ловит жесты: иначе оно двигалось бы вместе с прокруткой списка. */}
      <View style={styles.content} pointerEvents={isListOpen ? 'none' : 'auto'}>
        {children}
      </View>

      {openFilter ? (
        <>
          <NativePressable style={[styles.backdrop, { top: barHeight }]} onPress={closeList} />
          <DropdownList
            key={openFilter.key}
            filter={openFilter}
            onSelect={(id) => {
              openFilter.onSelect(id);
              closeList();
            }}
            style={[getListPosition(openFilter, isHeader, screenWidth), { top: listTop }]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerBar: {
    minHeight: 56,
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  content: { flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flexibleField: { flex: 1 },
  label: { flex: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  list: {
    position: 'absolute',
    maxHeight: LIST_MAX_HEIGHT,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 6,
  },
  fullWidthList: { left: spacing.lg, right: spacing.lg },
});
