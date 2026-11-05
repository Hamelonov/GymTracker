import { Table2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  exerciseName,
  getExerciseHistory,
  getExerciseUsage,
  listExercises,
  type ExerciseHistoryEntry,
} from '@/db/repo/exercises';
import { useQuery } from '@/db/version';
import { ExerciseLogTable, naturalLogTableWidth } from '@/features/log/ExerciseLogTable';
import { ExerciseSelect } from '@/features/log/ExerciseSelect';
import { ZoomPanCanvas } from '@/features/log/ZoomPanCanvas';
import { useSettings } from '@/store/settings';
import { EmptyState, Screen, Text, spacing } from '@/ui';

/** Особый пункт фильтра: вместо одного упражнения показывает их все по порядку имени. */
const ALL_EXERCISES_ID = 'all';
const CANVAS_PADDING = spacing.sm;

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
  // Для пункта «Все»: те же упражнения, но по алфавиту, а не по давности.
  const exercisesByName = useMemo(
    () =>
      [...performedExercises].sort((left, right) =>
        exerciseName(left, i18n.language).localeCompare(exerciseName(right, i18n.language), i18n.language),
      ),
    [performedExercises, i18n.language],
  );
  const selectItems = useMemo(
    () => [
      { id: ALL_EXERCISES_ID, name: translate('log.allExercises') },
      ...performedExercises.map((row) => ({ id: row.id, name: exerciseName(row, i18n.language) })),
    ],
    [performedExercises, i18n.language, translate],
  );

  const [chosenExerciseId, setChosenExerciseId] = useState<string | null>(null);
  const isAllSelected = chosenExerciseId === ALL_EXERCISES_ID;
  // Пока пользователь ничего не выбрал (или выбранное исчезло), показывается самое недавнее упражнение.
  const selectedExercise = isAllSelected
    ? null
    : (performedExercises.find((row) => row.id === chosenExerciseId) ?? performedExercises[0] ?? null);
  const selectedExerciseId = isAllSelected ? ALL_EXERCISES_ID : (selectedExercise?.id ?? null);

  const history = useQuery(
    () => (selectedExercise ? getExerciseHistory(selectedExercise.id, 500) : []),
    [selectedExercise?.id],
  );
  // Для пункта «Все»: история каждого упражнения отдельно, в том же порядке, что и таблицы ниже.
  // Запрашивается только когда выбрано «Все», чтобы обычный просмотр одного упражнения не тянул историю всех.
  const historyByExerciseId = useQuery(
    () =>
      isAllSelected
        ? new Map(
            exercisesByName.map((row): [string, ExerciseHistoryEntry[]] => [
              row.id,
              getExerciseHistory(row.id, 500),
            ]),
          )
        : new Map<string, ExerciseHistoryEntry[]>(),
    [isAllSelected, exercisesByName.map((row) => row.id).join(',')],
  );
  const units = useMemo(() => ({ weight: weightUnit, distance: distanceUnit }), [weightUnit, distanceUnit]);

  if (performedExercises.length === 0 || (!selectedExercise && !isAllSelected)) {
    return (
      <Screen header={{ title: translate('log.title'), large: true }} tabScreen>
        <EmptyState icon={Table2} title={translate('log.empty')} hint={translate('log.emptyHint')} />
      </Screen>
    );
  }

  const buildShownTables = () => {
    if (isAllSelected) {
      return exercisesByName.map((row) => ({
        exercise: row,
        entries: historyByExerciseId.get(row.id) ?? [],
      }));
    }
    if (selectedExercise) return [{ exercise: selectedExercise, entries: history }];
    return [];
  };
  const shownTables = buildShownTables();
  // Все таблицы одной ширины — по самой широкой, чтобы в режиме «Все» правые края шли ровно.
  const tableWidth = Math.max(
    0,
    ...shownTables.map((table) => naturalLogTableWidth(table.entries, table.exercise.type)),
  );

  return (
    // Страница не прокручивается: внутри ScrollView жесты холста отменялись бы прокруткой.
    <Screen header={{ title: translate('log.title'), large: true }} scrollable={false} padded={false}>
      <View style={styles.filterBar}>
        <ExerciseSelect items={selectItems} selectedId={selectedExerciseId} onSelect={setChosenExerciseId} />
      </View>
      <ZoomPanCanvas key={selectedExerciseId ?? 'none'} contentWidth={tableWidth + 2 * CANVAS_PADDING}>
        <View style={styles.canvasContent}>
          {shownTables.map((table, index) => (
            <View key={table.exercise.id} style={index > 0 ? styles.nextTable : null}>
              {isAllSelected ? (
                <Text variant="h3" style={styles.exerciseTitle}>
                  {exerciseName(table.exercise, i18n.language)}
                </Text>
              ) : null}
              <ExerciseLogTable
                entries={table.entries}
                exerciseType={table.exercise.type}
                units={units}
                width={tableWidth}
              />
            </View>
          ))}
        </View>
      </ZoomPanCanvas>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBar: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  canvasContent: { padding: CANVAS_PADDING },
  nextTable: { marginTop: spacing.xl },
  exerciseTitle: { marginBottom: spacing.sm },
});
