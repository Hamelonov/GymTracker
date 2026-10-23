import { FlashList } from '@shopify/flash-list';
import { addDays, addMonths, endOfMonth, getDay, startOfMonth } from 'date-fns';
import { push } from '@/lib/nav';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listWorkouts, workoutDays } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { dayKey, formatMonthYear } from '@/domain/dates';
import { WorkoutCard } from '@/features/history/WorkoutCard';
import { useNow } from '@/lib/useNow';
import { EmptyState, Header, Icon, IconButton, Pressable, Segmented, Text, radius, spacing, useColors } from '@/ui';

export default function HistoryTab() {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const all = useQuery(() => listWorkouts(), []);
  const monthEnd = endOfMonth(month);
  const days = useQuery(() => workoutDays(month.getTime(), addDays(monthEnd, 1).getTime()), [month.getTime()]);
  const monthCount = [...days.values()].reduce((a, b) => a + b, 0);

  const dayWorkouts = useMemo(() => (selectedDay ? all.filter((w) => dayKey(w.startedAt) === selectedDay) : []), [all, selectedDay]);

  const grid = useMemo(() => {
    const first = startOfMonth(month);
    const offset = (getDay(first) + 6) % 7; // Monday first
    const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
    for (let d = first; d <= monthEnd; d = addDays(d, 1)) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month, monthEnd]);

  const header = (
    <View>
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <Segmented options={[{ value: 'list', label: t('history.list') }, { value: 'calendar', label: t('history.calendar') }]} value={mode} onChange={setMode} />
      </View>
      {mode === 'calendar' ? (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={styles.monthRow}>
            <IconButton icon={ChevronLeft} variant="filled" onPress={() => { setMonth((m) => addMonths(m, -1)); setSelectedDay(null); }} haptic="selection" />
            <View style={{ alignItems: 'center' }}>
              <Text variant="h3">{formatMonthYear(month.getTime(), i18n.language)}</Text>
              <Text variant="caption" color="muted">
                {t('history.workoutsInMonth', { count: monthCount })}
              </Text>
            </View>
            <IconButton icon={ChevronRight} variant="filled" onPress={() => { setMonth((m) => addMonths(m, 1)); setSelectedDay(null); }} haptic="selection" />
          </View>
          <View style={styles.grid}>
            {grid.map((d, i) => {
              if (!d) return <View key={`e${i}`} style={styles.cell} />;
              const key = dayKey(d);
              const count = days.get(key) ?? 0;
              const isToday = key === dayKey(now);
              const selected = key === selectedDay;
              return (
                <Pressable key={key} style={styles.cell} onPress={() => setSelectedDay(selected ? null : key)} haptic="selection" scaleTo={0.9}>
                  <View style={[styles.cellInner, { backgroundColor: count > 0 ? c.accent : selected ? c.surfaceAlt : 'transparent', borderColor: isToday || selected ? c.text : 'transparent' }]}>
                    <Text variant="caption" color={count > 0 ? c.black : c.text} tabular>
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          {selectedDay && dayWorkouts.length === 0 ? (
            <Text color="faint" align="center" style={{ marginVertical: spacing.lg }}>
              {t('history.noWorkoutsOnDay')}
            </Text>
          ) : null}
          <View style={{ height: spacing.lg }} />
        </View>
      ) : null}
    </View>
  );

  const data = mode === 'list' ? all : selectedDay ? dayWorkouts : all.filter((w) => w.startedAt >= month.getTime() && w.startedAt <= monthEnd.getTime());

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Header title={t('history.title')} large />
      <FlashList
        data={data}
        keyExtractor={(w) => w.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListEmptyComponent={mode === 'list' ? <EmptyState icon={Calendar} title={t('history.empty')} hint={t('history.emptyHint')} /> : null}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <WorkoutCard workout={item} onPress={() => push({ pathname: '/workout/[id]', params: { id: item.id } })} />
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
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 3 },
  cellInner: { width: '100%', height: '100%', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  hidden: { display: 'none' },
});
