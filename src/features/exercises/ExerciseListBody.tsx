import { FlashList } from '@shopify/flash-list';
import { Plus, Search } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { useQuery } from '@/db/version';
import { EQUIPMENT, MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { EmptyState, Icon, Pressable, Text, spacing, useColors } from '@/ui';
import { ExerciseRowView, type ExerciseListItem } from './ExerciseRowView';

interface ExerciseListBodyProps {
  searchText: string;
  muscleFilter: MuscleGroup | null;
  selectedIds?: Set<string>;
  excludeIds?: Set<string>;
  onPress: (exercise: ExerciseRow) => void;
  onCreate?: () => void;
  header?: React.ReactNode;
  bottomPadding: number;
  /** Вызывается, когда список впервые нарисовал строки: после этого загрузчик можно убрать. */
  onLoad?: () => void;
}

function compareByName(first: ExerciseListItem, second: ExerciseListItem): number {
  if (first.sortKey < second.sortKey) return -1;
  if (first.sortKey > second.sortKey) return 1;
  return 0;
}

/** Сначала самые используемые упражнения, затем по алфавиту. */
function compareByUsageThenName(first: ExerciseListItem, second: ExerciseListItem): number {
  if (first.usageCount !== second.usageCount) return second.usageCount - first.usageCount;
  return compareByName(first, second);
}

/**
 * Сам список: запросы к базе, подготовка строк, фильтры и прокрутка. Он отделён от оболочки,
 * чтобы экран мог открыться сразу, а эта тяжёлая часть строилась уже после анимации перехода.
 */
export function ExerciseListBody({
  searchText,
  muscleFilter,
  selectedIds,
  excludeIds,
  onPress,
  onCreate,
  header,
  bottomPadding,
  onLoad,
}: ExerciseListBodyProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const allExercises = useQuery(() => listExercises(), []);
  const usageByExerciseId = useQuery(() => getExerciseUsage(), []);
  const language = i18n.language;

  // Подписи мышц и оборудования переводим один раз на язык, а не по два вызова перевода на каждое из сотен упражнений.
  const labels = useMemo(
    () => ({
      muscles: Object.fromEntries(MUSCLE_GROUPS.map((muscle) => [muscle, translate(`muscles.${muscle}`)])),
      equipment: Object.fromEntries(EQUIPMENT.map((item) => [item, translate(`equipment.${item}`)])),
    }),
    // translate меняется вместе с языком, поэтому отдельно язык в зависимостях не нужен.
    [translate],
  );

  // Строки и порядок по умолчанию считаем один раз при смене данных или языка.
  const sortedItems = useMemo<ExerciseListItem[]>(() => {
    const items = allExercises.map((exercise) => {
      const name = exerciseName(exercise, language);
      const usageCount = usageByExerciseId.get(exercise.id)?.count ?? 0;
      const usageSuffix = usageCount > 0 ? ` · ${usageCount}×` : '';
      return {
        exercise,
        name,
        subtitle: `${labels.muscles[exercise.muscleGroup]} · ${labels.equipment[exercise.equipment]}${usageSuffix}`,
        usageCount,
        sortKey: name.toLowerCase(),
        searchHaystack: `${exercise.nameEn}\n${exercise.nameRu}`.toLowerCase(),
      };
    });
    items.sort(compareByUsageThenName);
    return items;
  }, [allExercises, usageByExerciseId, language, labels]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const filteredItems = sortedItems.filter(({ exercise, searchHaystack }) => {
      if (excludeIds?.has(exercise.id)) return false;
      if (muscleFilter) {
        const worksFilteredMuscle =
          exercise.muscleGroup === muscleFilter || exercise.secondaryMuscles.includes(muscleFilter);
        if (!worksFilteredMuscle) return false;
      }
      // Ищем по обоим языкам, чтобы название находилось независимо от языка интерфейса.
      return !normalizedSearch || searchHaystack.includes(normalizedSearch);
    });
    // Во время поиска порядок по использованию менее полезен, чем обычный алфавитный.
    if (normalizedSearch) filteredItems.sort(compareByName);
    return filteredItems;
  }, [sortedItems, searchText, muscleFilter, excludeIds]);

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
    <FlashList
      data={visibleItems}
      onLoad={onLoad}
      // Запас отрисовки вперёд больше стандартного, чтобы быстрая прокрутка не показывала пустые строки.
      drawDistance={600}
      keyExtractor={(item) => item.exercise.id}
      keyboardShouldPersistTaps="handled"
      extraData={selectedIds}
      contentContainerStyle={{ paddingBottom: bottomPadding + spacing.xxl }}
      ListHeaderComponent={
        <View>
          {header}
          {onCreate ? (
            <Pressable onPress={onCreate} style={styles.createRow} haptic="light">
              <View style={[styles.createIcon, { backgroundColor: colors.accent }]}>
                <Icon icon={Plus} size={18} color="onAccent" strokeWidth={2.5} />
              </View>
              <Text variant="bodyMedium">{translate('exercise.create')}</Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={<EmptyState icon={Search} title={translate('common.noResults')} />}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
  },
  createIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
