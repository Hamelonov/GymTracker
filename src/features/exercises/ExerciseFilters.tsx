import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/types';
import { Chip, SearchField, spacing } from '@/ui';

interface ExerciseFiltersProps {
  searchText: string;
  onChangeSearchText: (text: string) => void;
  muscleFilter: MuscleGroup | null;
  onChangeMuscleFilter: (muscle: MuscleGroup | null) => void;
}

/** Поиск и чипы мышц: стоят над списком, а не внутри него, чтобы ввод не перерисовывал заголовок списка. */
export function ExerciseFilters({
  searchText,
  onChangeSearchText,
  muscleFilter,
  onChangeMuscleFilter,
}: ExerciseFiltersProps) {
  const { t: translate } = useTranslation();
  return (
    <View>
      <SearchField
        value={searchText}
        onChangeText={onChangeSearchText}
        placeholder={translate('exercise.searchPlaceholder')}
        style={styles.searchField}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.muscleChips}
        keyboardShouldPersistTaps="handled"
      >
        <Chip
          label={translate('common.all')}
          selected={muscleFilter == null}
          onPress={() => onChangeMuscleFilter(null)}
        />
        {MUSCLE_GROUPS.map((muscle) => (
          <Chip
            key={muscle}
            label={translate(`muscles.${muscle}`)}
            selected={muscleFilter === muscle}
            onPress={() => onChangeMuscleFilter(muscleFilter === muscle ? null : muscle)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchField: { marginHorizontal: spacing.lg },
  muscleChips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
