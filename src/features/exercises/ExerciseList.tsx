import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { ExerciseRow } from '@/db/schema';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { useIsAfterFirstPaint } from '@/lib/useIsAfterFirstPaint';
import { DropdownFilterBar, spacing, useColors, type DropdownFilter } from '@/ui';
import { ExerciseListBody } from './ExerciseListBody';
import { ExerciseSearchBox } from './ExerciseSearchBox';

export interface ExerciseListProps {
  selectedIds?: Set<string>;
  onPress: (exercise: ExerciseRow) => void;
  onCreate?: () => void;
  header?: React.ReactNode;
  bottomPadding?: number;
  excludeIds?: Set<string>;
}

const ALL_MUSCLES_ID = 'all';
const MUSCLE_FIELD_WIDTH = 150;
// Список шире поля: длинным названиям мышц в поле тесно рядом с галочкой.
const MUSCLE_LIST_WIDTH = 200;

/** Поиск, фильтр по мышце и список упражнений. Сам список строится после перехода на экран. */
export function ExerciseList({
  selectedIds,
  onPress,
  onCreate,
  header,
  bottomPadding = 0,
  excludeIds,
}: ExerciseListProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [isListLoaded, setIsListLoaded] = useState(false);
  // Запросы и подготовка сотен строк занимают заметное время. Если делать их до анимации перехода,
  // нажатие «висит» и экран открывается рывком, поэтому сначала открываем экран, а список строим следом.
  const isListReady = useIsAfterFirstPaint();

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
      <View style={styles.listArea}>
        {isListReady ? (
          <ExerciseListBody
            searchText={searchText}
            muscleFilter={muscleFilter}
            selectedIds={selectedIds}
            excludeIds={excludeIds}
            onPress={onPress}
            onCreate={onCreate}
            header={header}
            bottomPadding={bottomPadding}
            onLoad={() => setIsListLoaded(true)}
          />
        ) : null}
        {/* Загрузчик крутится на стороне системы, поэтому не замирает, пока JavaScript готовит строки. */}
        {isListLoaded ? null : (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        )}
      </View>
    </DropdownFilterBar>
  );
}

const styles = StyleSheet.create({
  listArea: { flex: 1 },
  loader: { ...StyleSheet.absoluteFill, alignItems: 'center', paddingTop: spacing.xxl * 2 },
});
