import { push } from '@/lib/nav';
import { Copy, Dumbbell, Folder, FolderInput, FolderPlus, Pencil, Play, Plus, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { addDays, format } from 'date-fns';
import { getExercisesByIds } from '@/db/repo/exercises';
import { createFolder, deleteFolder, deleteRoutine, duplicateRoutine, getRoutine, listFolders, listRoutines, moveRoutineToFolder, renameFolder } from '@/db/repo/routines';
import { workoutDays, workoutStartTimes } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { dateLocale, dayKey, weekStart } from '@/domain/dates';
import { RoutineCard } from '@/features/routines/RoutineCard';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { useNow } from '@/lib/useNow';
import { Button, Card, EmptyState, Icon, IconButton, Input, ListItem, Pressable, Screen, SectionTitle, Sheet, Text, confirm, spacing, useColors } from '@/ui';

type SheetState = { kind: 'none' } | { kind: 'routineMenu'; id: string } | { kind: 'move'; id: string } | { kind: 'folder'; id?: string } | { kind: 'folderMenu'; id: string };

function workoutNameFor(t: (k: string) => string, now: number): string {
  const h = new Date(now).getHours();
  if (h < 12) return t('workout.morning');
  if (h < 17) return t('workout.afternoon');
  if (h < 22) return t('workout.evening');
  return t('workout.night');
}

/** Count consecutive weeks (including the current one if it has a workout) with at least one workout. */
function weekStreak(workoutStarts: number[], now: number): number {
  if (workoutStarts.length === 0) return 0;
  const weeks = new Set(workoutStarts.map((ts) => weekStart(ts).getTime()));
  let cursor = weekStart(now).getTime();
  let streak = 0;
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7).getTime();
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7).getTime();
  }
  return streak;
}

export default function HomeTab() {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const now = useNow();
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const [folderName, setFolderName] = useState('');
  const workout = useActiveWorkout((s) => s.workout);
  const session = useActiveWorkout((s) => s.session);
  const routines = useQuery(() => listRoutines(), []);
  const folders = useQuery(() => listFolders(), []);
  const exIds = useMemo(() => [...new Set(routines.flatMap((r) => r.exerciseIds))], [routines]);
  const exMap = useQuery(() => getExercisesByIds(exIds), [exIds.join(',')]);
  const ws = weekStart(now);
  const days = useQuery(() => workoutDays(ws.getTime(), addDays(ws, 7).getTime()), [ws.getTime()]);
  const starts = useQuery(() => workoutStartTimes(), []);
  const streak = useMemo(() => weekStreak(starts, now), [starts, now]);
  const weekCount = [...days.values()].reduce((a, b) => a + b, 0);

  const ensureNoActive = async () => {
    if (!workout || session.mode === 'edit') return true;
    const ok = await confirm({ title: t('home.inProgress'), message: t('workout.discardConfirm'), destructive: true, confirmLabel: t('common.discard') });
    if (ok) {
      useRestTimer.getState().skip();
      useActiveWorkout.getState().clear();
    }
    return ok;
  };

  const startEmpty = async () => {
    if (!(await ensureNoActive())) return;
    useActiveWorkout.getState().startEmpty(workoutNameFor(t, Date.now()));
    push('/workout/active');
  };

  const startRoutine = async (id: string) => {
    if (!(await ensureNoActive())) return;
    const r = getRoutine(id);
    if (!r) return;
    useActiveWorkout.getState().startFromRoutine(r);
    push('/workout/active');
  };

  const current = sheet.kind === 'routineMenu' || sheet.kind === 'move' ? routines.find((r) => r.id === sheet.id) : undefined;
  const unfiled = routines.filter((r) => r.folderId == null || !folders.some((f) => f.id === r.folderId));

  const renderRoutine = (r: (typeof routines)[number]) => (
    <RoutineCard
      key={r.id}
      routine={r}
      exercises={exMap}
      onStart={() => startRoutine(r.id)}
      onMenu={() => setSheet({ kind: 'routineMenu', id: r.id })}
      onPress={() => push({ pathname: '/routine/[id]', params: { id: r.id } })}
    />
  );

  return (
    <Screen header={{ title: t('home.title'), large: true }} contentStyle={{ paddingBottom: 120 }}>
      {workout && session.mode === 'new' ? (
        <Pressable onPress={() => push('/workout/active')} haptic="light">
          <Card style={[styles.banner, { backgroundColor: c.accent }]}>
            <View style={[styles.dot, { backgroundColor: c.black }]} />
            <View style={{ flex: 1 }}>
              <Text variant="h3" color="onAccent">
                {t('home.inProgress')}
              </Text>
              <Text variant="caption" color="onAccent" style={{ opacity: 0.7 }}>
                {workout.name}
              </Text>
            </View>
            <Text variant="bodyMedium" color="onAccent">
              {t('home.resume')} →
            </Text>
          </Card>
        </Pressable>
      ) : null}

      <Card style={styles.week}>
        <View style={styles.weekHeader}>
          <Text variant="label" color="muted">
            {t('home.weekSummary').toUpperCase()}
          </Text>
          <Text variant="caption" color="muted">
            {t('home.workoutsThisWeek', { count: weekCount })}
            {streak > 0 ? ` · ${t('home.streak', { count: streak })}` : ''}
          </Text>
        </View>
        <View style={styles.weekRow}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(ws, i);
            const key = dayKey(d);
            const count = days.get(key) ?? 0;
            const isToday = key === dayKey(now);
            return (
              <View key={key} style={styles.day}>
                <Text variant="label" color={isToday ? 'text' : 'faint'}>
                  {format(d, 'EEEEEE', { locale: dateLocale(i18n.language) }).toUpperCase()}
                </Text>
                <View style={[styles.dayDot, { backgroundColor: count > 0 ? c.accent : c.surfaceAlt, borderColor: isToday ? c.text : 'transparent' }]}>
                  {count > 0 ? <Icon icon={Dumbbell} size={14} color={c.black} strokeWidth={2.5} /> : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <SectionTitle title={t('home.quickStart')} />
      <Button title={t('home.startEmpty')} size="lg" full icon={<Icon icon={Play} size={20} color="onAccent" strokeWidth={2.5} />} onPress={startEmpty} />

      <SectionTitle
        title={t('home.routines')}
        right={
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <IconButton icon={FolderPlus} size={18} onPress={() => { setFolderName(''); setSheet({ kind: 'folder' }); }} haptic="selection" />
            <IconButton icon={Plus} size={18} variant="filled" onPress={() => push('/routine/edit')} haptic="selection" />
          </View>
        }
      />
      {routines.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t('home.noRoutines')} hint={t('home.noRoutinesHint')} action={<Button title={t('home.newRoutine')} variant="secondary" onPress={() => push('/routine/edit')} />} />
      ) : null}
      {folders.map((f) => {
        const inFolder = routines.filter((r) => r.folderId === f.id);
        return (
          <View key={f.id} style={{ marginBottom: spacing.sm }}>
            <Pressable onPress={() => setSheet({ kind: 'folderMenu', id: f.id })} style={styles.folderHeader} haptic="selection">
              <Icon icon={Folder} size={16} color="muted" />
              <Text variant="caption" color="muted" style={{ flex: 1 }}>
                {f.name}
              </Text>
              <Text variant="caption" color="faint">
                {inFolder.length}
              </Text>
            </Pressable>
            {inFolder.map(renderRoutine)}
          </View>
        );
      })}
      {unfiled.map(renderRoutine)}

      {/* Routine menu */}
      <Sheet visible={sheet.kind === 'routineMenu'} onClose={() => setSheet({ kind: 'none' })} title={current?.name} flush>
        {current ? (
          <View style={styles.menu}>
            <ListItem title={t('home.startRoutine')} left={<Icon icon={Play} />} onPress={() => { setSheet({ kind: 'none' }); void startRoutine(current.id); }} />
            <ListItem title={t('common.edit')} left={<Icon icon={Pencil} />} onPress={() => { setSheet({ kind: 'none' }); push({ pathname: '/routine/edit', params: { id: current.id } }); }} />
            <ListItem title={t('common.duplicate')} left={<Icon icon={Copy} />} onPress={() => { duplicateRoutine(current.id, `${current.name} (2)`); setSheet({ kind: 'none' }); }} />
            {folders.length > 0 ? <ListItem title={t('home.moveToFolder')} left={<Icon icon={FolderInput} />} onPress={() => setSheet({ kind: 'move', id: current.id })} /> : null}
            <ListItem
              title={t('common.delete')}
              titleColor={c.danger}
              left={<Icon icon={Trash2} color="danger" />}
              onPress={async () => {
                setSheet({ kind: 'none' });
                if (await confirm({ title: t('routine.deleteConfirm', { name: current.name }), destructive: true, confirmLabel: t('common.delete') })) deleteRoutine(current.id);
              }}
            />
          </View>
        ) : null}
      </Sheet>

      {/* Move to folder */}
      <Sheet visible={sheet.kind === 'move'} onClose={() => setSheet({ kind: 'none' })} title={t('home.moveToFolder')} flush>
        <View style={styles.menu}>
          <ListItem title={t('home.noFolder')} onPress={() => { if (current) moveRoutineToFolder(current.id, null); setSheet({ kind: 'none' }); }} />
          {folders.map((f) => (
            <ListItem key={f.id} title={f.name} left={<Icon icon={Folder} />} onPress={() => { if (current) moveRoutineToFolder(current.id, f.id); setSheet({ kind: 'none' }); }} />
          ))}
        </View>
      </Sheet>

      {/* New / rename folder */}
      <Sheet visible={sheet.kind === 'folder'} onClose={() => setSheet({ kind: 'none' })} title={sheet.kind === 'folder' && sheet.id ? t('common.rename') : t('home.newFolder')}>
        <Input value={folderName} onChangeText={setFolderName} placeholder={t('home.folderName')} autoFocus returnKeyType="done" />
        <Button
          title={t('common.save')}
          size="lg"
          full
          disabled={!folderName.trim()}
          onPress={() => {
            if (sheet.kind === 'folder' && sheet.id) renameFolder(sheet.id, folderName);
            else createFolder(folderName);
            setSheet({ kind: 'none' });
          }}
          style={{ marginTop: spacing.lg }}
        />
      </Sheet>

      {/* Folder menu */}
      <Sheet visible={sheet.kind === 'folderMenu'} onClose={() => setSheet({ kind: 'none' })} title={sheet.kind === 'folderMenu' ? folders.find((f) => f.id === sheet.id)?.name : undefined} flush>
        <View style={styles.menu}>
          <ListItem title={t('common.rename')} left={<Icon icon={Pencil} />} onPress={() => { if (sheet.kind === 'folderMenu') { setFolderName(folders.find((f) => f.id === sheet.id)?.name ?? ''); setSheet({ kind: 'folder', id: sheet.id }); } }} />
          <ListItem title={t('home.deleteFolder')} subtitle={t('home.deleteFolderHint')} titleColor={c.danger} left={<Icon icon={Trash2} color="danger" />} onPress={() => { if (sheet.kind === 'folderMenu') deleteFolder(sheet.id); setSheet({ kind: 'none' }); }} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  dot: { width: 10, height: 10, borderRadius: 5 },
  week: { marginBottom: spacing.sm },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, flexWrap: 'wrap', gap: 4 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 6 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  folderHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: 2 },
  menu: { paddingHorizontal: spacing.sm },
});
