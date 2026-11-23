import { push } from '@/lib/nav';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listWorkouts } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { HistoryList } from '@/features/history/HistoryList';
import { MonthCalendarView } from '@/features/history/MonthCalendarView';
import { YearCalendarView } from '@/features/history/YearCalendarView';
import { useNow } from '@/lib/useNow';
import { DropdownFilterBar, useColors, type DropdownFilter } from '@/ui';

type HistoryViewMode = 'month' | 'year' | 'list';

const VIEW_MODES: HistoryViewMode[] = ['month', 'year', 'list'];
const VIEW_MODE_FIELD_WIDTH = 150;

export default function HistoryTab() {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [viewMode, setViewMode] = useState<HistoryViewMode>('list');
  const allWorkouts = useQuery(() => listWorkouts(), []);

  const openWorkout = useCallback((workoutId: string) => {
    push({ pathname: '/workout/[id]', params: { id: workoutId } });
  }, []);
  const openDay = useCallback((day: string) => {
    push({ pathname: '/history/[day]', params: { day } });
  }, []);

  const viewModeNames: Record<HistoryViewMode, string> = {
    month: translate('history.viewMonth'),
    year: translate('history.viewYear'),
    list: translate('history.list'),
  };
  const viewModeDropdown: DropdownFilter = {
    key: 'viewMode',
    items: VIEW_MODES.map((mode) => ({ id: mode, name: viewModeNames[mode] })),
    selectedId: viewMode,
    fieldWidth: VIEW_MODE_FIELD_WIDTH,
    onSelect: (id) => {
      const selectedMode = VIEW_MODES.find((mode) => mode === id);
      if (selectedMode) setViewMode(selectedMode);
    },
  };

  return (
    // Шапка экрана — сам выбор режима: «Месяц», «Год» или «Список».
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <DropdownFilterBar filters={[viewModeDropdown]} isHeader>
        {viewMode === 'list' ? <HistoryList workouts={allWorkouts} onOpenWorkout={openWorkout} /> : null}
        {viewMode === 'month' ? (
          <MonthCalendarView workouts={allWorkouts} now={now} onOpenDay={openDay} />
        ) : null}
        {viewMode === 'year' ? <YearCalendarView workouts={allWorkouts} now={now} /> : null}
      </DropdownFilterBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
