import { FlashList } from '@shopify/flash-list';
import { addDays, addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { push } from '@/lib/nav';
import { Calendar } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listWorkouts, countWorkoutsByDay } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { toDayKey } from '@/domain/dates';
import { HistoryCalendar } from '@/features/history/HistoryCalendar';
import { WorkoutCard } from '@/features/history/WorkoutCard';
import { useNow } from '@/lib/useNow';
import { EmptyState, Header, Icon, Segmented, spacing, useColors } from '@/ui';

type HistoryViewMode = 'list' | 'calendar';

export default function HistoryTab() {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [viewMode, setViewMode] = useState<HistoryViewMode>('list');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const allWorkouts = useQuery(() => listWorkouts(), []);
  const monthEnd = endOfMonth(month);
  const workoutCountByDay = useQuery(
    () => countWorkoutsByDay(month.getTime(), addDays(monthEnd, 1).getTime()),
    [month.getTime()],
  );
  const monthWorkoutCount = [...workoutCountByDay.values()].reduce((sum, count) => sum + count, 0);

  const selectedDayWorkouts = useMemo(
    () => (selectedDay ? allWorkouts.filter((workout) => toDayKey(workout.startedAt) === selectedDay) : []),
    [allWorkouts, selectedDay],
  );

  const changeMonthBy = (monthCount: number) => {
    setMonth((currentMonth) => addMonths(currentMonth, monthCount));
    setSelectedDay(null);
  };

  const getVisibleWorkouts = () => {
    if (viewMode === 'list') return allWorkouts;
    if (selectedDay) return selectedDayWorkouts;
    return allWorkouts.filter(
      (workout) => workout.startedAt >= month.getTime() && workout.startedAt <= monthEnd.getTime(),
    );
  };

  const listHeader = (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <Segmented
          options={[
            { value: 'list', label: translate('history.list') },
            { value: 'calendar', label: translate('history.calendar') },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </View>
      {viewMode === 'calendar' ? (
        <HistoryCalendar
          month={month}
          monthEnd={monthEnd}
          now={now}
          workoutCountByDay={workoutCountByDay}
          monthWorkoutCount={monthWorkoutCount}
          selectedDay={selectedDay}
          hasNoWorkoutsOnSelectedDay={Boolean(selectedDay) && selectedDayWorkouts.length === 0}
          onShowPreviousMonth={() => changeMonthBy(-1)}
          onShowNextMonth={() => changeMonthBy(1)}
          onSelectDay={setSelectedDay}
        />
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Header title={translate('history.title')} large />
      <FlashList
        data={getVisibleWorkouts()}
        keyExtractor={(workout) => workout.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListEmptyComponent={
          viewMode === 'list' ? (
            <EmptyState
              icon={Calendar}
              title={translate('history.empty')}
              hint={translate('history.emptyHint')}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <WorkoutCard
              workout={item}
              onPress={() => push({ pathname: '/workout/[id]', params: { id: item.id } })}
            />
          </View>
        )}
      />
      <View style={styles.hidden}>
        <Icon icon={Calendar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
});
