import { FlashList } from '@shopify/flash-list';
import { Check, Plus, Search } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { useQuery } from '@/db/version';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import { ExerciseSearchBox } from './ExerciseSearchBox';
import {
  DropdownFilterBar,
  EmptyState,
  FastPressable,
  Icon,
  Pressable,
  Text,
  spacing,
  useColors,
  type DropdownFilter,
  type ThemeColors,
} from '@/ui';

export interface ExerciseListProps {
  selectedIds?: Set<string>;
  onPress: (exercise: ExerciseRow) => void;
  onCreate?: () => void;
  header?: React.ReactNode;
  bottomPadding?: number;
  excludeIds?: Set<string>;
}

/** Упражнение с заранее вычисленными строками для отображения, чтобы строки списка были дешёвыми для рендера. */
interface ExerciseListItem {
  exercise: ExerciseRow;
  name: string;
  subtitle: string;
}

const ALL_MUSCLES_ID = 'all';
const MUSCLE_FIELD_WIDTH = 150;
// Список шире поля: длинным названиям мышц в поле тесно рядом с галочкой.
const MUSCLE_LIST_WIDTH = 200;

/** Стабильная пустая ссылка для мемоизированных строк списка. */
const NO_SECONDARY_MUSCLES: MuscleGroup[] = [];

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

interface ExerciseRowViewProps {
  item: ExerciseListItem;
  isSelected: boolean;
  isSelectable: boolean;
  colors: ThemeColors;
  onPress: (exercise: ExerciseRow) => void;
}

/** Одна строка. Обычный RN Pressable: список рендерит много таких строк, и они должны быть дешёвыми. */
const ExerciseRowView = memo(function ExerciseRowView({
  item,
  isSelected,
  isSelectable,
  colors,
  onPress,
}: ExerciseRowViewProps) {
  return (
    <FastPressable
      onPress={() => onPress(item.exercise)}
      style={({ pressed }) => [
        styles.row,
        isSelected ? { backgroundColor: colors.accentSoft } : null,
        pressed ? { opacity: 0.7 } : null,
      ]}
    >
      <MuscleThumbnail
        primary={item.exercise.muscleGroup}
        // В длинном списке превью рисует только основную мышцу: SVG-тело в каждой строке дорогое.
        secondary={NO_SECONDARY_MUSCLES}
        size={44}
      />
      <View style={styles.rowText}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      {isSelectable ? (
        <View
          style={[
            styles.checkCircle,
            {
              borderColor: isSelected ? colors.text : colors.borderStrong,
              backgroundColor: isSelected ? colors.text : 'transparent',
            },
          ]}
        >
          {isSelected ? <Icon icon={Check} size={14} color={colors.background} strokeWidth={3} /> : null}
        </View>
      ) : null}
    </FastPressable>
  );
});

export function ExerciseList({
  selectedIds,
  onPress,
  onCreate,
  header,
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

  const muscleDropdown: DropdownFilter = {
    key: 'muscle',
    items: [
      { id: ALL_MUSCLES_ID, name: translate('exercise.allMuscles') },
      ...MUSCLE_GROUPS.map((muscle) => ({ id: muscle, name: translate(`muscles.${muscle}`) })),
    ],
    selectedId: muscleFilter ?? ALL_MUSCLES_ID,
    fieldWidth: MUSCLE_FIELD_WIDTH,
    listWidth: MUSCLE_LIST_WIDTH,
    onSelect: (id) => setMuscleFilter(MUSCLE_GROUPS.find((muscle) => muscle === id) ?? null),
  };

  return (
    <DropdownFilterBar
      filters={[muscleDropdown]}
      leading={<ExerciseSearchBox value={searchText} onChange={setSearchText} />}
    >
      <FlashList
        data={visibleItems}
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
    </DropdownFilterBar>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  rowText: { flex: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
