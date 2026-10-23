import { router } from 'expo-router';
import { ArrowDown, ArrowUp, ChevronDown, Link, Plus, Replace, Trash2, Unlink } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { ensureNotificationPermission } from '@/lib/notifications';
import { exerciseName, getExercisesByIds, lastPerformances } from '@/db/repo/exercises';
import { getRoutine, routineInputFromWorkout, updateRoutine } from '@/db/repo/routines';
import { saveWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import type { SetType } from '@/domain/types';
import { formatDuration } from '@/domain/units';
import { countWorkingSets, totalVolume } from '@/domain/volume';
import { useElapsed } from '@/features/workout/ActiveWorkoutBar';
import { ExerciseCard } from '@/features/workout/ExerciseCard';
import { RestTimerBar } from '@/features/workout/RestTimerBar';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useLastSave } from '@/store/lastSave';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { formatDateTime } from '@/domain/dates';
import { Button, Card, Icon, Input, ListItem, Pressable, Sheet, Text, confirm, radius, spacing, toast, useColors } from '@/ui';

const SUPERSET_COLORS = ['#F5A524', '#3E63DD', '#30A46C', '#E5484D', '#8E4EC6', '#12A594'];
const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];

type SheetState =
  | { kind: 'none' }
  | { kind: 'menu'; activeId: string }
  | { kind: 'rest'; activeId: string }
  | { kind: 'setType'; activeId: string; setId: string }
  | { kind: 'superset'; activeId: string }
  | { kind: 'finish' }
  | { kind: 'name' };

export default function ActiveWorkoutScreen() {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const workout = useActiveWorkout((s) => s.workout);
  const session = useActiveWorkout((s) => s.session);
  const store = useActiveWorkout.getState;
  const settings = useSettings();
  const elapsed = useElapsed(session.mode === 'new' ? workout?.startedAt : null);
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const [nameDraft, setNameDraft] = useState('');
  const startRest = useRestTimer((s) => s.start);
  useEffect(() => {
    if (settings.restNotifications) void ensureNotificationPermission();
  }, [settings.restNotifications]);

  const exerciseIds = useMemo(() => workout?.exercises.map((e) => e.exerciseId) ?? [], [workout?.exercises]);
  const exMap = useQuery(() => getExercisesByIds(exerciseIds), [exerciseIds.join(',')]);
  const lastNotes = useQuery(() => {
    const m = lastPerformances(exerciseIds);
    const out = new Map<string, string>();
    for (const [id, v] of m) if (v.note) out.set(id, v.note);
    return out;
  }, [exerciseIds.join(',')]);

  const units = useMemo(() => ({ weight: settings.weightUnit, distance: settings.distanceUnit }), [settings.weightUnit, settings.distanceUnit]);
  const restFor = useCallback(
    (activeId: string) => {
      const ex = workout?.exercises.find((e) => e.id === activeId);
      if (!ex) return settings.defaultRestSeconds;
      if (ex.restSeconds != null) return ex.restSeconds;
      const row = exMap.get(ex.exerciseId);
      return row?.restSeconds ?? settings.defaultRestSeconds;
    },
    [workout?.exercises, exMap, settings.defaultRestSeconds],
  );

  const onToggle = useCallback(
    (activeId: string, setId: string) => {
      const res = store().toggleSet(activeId, setId);
      if (res?.completed && session.mode === 'new' && settings.autoStartRest) {
        const sec = restFor(activeId);
        if (sec > 0) startRest(sec);
      }
    },
    [store, session.mode, settings.autoStartRest, restFor, startRest],
  );

  const onDeleteSet = useCallback(
    (activeId: string, setId: string) => {
      const removed = store().removeSet(activeId, setId);
      if (removed) toast(t('common.deleted'), { actionLabel: t('common.undo'), onAction: () => store().restoreSet(activeId, removed.set, removed.index) });
    },
    [store, t],
  );

  const removeExercise = (activeId: string) => {
    const w = workout;
    const index = w?.exercises.findIndex((e) => e.id === activeId) ?? -1;
    const removed = store().removeExercise(activeId);
    setSheet({ kind: 'none' });
    if (removed) toast(t('common.deleted'), { actionLabel: t('common.undo'), onAction: () => store().restoreExercise(removed, index) });
  };

  const discard = async () => {
    if (!(await confirm({ title: t('workout.discard'), message: t('workout.discardConfirm'), destructive: true, confirmLabel: t('common.discard') }))) return;
    useRestTimer.getState().skip();
    store().clear();
    router.back();
  };

  const finish = async () => {
    if (!workout) return;
    const completed = workout.exercises.flatMap((e) => e.sets.filter((s) => s.completed));
    if (completed.length === 0) return;
    setSheet({ kind: 'none' });
    useRestTimer.getState().skip();
    if (session.mode === 'edit') {
      saveWorkout(workout, session.finishedAt, { existingId: session.workoutId });
      store().clear();
      toast(t('workout.saved'));
      router.back();
      return;
    }
    const result = saveWorkout(workout, Date.now());
    useLastSave.getState().set(result);
    const routine = workout.routineId ? getRoutine(workout.routineId) : undefined;
    store().clear();
    if (routine) {
      const changed =
        routine.exercises.length !== workout.exercises.filter((e) => e.sets.some((s) => s.completed)).length ||
        routine.exercises.some((re, i) => workout.exercises[i]?.exerciseId !== re.exerciseId);
      if (changed && (await confirm({ title: t('workout.updateRoutine'), message: t('workout.updateRoutineHint', { name: routine.name }), confirmLabel: t('workout.updateRoutine'), cancelLabel: t('workout.keepRoutine') }))) {
        updateRoutine(routine.id, routineInputFromWorkout(workout, routine));
      }
    }
    router.replace('/workout/summary');
  };

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <Button title={t('common.close')} variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const completedSets = workout.exercises.flatMap((e) => e.sets.filter((s) => s.completed));
  const volume = totalVolume(completedSets);
  const setsDone = countWorkingSets(completedSets);
  const supersetColor = (group: number | null) => (group == null ? null : SUPERSET_COLORS[(group - 1) % SUPERSET_COLORS.length] ?? null);
  const current = sheet.kind !== 'none' && 'activeId' in sheet ? workout.exercises.find((e) => e.id === sheet.activeId) : undefined;
  const currentIndex = current ? workout.exercises.indexOf(current) : -1;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]} haptic="selection">
          <Icon icon={ChevronDown} size={22} />
        </Pressable>
        <Pressable style={styles.headerCenter} onPress={() => { setNameDraft(workout.name); setSheet({ kind: 'name' }); }}>
          <Text variant="h3" numberOfLines={1} align="center">
            {workout.name || t('workout.defaultName')}
          </Text>
          <Text variant="caption" color="muted" tabular>
            {session.mode === 'new' ? formatDuration(elapsed) : formatDateTime(workout.startedAt, i18n.language)}
          </Text>
        </Pressable>
        <Button title={session.mode === 'new' ? t('workout.finish') : t('common.save')} size="sm" onPress={() => setSheet({ kind: 'finish' })} disabled={completedSets.length === 0} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.stats, { backgroundColor: c.surface }]}>
            <Stat label={t('workout.duration')} value={session.mode === 'new' ? formatDuration(elapsed) : formatDuration(Math.round((session.finishedAt - workout.startedAt) / 1000))} />
            <Stat label={t('workout.volume')} value={`${Math.round(settings.weightUnit === 'kg' ? volume : volume / 0.45359237)} ${settings.weightUnit}`} />
            <Stat label={t('workout.setsDone')} value={String(setsDone)} />
          </View>

          {workout.exercises.map((item) => (
            <ExerciseCard
              key={item.id}
              item={item}
              exercise={exMap.get(item.exerciseId)}
              units={units}
              showRpe={settings.showRpe}
              restSeconds={restFor(item.id)}
              lastNote={lastNotes.get(item.exerciseId)}
              supersetColor={supersetColor(item.supersetGroup)}
              onMenu={() => setSheet({ kind: 'menu', activeId: item.id })}
              onRestPress={() => setSheet({ kind: 'rest', activeId: item.id })}
              onAddSet={() => store().addSet(item.id)}
              onSetChange={(setId, patch) => store().updateSet(item.id, setId, patch)}
              onSetToggle={(setId) => onToggle(item.id, setId)}
              onSetDelete={(setId) => onDeleteSet(item.id, setId)}
              onSetTypePress={(setId) => setSheet({ kind: 'setType', activeId: item.id, setId })}
              onNoteChange={(note) => store().setExerciseNote(item.id, note)}
            />
          ))}

          <Button
            title={t('workout.addExercise')}
            size="lg"
            full
            variant={workout.exercises.length === 0 ? 'primary' : 'secondary'}
            icon={<Icon icon={Plus} size={20} color={workout.exercises.length === 0 ? 'onAccent' : 'text'} strokeWidth={2.5} />}
            onPress={() => router.push({ pathname: '/exercise/picker', params: { mode: 'workout' } })}
            style={{ marginTop: spacing.sm }}
          />
          {session.mode === 'new' ? (
            <Button title={t('workout.discard')} variant="ghost" full onPress={discard} style={{ marginTop: spacing.sm }} />
          ) : null}
          <Input
            label={t('workout.notes')}
            placeholder={t('workout.notesPlaceholder')}
            value={workout.notes}
            onChangeText={(v) => store().setNotes(v)}
            multiline
            containerStyle={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {settings.keepAwake ? <KeepAwake /> : null}
      <View style={[styles.restWrap, { bottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
        <RestTimerBar />
      </View>

      {/* Exercise menu */}
      <Sheet visible={sheet.kind === 'menu'} onClose={() => setSheet({ kind: 'none' })} title={current ? exerciseName(exMap.get(current.exerciseId) ?? { nameEn: '', nameRu: '', isCustom: true }, i18n.language) : undefined} flush>
        {current ? (
          <View style={styles.menu}>
            <ListItem title={t('workout.replaceExercise')} left={<Icon icon={Replace} />} onPress={() => { setSheet({ kind: 'none' }); router.push({ pathname: '/exercise/picker', params: { mode: 'replace', target: current.id } }); }} />
            <ListItem
              title={current.supersetGroup == null ? t('workout.createSuperset') : t('workout.removeFromSuperset')}
              left={<Icon icon={current.supersetGroup == null ? Link : Unlink} />}
              onPress={() => {
                if (current.supersetGroup != null) {
                  store().setSuperset([current.id], null);
                  setSheet({ kind: 'none' });
                } else setSheet({ kind: 'superset', activeId: current.id });
              }}
            />
            {currentIndex > 0 ? <ListItem title={`${t('workout.reorder')} ↑`} left={<Icon icon={ArrowUp} />} onPress={() => { store().moveExercise(currentIndex, currentIndex - 1); setSheet({ kind: 'none' }); }} /> : null}
            {currentIndex < workout.exercises.length - 1 ? <ListItem title={`${t('workout.reorder')} ↓`} left={<Icon icon={ArrowDown} />} onPress={() => { store().moveExercise(currentIndex, currentIndex + 1); setSheet({ kind: 'none' }); }} /> : null}
            <ListItem title={t('workout.removeExercise')} titleColor={c.danger} left={<Icon icon={Trash2} color="danger" />} onPress={() => removeExercise(current.id)} />
          </View>
        ) : null}
      </Sheet>

      {/* Superset partner */}
      <Sheet visible={sheet.kind === 'superset'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.createSuperset')} flush>
        <View style={styles.menu}>
          {workout.exercises
            .filter((e) => e.id !== current?.id)
            .map((e) => (
              <ListItem
                key={e.id}
                title={exerciseName(exMap.get(e.exerciseId) ?? { nameEn: '', nameRu: '', isCustom: true }, i18n.language)}
                subtitle={e.supersetGroup != null ? `${t('workout.superset')} ${e.supersetGroup}` : undefined}
                onPress={() => {
                  if (!current) return;
                  store().setSuperset([current.id, e.id], e.supersetGroup ?? -1);
                  setSheet({ kind: 'none' });
                }}
              />
            ))}
        </View>
      </Sheet>

      {/* Rest timer per exercise */}
      <Sheet visible={sheet.kind === 'rest'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.restTimer')}>
        <View style={styles.restGrid}>
          {REST_OPTIONS.map((sec) => {
            const selected = current && restFor(current.id) === sec;
            return (
              <Pressable
                key={sec}
                haptic="selection"
                onPress={() => {
                  if (current) store().setExerciseRest(current.id, sec);
                  setSheet({ kind: 'none' });
                }}
                style={[styles.restOpt, { backgroundColor: selected ? c.text : c.surfaceAlt }]}
              >
                <Text variant="bodyMedium" color={selected ? c.bg : c.text} tabular>
                  {sec === 0 ? t('workout.restOff') : formatDuration(sec)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Button title={t('workout.restDefault', { sec: formatDuration(settings.defaultRestSeconds) })} variant="ghost" full onPress={() => { if (current) store().setExerciseRest(current.id, null); setSheet({ kind: 'none' }); }} style={{ marginTop: spacing.md }} />
      </Sheet>

      {/* Set type */}
      <Sheet visible={sheet.kind === 'setType'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.setType')} flush>
        <View style={styles.menu}>
          {(['normal', 'warmup', 'drop', 'failure'] as SetType[]).map((type) => (
            <ListItem
              key={type}
              title={t(`workout.setTypes.${type}`)}
              left={
                <View style={[styles.typeBadge, { backgroundColor: type === 'normal' ? c.surfaceAlt : c.text }]}>
                  <Text variant="caption" color={type === 'normal' ? c.text : c.bg}>
                    {type === 'normal' ? '1' : t(`workout.setTypeShort.${type}`)}
                  </Text>
                </View>
              }
              onPress={() => {
                if (sheet.kind === 'setType') store().updateSet(sheet.activeId, sheet.setId, { type });
                setSheet({ kind: 'none' });
              }}
            />
          ))}
          <ListItem
            title={t('workout.deleteSet')}
            titleColor={c.danger}
            left={<Icon icon={Trash2} color="danger" />}
            onPress={() => {
              if (sheet.kind === 'setType') onDeleteSet(sheet.activeId, sheet.setId);
              setSheet({ kind: 'none' });
            }}
          />
        </View>
      </Sheet>

      {/* Rename */}
      <Sheet visible={sheet.kind === 'name'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.nameLabel')}>
        <Input value={nameDraft} onChangeText={setNameDraft} autoFocus placeholder={t('workout.defaultName')} returnKeyType="done" onSubmitEditing={() => { store().rename(nameDraft.trim()); setSheet({ kind: 'none' }); }} />
        <Button title={t('common.save')} size="lg" full onPress={() => { store().rename(nameDraft.trim()); setSheet({ kind: 'none' }); }} style={{ marginTop: spacing.lg }} />
      </Sheet>

      {/* Finish */}
      <Sheet visible={sheet.kind === 'finish'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.finishTitle')}>
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={styles.statsRow}>
            <Stat label={t('workout.duration')} value={session.mode === 'new' ? formatDuration(elapsed) : formatDuration(Math.round((session.finishedAt - workout.startedAt) / 1000))} />
            <Stat label={t('workout.volume')} value={`${Math.round(settings.weightUnit === 'kg' ? volume : volume / 0.45359237)} ${settings.weightUnit}`} />
            <Stat label={t('workout.setsDone')} value={String(setsDone)} />
          </View>
        </Card>
        <Text color="muted" style={{ marginBottom: spacing.lg }}>
          {t('workout.finishHint')}
        </Text>
        <Button title={t('workout.finishAndSave')} size="lg" full onPress={finish} haptic="success" />
      </Sheet>
    </View>
  );
}

function KeepAwake() {
  useKeepAwake('workout');
  return null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="label" color="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="h3" tabular>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.md },
  headerCenter: { flex: 1, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  stats: { flexDirection: 'row', borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, gap: 4 },
  restWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  menu: { paddingHorizontal: spacing.sm },
  restGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  restOpt: { width: '30%', flexGrow: 1, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
