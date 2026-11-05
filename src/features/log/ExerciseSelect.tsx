import { FlashList } from '@shopify/flash-list';
import { Check, ChevronDown } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Icon, ListItem, Marker, Pressable, Sheet, Text, fonts, radius, spacing, useColors } from '@/ui';

export interface ExerciseSelectItem {
  id: string;
  name: string;
}

interface ExerciseSelectProps {
  items: ExerciseSelectItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Выпадающий список упражнений: поле с названием и стрелкой, по нажатию шторка со списком. */
export function ExerciseSelect({ items, selectedId, onSelect }: ExerciseSelectProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const selected = items.find((item) => item.id === selectedId);

  const chooseItem = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
    },
    [onSelect],
  );

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        haptic="selection"
        style={[styles.field, { backgroundColor: colors.surface }]}
      >
        <Text variant="bodyMedium" numberOfLines={1} style={styles.fieldLabel}>
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
        <View style={styles.list}>
          <FlashList
            data={items}
            extraData={selectedId}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ExerciseSelectRow item={item} isSelected={item.id === selectedId} onChoose={chooseItem} />
            )}
          />
        </View>
      </Sheet>
    </>
  );
}

interface ExerciseSelectRowProps {
  item: ExerciseSelectItem;
  isSelected: boolean;
  onChoose: (id: string) => void;
}

const ExerciseSelectRow = React.memo(function ExerciseSelectRow({
  item,
  isSelected,
  onChoose,
}: ExerciseSelectRowProps) {
  return (
    <ListItem
      title={item.name}
      right={
        isSelected ? (
          <Marker icon={<Icon icon={Check} size={20} color="onAccent" />} />
        ) : (
          <View style={styles.checkPlaceholder} />
        )
      }
      onPress={() => onChoose(item.id)}
    />
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  fieldLabel: { flex: 1, fontFamily: fonts.semibold },
  // Список ограничен по высоте, чтобы шторка с десятками упражнений не уезжала за экран.
  list: { height: 460 },
  listContent: { paddingBottom: spacing.lg },
  checkPlaceholder: { width: 32 },
});
