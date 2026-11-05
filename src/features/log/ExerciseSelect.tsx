import { Check, ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, ListItem, Pressable, Sheet, Text, radius, spacing, useColors } from '@/ui';

export interface ExerciseSelectItem {
  id: string;
  name: string;
}

interface ExerciseSelectProps {
  items: ExerciseSelectItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Выпадающий список упражнений: поле с названием и стрелкой, по нажатию — шторка со списком. */
export function ExerciseSelect({ items, selectedId, onSelect }: ExerciseSelectProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const selected = items.find((item) => item.id === selectedId);

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        haptic="selection"
        style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text variant="h3" numberOfLines={1} style={styles.fieldLabel}>
          {selected?.name ?? translate('log.selectExercise')}
        </Text>
        <Icon icon={ChevronDown} size={20} color="muted" />
      </Pressable>

      <Sheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={translate('log.selectExercise')}
        unpadded
      >
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {items.map((item) => (
            <ListItem
              key={item.id}
              title={item.name}
              right={
                item.id === selectedId ? (
                  <Icon icon={Check} size={18} />
                ) : (
                  <View style={styles.checkPlaceholder} />
                )
              }
              onPress={() => {
                onSelect(item.id);
                setIsOpen(false);
              }}
            />
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: { flex: 1 },
  // Список ограничен по высоте, чтобы шторка с десятками упражнений не уезжала за экран.
  list: { maxHeight: 460 },
  listContent: { paddingBottom: spacing.lg },
  checkPlaceholder: { width: 18 },
});
