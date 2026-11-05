import { FlashList } from '@shopify/flash-list';
import { Plus } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { useQuery } from '@/db/version';
import type { MuscleGroup } from '@/domain/types';
import { EmptyState, Icon, Pressable, Text, layout, radius, spacing, useColors } from '@/ui';
import { ExerciseFilters } from './ExerciseFilters';
import { ExerciseRowView, type ExerciseListItem } from './ExerciseRowView';

export interface ExerciseListProps {
  selectedIds?: Set<string>;
  onPress: (exercise: ExerciseRow) => void;
  onCreate?: () => void;
  bottomPadding?: number;
  excludeIds?: Set<string>;
}

// Создание Intl.Collator медленное, поэтому для каждого языка он кэшируется.
const collatorsByLanguage = new Map<string, Intl.Collator>();
function getCollator(language: string): Intl.Collator {
  let collator = collatorsByLanguage.get(language);
  if (!collator) {
    collator = new Intl.Collator(language, { sensitivity: 'base' });
    collatorsByLanguage.set(language, collator);
  }
  return collator;
}

export function ExerciseList({
  selectedIds,
  onPress,
  onCreate,
  bottomPadding = 0,
  excludeIds,
}: ExerciseListProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const allExercises = useQuery(() => listExercises(), []);
  const usageByExerciseId = useQuery(() => getExerciseUsage(), []);
  const language = i18n.language;

  // Заранее считаем строки для отображения и порядок по умолчанию один раз при смене данных или языка.
  const sortedItems = useMemo<ExerciseListItem[]>(() => {
    const collator = getCollator(language);
    const items = allExercises.map((exercise) => {
      const name = exerciseName(exercise, language);
      const usage = usageByExerciseId.get(exercise.id);
      const usageSuffix = usage ? ` · ${usage.count}×` : '';
      return {
        exercise,
        name,
        subtitle: `${translate(`muscles.${exercise.muscleGroup}`)} · ${translate(`equipment.${exercise.equipment}`)}${usageSuffix}`,
      };
    });
    // Сначала самые используемые упражнения, затем по алфавиту.
    items.sort((first, second) => {
      const firstUsageCount = usageByExerciseId.get(first.exercise.id)?.count ?? 0;
      const secondUsageCount = usageByExerciseId.get(second.exercise.id)?.count ?? 0;
      if (firstUsageCount !== secondUsageCount) return secondUsageCount - firstUsageCount;
      return collator.compare(first.name, second.name);
    });
    return items;
  }, [allExercises, usageByExerciseId, language, translate]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const filteredItems = sortedItems.filter(({ exercise }) => {
      if (excludeIds?.has(exercise.id)) return false;
      if (muscleFilter) {
        const worksFilteredMuscle =
          exercise.muscleGroup === muscleFilter || exercise.secondaryMuscles.includes(muscleFilter);
        if (!worksFilteredMuscle) return false;
      }
      if (!normalizedSearch) return true;
      // Ищем по обоим языкам, чтобы название находилось независимо от языка интерфейса.
      return (
        exercise.nameEn.toLowerCase().includes(normalizedSearch) ||
        exercise.nameRu.toLowerCase().includes(normalizedSearch)
      );
    });
    // Во время поиска порядок по использованию менее полезен, чем обычный алфавитный.
    if (normalizedSearch) {
      const collator = getCollator(language);
      filteredItems.sort((first, second) => collator.compare(first.name, second.name));
    }
    return filteredItems;
  }, [sortedItems, searchText, muscleFilter, excludeIds, language]);

  const isSelectable = selectedIds != null;
  const renderItem = useCallback(
    ({ item }: { item: ExerciseListItem }) => (
      <ExerciseRowView
        item={item}
        isSelected={selectedIds?.has(item.exercise.id) ?? false}
        isSelectable={isSelectable}
        colors={colors}
        onPress={onPress}
      />
    ),
    [selectedIds, isSelectable, colors, onPress],
  );

  return (
    <View style={styles.container}>
      <ExerciseFilters
        searchText={searchText}
        onChangeSearchText={setSearchText}
        muscleFilter={muscleFilter}
        onChangeMuscleFilter={setMuscleFilter}
      />
      <View style={[styles.listDivider, { backgroundColor: colors.border }]} />
      <FlashList
        data={visibleItems}
        // Запас отрисовки вперёд больше стандартного, чтобы быстрая прокрутка не показывала пустые строки.
        drawDistance={600}
        keyExtractor={(item) => item.exercise.id}
        keyboardShouldPersistTaps="handled"
        extraData={selectedIds}
        contentContainerStyle={{ paddingBottom: bottomPadding + spacing.xxl }}
        ListHeaderComponent={
          onCreate ? (
            <Pressable onPress={onCreate} style={styles.createRow} haptic="light">
              <View style={[styles.createIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Icon icon={Plus} size={20} />
              </View>
              <Text variant="bodyMedium">{translate('exercise.create')}</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={<EmptyState title={translate('common.noResults')} />}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listDivider: { height: StyleSheet.hairlineWidth },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.rowMinHeight,
    paddingHorizontal: spacing.lg,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
