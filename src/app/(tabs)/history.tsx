import { FlashList } from '@shopify/flash-list';
import { addDays, addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { push } from '@/lib/nav';
import { Calendar } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listWorkouts, countWorkoutsByDay } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { HistoryCalendar } from '@/features/history/HistoryCalendar';
import { HistoryMonthRow } from '@/features/history/HistoryMonthRow';
import { buildHistoryRows, findMonthRowIndices, type HistoryRow } from '@/features/history/historyRows';
import { WorkoutRow } from '@/features/history/WorkoutRow';
import { useNow } from '@/lib/useNow';
import { EmptyState, Header, Segmented, spacing, useColors } from '@/ui';

type HistoryViewMode = 'list' | 'calendar';

export default function HistoryTab() {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [viewMode, setViewMode] = useState<HistoryViewMode>('list');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const allWorkouts = useQuery(() => listWorkouts(), []);
  const historyRows = useMemo(() => buildHistoryRows(allWorkouts), [allWorkouts]);
  const monthRowIndices = useMemo(() => findMonthRowIndices(historyRows), [historyRows]);
  const monthEnd = endOfMonth(month);
  const workoutCountByDay = useQuery(
    () => countWorkoutsByDay(month.getTime(), addDays(monthEnd, 1).getTime()),
    [month.getTime()],
  );
  const monthWorkoutCount = [...workoutCountByDay.values()].reduce((sum, count) => sum + count, 0);

  const changeMonthBy = (monthCount: number) => {
    setMonth((currentMonth) => addMonths(currentMonth, monthCount));
  };

  const openWorkout = useCallback((workoutId: string) => {
    push({ pathname: '/workout/[id]', params: { id: workoutId } });
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: HistoryRow }) => {
      if (item.kind === 'month') {
        return <HistoryMonthRow monthStart={item.monthStart} workoutCount={item.workoutCount} />;
      }
      return <WorkoutRow workout={item.workout} onPress={openWorkout} />;
    },
    [openWorkout],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Header title={translate('history.title')} large />
      {/* Вкладки вне списка: при прокрутке они остаются на месте вместе с шапкой. */}
      <View style={styles.viewModeTabs}>
        <Segmented
          options={[
            { value: 'list', label: translate('history.list') },
            { value: 'calendar', label: translate('history.calendar') },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </View>
      {viewMode === 'list' ? (
        <FlashList
          data={historyRows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.kind}
          stickyHeaderIndices={monthRowIndices}
          contentContainerStyle={styles.scrollContent}
          ListEmptyComponent={
            <EmptyState
              icon={Calendar}
              title={translate('history.empty')}
              hint={translate('history.emptyHint')}
            />
          }
          renderItem={renderRow}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <HistoryCalendar
            month={month}
            monthEnd={monthEnd}
            now={now}
            workoutCountByDay={workoutCountByDay}
            monthWorkoutCount={monthWorkoutCount}
            onShowPreviousMonth={() => changeMonthBy(-1)}
            onShowNextMonth={() => changeMonthBy(1)}
            onOpenDay={(day) => push({ pathname: '/history/[day]', params: { day } })}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  viewModeTabs: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  scrollContent: { paddingBottom: 140 },
});
