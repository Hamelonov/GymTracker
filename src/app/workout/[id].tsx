import { router, useLocalSearchParams } from 'expo-router';
import { Ellipsis, Pencil, Repeat, Save, Trash2, Trophy } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import { createRoutine, routineInputFromWorkout } from '@/db/repo/routines';
import { deleteWorkout, getWorkout, workoutToActive } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatDateTime } from '@/domain/dates';
import { setFieldsFor } from '@/domain/types';
import { formatDuration, formatWeight } from '@/domain/units';
import { formatSetValues } from '@/features/workout/format';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { Card, Icon, IconButton, ListItem, Pressable, Screen, Sheet, Text, confirm, radius, spacing, toast, useColors } from '@/ui';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const [menu, setMenu] = useState(false);
  const w = useQuery(() => (id ? getWorkout(id) : undefined), [id]);
  const units = useMemo(() => ({ weight: settings.weightUnit, distance: settings.distanceUnit }), [settings.weightUnit, settings.distanceUnit]);
  const active = useActiveWorkout((s) => s.workout);
  const session = useActiveWorkout((s) => s.session);

  if (!w) {
    return <Screen header={{ back: true }} />;
  }

  const ensureNoActive = async () => {
    if (!active || session.mode === 'edit') return true;
    const ok = await confirm({ title: t('home.inProgress'), message: t('workout.discardConfirm'), destructive: true, confirmLabel: t('common.discard') });
    if (ok) {
      useRestTimer.getState().skip();
      useActiveWorkout.getState().clear();
    }
    return ok;
  };

  const edit = async () => {
    setMenu(false);
    if (!(await ensureNoActive())) return;
    useActiveWorkout.getState().startFromActive(workoutToActive(w), { mode: 'edit', workoutId: w.id, finishedAt: w.finishedAt });
    router.push('/workout/active');
  };

  const repeat = async () => {
    setMenu(false);
    if (!(await ensureNoActive())) return;
    const a = workoutToActive(w);
    useActiveWorkout.getState().startFromActive(
      {
        ...a,
        id: `${Date.now().toString(36)}r`,
        startedAt: Date.now(),
        notes: '',
        exercises: a.exercises.map((e) => ({
          ...e,
          id: `${e.id}r`,
          note: '',
          sets: e.sets.map((s) => ({ ...s, id: `${s.id}r`, completed: false, completedAt: null, prTypes: undefined, previous: { weightKg: s.weightKg, reps: s.reps, durationSec: s.durationSec, distanceM: s.distanceM, rpe: s.rpe } })),
        })),
      },
      { mode: 'new' },
    );
    router.push('/workout/active');
  };

  const saveAsRoutine = () => {
    setMenu(false);
    const rid = createRoutine(routineInputFromWorkout(workoutToActive(w)));
    toast(t('routine.saved'));
    router.push({ pathname: '/routine/[id]', params: { id: rid } });
  };

  const remove = async () => {
    setMenu(false);
    if (!(await confirm({ title: t('history.deleteConfirm'), destructive: true, confirmLabel: t('common.delete') }))) return;
    deleteWorkout(w.id);
    router.back();
  };

  return (
    <Screen header={{ back: true, title: w.name, subtitle: formatDateTime(w.startedAt, i18n.language), right: <IconButton icon={Ellipsis} variant="filled" onPress={() => setMenu(true)} haptic="selection" /> }}>
      <View style={[styles.stats, { backgroundColor: c.surface }]}>
        <Stat label={t('workout.duration')} value={formatDuration(w.durationSec)} />
        <Stat label={t('workout.volume')} value={formatWeight(w.volumeKg, settings.weightUnit)} />
        <Stat label={t('workout.setsDone')} value={String(w.setCount)} />
        {w.prCount > 0 ? <Stat label={t('workout.prs')} value={String(w.prCount)} accent /> : null}
      </View>
      {w.notes ? (
        <Text color="muted" style={{ marginBottom: spacing.lg }}>
          {w.notes}
        </Text>
      ) : null}

      {w.exercises.map((e) => {
        const fields = setFieldsFor(e.exercise.type);
        return (
          <Card key={e.id} raised style={{ marginBottom: spacing.md }}>
            <Pressable onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.exerciseId } })}>
              <Text variant="h3">{exerciseName(e.exercise, i18n.language)}</Text>
            </Pressable>
            {e.note ? (
              <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                {e.note}
              </Text>
            ) : null}
            <View style={{ marginTop: spacing.md, gap: 6 }}>
              {e.sets.map((s, i) => (
                <View key={s.id} style={styles.setRow}>
                  <View style={[styles.setNo, { backgroundColor: s.type === 'normal' ? c.surfaceAlt : c.text }]}>
                    <Text variant="label" color={s.type === 'normal' ? c.text : c.bg}>
                      {s.type === 'normal' ? i + 1 : t(`workout.setTypeShort.${s.type}`)}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" tabular style={{ flexShrink: 0 }}>
                    {formatSetValues(s, fields, units)}
                    {s.rpe != null ? `  @${s.rpe}` : ''}
                  </Text>
                  <View style={styles.prWrap}>
                  {s.prTypes.map((p) => (
                    <View key={p} style={[styles.pr, { backgroundColor: c.accent }]}>
                      <Icon icon={Trophy} size={10} color="onAccent" />
                      <Text variant="label" color="onAccent">
                        {t(`pr.${p}`).toUpperCase()}
                      </Text>
                    </View>
                  ))}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        );
      })}

      <Sheet visible={menu} onClose={() => setMenu(false)} flush>
        <View style={{ paddingHorizontal: spacing.sm }}>
          <ListItem title={t('common.edit')} left={<Icon icon={Pencil} />} onPress={edit} />
          <ListItem title={t('history.repeat')} left={<Icon icon={Repeat} />} onPress={repeat} />
          <ListItem title={t('history.saveAsRoutine')} left={<Icon icon={Save} />} onPress={saveAsRoutine} />
          <ListItem title={t('common.delete')} titleColor={c.danger} left={<Icon icon={Trash2} color="danger" />} onPress={remove} />
        </View>
      </Sheet>
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text variant="label" color="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="h3" color={accent ? 'accent' : 'text'} tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setNo: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  prWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  pr: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 20, borderRadius: 10 },
});
