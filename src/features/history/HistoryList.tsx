import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Calendar } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutSummary } from '@/db/repo/workouts';
import { EmptyState } from '@/ui';
import { HistoryMonthRow } from './HistoryMonthRow';
import { buildHistoryRows, findMonthRowForIndex, isMonthRow, type HistoryRow } from './historyRows';
import { WorkoutRow } from './WorkoutRow';

interface HistoryListProps {
  workouts: WorkoutSummary[];
  onOpenWorkout: (workoutId: string) => void;
}

/**
 * Список тренировок по месяцам. Верхняя строка месяца стоит на месте и лежит поверх списка:
 * строки месяцев уезжают под неё, а текст в ней сразу меняется. Встроенные липкие заголовки
 * FlashList выталкивают друг друга, и при быстрой прокрутке это смотрится плохо.
 */
export function HistoryList({ workouts, onOpenWorkout }: HistoryListProps) {
  const { t: translate } = useTranslation();
  const listRef = useRef<FlashListRef<HistoryRow>>(null);
  const [topMonthKey, setTopMonthKey] = useState<string | null>(null);
  const rows = useMemo(() => buildHistoryRows(workouts), [workouts]);
  const monthRows = useMemo(() => rows.filter(isMonthRow), [rows]);
  // Месяц ищем по ключу, а не храним целиком: иначе число тренировок устареет после удаления.
  const topMonthRow = monthRows.find((monthRow) => monthRow.key === topMonthKey) ?? monthRows[0];

  const updateTopMonth = () => {
    const firstVisibleIndex = listRef.current?.getFirstVisibleIndex();
    if (firstVisibleIndex == null) return;
    const monthRow = findMonthRowForIndex(rows, firstVisibleIndex);
    if (monthRow) setTopMonthKey(monthRow.key);
  };

  const renderRow = useCallback(
    ({ item }: { item: HistoryRow }) => {
      if (isMonthRow(item)) {
        return <HistoryMonthRow monthStart={item.monthStart} workoutCount={item.workoutCount} />;
      }
      return <WorkoutRow workout={item.workout} onPress={onOpenWorkout} />;
    },
    [onOpenWorkout],
  );

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={rows}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.kind}
        onScroll={updateTopMonth}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={Calendar}
            title={translate('history.empty')}
            hint={translate('history.emptyHint')}
          />
        }
        renderItem={renderRow}
      />
      {topMonthRow ? (
        <View style={styles.topMonth} pointerEvents="none">
          <HistoryMonthRow monthStart={topMonthRow.monthStart} workoutCount={topMonthRow.workoutCount} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 140 },
  topMonth: { position: 'absolute', top: 0, left: 0, right: 0 },
});
