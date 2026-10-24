import { FlashList } from '@shopify/flash-list';
import { Check, Plus, Search, X } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable as NativePressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { exerciseName, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { useQuery } from '@/db/version';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import {
  Chip,
  EmptyState,
  FastPressable,
  Icon,
  Pressable,
  Text,
  fonts,
  radius,
  spacing,
  useColors,
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
  initial: string;
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
      <View
        style={[
          styles.avatar,
          { backgroundColor: item.exercise.isCustom ? colors.accentSoft : colors.surfaceAlt },
        ]}
      >
        <Text variant="h3">{item.initial}</Text>
      </View>
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
        initial: name.slice(0, 1).toUpperCase(),
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
    <FlashList
      data={visibleItems}
      keyExtractor={(item) => item.exercise.id}
      keyboardShouldPersistTaps="handled"
      extraData={selectedIds}
      contentContainerStyle={{ paddingBottom: bottomPadding + spacing.xxl }}
      ListHeaderComponent={
        <View>
          {header}
          <View style={[styles.searchBox, { backgroundColor: colors.inputBackground }]}>
            <Icon icon={Search} size={18} color="faint" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={translate('exercise.searchPlaceholder')}
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.accent}
              style={[styles.searchInput, { color: colors.text }]}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchText ? (
              <NativePressable onPress={() => setSearchText('')} hitSlop={10}>
                <Icon icon={X} size={18} color="muted" />
              </NativePressable>
            ) : null}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.muscleChips}
            keyboardShouldPersistTaps="handled"
          >
            <Chip
              label={translate('common.all')}
              selected={muscleFilter == null}
              onPress={() => setMuscleFilter(null)}
            />
            {MUSCLE_GROUPS.map((muscle) => (
              <Chip
                key={muscle}
                label={translate(`muscles.${muscle}`)}
                selected={muscleFilter === muscle}
                onPress={() => setMuscleFilter(muscleFilter === muscle ? null : muscle)}
              />
            ))}
          </ScrollView>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
  },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 0 },
  muscleChips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
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
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
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
