import { Table2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName, getExerciseHistory, getExerciseUsage, listExercises } from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import { getSetFieldsForExerciseType } from '@/domain/types';
import { ExerciseLogTable } from '@/features/log/ExerciseLogTable';
import { ExerciseSelect } from '@/features/log/ExerciseSelect';
import { useSettings } from '@/store/settings';
import { EmptyState, Screen, spacing } from '@/ui';

export default function LogTab() {
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const exerciseRows = useQuery(() => listExercises({ includeArchived: true }), []);
  const usageByExerciseId = useQuery(() => getExerciseUsage(), []);

  // Только упражнения, которые хоть раз делали; недавние — первыми.
  const performedExercises = useMemo(
    () =>
      exerciseRows
        .filter((row) => usageByExerciseId.has(row.id))
        .sort(
          (left, right) =>
            (usageByExerciseId.get(right.id)?.lastAt ?? 0) - (usageByExerciseId.get(left.id)?.lastAt ?? 0),
        ),
    [exerciseRows, usageByExerciseId],
  );
  const selectItems = useMemo(
    () => performedExercises.map((row) => ({ id: row.id, name: exerciseName(row, i18n.language) })),
    [performedExercises, i18n.language],
  );

  const [chosenExerciseId, setChosenExerciseId] = useState<string | null>(null);
  // Пока пользователь ничего не выбрал (или выбранное исчезло), показывается самое недавнее упражнение.
  const selectedExercise =
    performedExercises.find((row) => row.id === chosenExerciseId) ?? performedExercises[0] ?? null;
  const selectedExerciseId = selectedExercise?.id ?? null;

  const history = useQuery(
    () => (selectedExerciseId ? getExerciseHistory(selectedExerciseId, 500) : []),
    [selectedExerciseId],
  );
  const units = useMemo(() => ({ weight: weightUnit, distance: distanceUnit }), [weightUnit, distanceUnit]);

  if (performedExercises.length === 0 || !selectedExercise) {
    return (
      <Screen header={{ title: translate('log.title'), large: true }}>
        <EmptyState icon={Table2} title={translate('log.empty')} hint={translate('log.emptyHint')} />
      </Screen>
    );
  }

  return (
    <Screen header={{ title: translate('log.title'), large: true }} contentStyle={styles.content}>
      <View style={styles.select}>
        <ExerciseSelect items={selectItems} selectedId={selectedExerciseId} onSelect={setChosenExerciseId} />
      </View>
      <ExerciseLogTable
        entries={history}
        fields={getSetFieldsForExerciseType(selectedExercise.type)}
        units={units}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  select: { marginBottom: spacing.md },
});
