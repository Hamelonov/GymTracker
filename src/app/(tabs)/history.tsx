import { addDays, addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { push } from '@/lib/nav';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listWorkouts, countWorkoutsByDay } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { HistoryCalendar } from '@/features/history/HistoryCalendar';
import { HistoryList } from '@/features/history/HistoryList';
import { useNow } from '@/lib/useNow';
import { Header, Segmented, spacing, useColors } from '@/ui';

type HistoryViewMode = 'list' | 'calendar';

export default function HistoryTab() {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [viewMode, setViewMode] = useState<HistoryViewMode>('list');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const allWorkouts = useQuery(() => listWorkouts(), []);
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
        <HistoryList workouts={allWorkouts} onOpenWorkout={openWorkout} />
      ) : (
        <ScrollView contentContainerStyle={styles.calendarContent}>
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
  calendarContent: { paddingBottom: 140 },
});
