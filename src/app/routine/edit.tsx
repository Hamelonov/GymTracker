import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { push } from '@/lib/nav';
import { ArrowDown, ArrowUp, Ellipsis, Link, Plus, Timer, Trash2, Unlink } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { exerciseName, getExercisesByIds } from '@/db/repo/exercises';
import { createRoutine, getRoutine, listFolders, updateRoutine } from '@/db/repo/routines';
import { useQuery } from '@/db/version';
import { newId } from '@/domain/ids';
import { setFieldsFor, type ActiveSet, type SetType } from '@/domain/types';
import { formatDuration, unitLabels } from '@/domain/units';
import { SET_COL, SetRow } from '@/features/workout/SetRow';
import { usePickerResult } from '@/store/picker';
import { useRoutineDraft } from '@/store/routineDraft';
import { useSettings } from '@/store/settings';
import { Button, Chip, Icon, Input, ListItem, Pressable, Screen, SectionTitle, Sheet, Text, fonts, radius, spacing, toast, useColors } from '@/ui';

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300];
type SheetState = { kind: 'none' } | { kind: 'menu'; id: string } | { kind: 'rest'; id: string } | { kind: 'setType'; id: string; setId: string } | { kind: 'superset'; id: string };

export default function RoutineEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t, i18n } = useTranslation();
  const c = useColors();
  const settings = useSettings();
  const draft = useRoutineDraft();
  const [token] = useState(() => {
    useRoutineDraft.getState().reset(id ? getRoutine(id) : undefined);
    return newId();
  });
  const [sheet, setSheet] = useState<SheetState>({ kind: 'none' });
  const folders = useQuery(() => listFolders(), []);

  useFocusEffect(
    useCallback(() => {
      const ids = usePickerResult.getState().consume(token);
      if (ids && ids.length) useRoutineDraft.getState().addExercises(ids);
    }, [token]),
  );

  const exIds = useMemo(() => draft.exercises.map((e) => e.exerciseId), [draft.exercises]);
  const exMap = useQuery(() => getExercisesByIds(exIds), [exIds.join(',')]);
  const units = useMemo(() => ({ weight: settings.weightUnit, distance: settings.distanceUnit }), [settings.weightUnit, settings.distanceUnit]);
  const current = 'id' in sheet ? draft.exercises.find((e) => e.id === sheet.id) : undefined;
  const currentIndex = current ? draft.exercises.indexOf(current) : -1;

  const save = () => {
    const input = {
      name: draft.name,
      notes: draft.notes,
      folderId: draft.folderId,
      exercises: draft.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        supersetGroup: e.supersetGroup,
        restSeconds: e.restSeconds,
        note: e.note,
        sets: e.sets.map(({ id: _id, ...s }) => s),
      })),
    };
    if (draft.id) updateRoutine(draft.id, input);
    else createRoutine(input);
    toast(t('routine.saved'));
    router.back();
  };

  return (
    <Screen
      header={{ back: 'close', title: draft.id ? t('routine.editTitle') : t('routine.newTitle') }}
      footer={<Button title={t('common.save')} size="lg" full disabled={!draft.name.trim()} onPress={save} />}
    >
      <Input label={t('routine.name')} value={draft.name} onChangeText={draft.setName} placeholder={t('routine.namePlaceholder')} autoFocus={!draft.id} containerStyle={{ marginTop: spacing.sm }} />
      <Input label={t('routine.notes')} value={draft.notes} onChangeText={draft.setNotes} placeholder={t('routine.notesPlaceholder')} multiline containerStyle={{ marginTop: spacing.lg }} />
      {folders.length > 0 ? (
        <>
          <SectionTitle title={t('routine.folder')} />
          <View style={styles.chips}>
            <Chip label={t('home.noFolder')} selected={draft.folderId == null} onPress={() => draft.setFolder(null)} />
            {folders.map((f) => (
              <Chip key={f.id} label={f.name} selected={draft.folderId === f.id} onPress={() => draft.setFolder(f.id)} />
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle title={t('routine.exercises')} />
      {draft.exercises.map((e) => {
        const ex = exMap.get(e.exerciseId);
        const fields = setFieldsFor(ex?.type ?? 'weight_reps');
        return (
          <View key={e.id} style={[styles.card, { backgroundColor: c.surface }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="h3" numberOfLines={2}>
                  {ex ? exerciseName(ex, i18n.language) : '…'}
                </Text>
                {e.supersetGroup != null ? (
                  <Text variant="label" color="muted">
                    {t('workout.superset').toUpperCase()} {e.supersetGroup}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => setSheet({ kind: 'rest', id: e.id })} haptic="selection" style={[styles.restBtn, { backgroundColor: c.surfaceAlt }]}>
                <Icon icon={Timer} size={14} color={e.restSeconds == null || e.restSeconds > 0 ? 'text' : 'faint'} />
                <Text variant="label" tabular>
                  {e.restSeconds == null ? formatDuration(ex?.restSeconds ?? settings.defaultRestSeconds) : e.restSeconds === 0 ? t('workout.restOff') : formatDuration(e.restSeconds)}
                </Text>
              </Pressable>
              <Pressable onPress={() => setSheet({ kind: 'menu', id: e.id })} haptic="selection" style={[styles.menuBtn, { backgroundColor: c.surfaceAlt }]}>
                <Icon icon={Ellipsis} size={18} />
              </Pressable>
            </View>
            <TextInput
              value={e.note}
              onChangeText={(v) => draft.setNote(e.id, v)}
              placeholder={t('routine.exerciseNotePlaceholder')}
              placeholderTextColor={c.textFaint}
              selectionColor={c.accent}
              style={[styles.note, { color: c.text }]}
            />
            <View style={styles.colHeader}>
              <Text variant="label" color="faint" style={{ width: SET_COL.setNo, textAlign: 'center' }}>
                {t('workout.setShort').toUpperCase()}
              </Text>
              <View style={{ flex: 1.1 }} />
              {fields.weight ? <Text variant="label" color="faint" style={styles.col}>{(unitLabels[units.weight] ?? units.weight).toUpperCase()}</Text> : null}
              {fields.reps ? <Text variant="label" color="faint" style={styles.col}>{t('workout.reps').toUpperCase()}</Text> : null}
              {fields.distance ? <Text variant="label" color="faint" style={styles.col}>{(unitLabels[units.distance] ?? units.distance).toUpperCase()}</Text> : null}
              {fields.duration ? <Text variant="label" color="faint" style={styles.col}>{t('workout.time').toUpperCase()}</Text> : null}
            </View>
            {e.sets.map((s, i) => {
              const asActive: ActiveSet = { ...s, completed: false, completedAt: null, previous: null };
              return (
                <SetRow
                  key={s.id}
                  set={asActive}
                  index={i}
                  fields={fields}
                  units={units}
                  showRpe={false}
                  hideCheck
                  typeLabel={(type: SetType) => t(`workout.setTypeShort.${type}`)}
                  activeId={e.id}
                  onChange={(exId, setId, patch) => draft.updateSet(exId, setId, patch)}
                  onToggle={() => {}}
                  onDelete={(exId, setId) => draft.removeSet(exId, setId)}
                  onTypePress={(exId, setId) => setSheet({ kind: 'setType', id: exId, setId })}
                />
              );
            })}
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
              <Button title={t('workout.addSet')} variant="secondary" size="sm" full icon={<Icon icon={Plus} size={16} />} onPress={() => draft.addSet(e.id)} haptic="selection" />
            </View>
          </View>
        );
      })}
      <Button
        title={t('workout.addExercise')}
        size="lg"
        full
        variant={draft.exercises.length === 0 ? 'primary' : 'secondary'}
        icon={<Icon icon={Plus} size={20} color={draft.exercises.length === 0 ? 'onAccent' : 'text'} strokeWidth={2.5} />}
        onPress={() => push({ pathname: '/exercise/picker', params: { mode: 'routine', token } })}
      />

      <Sheet visible={sheet.kind === 'menu'} onClose={() => setSheet({ kind: 'none' })} flush>
        {current ? (
          <View style={{ paddingHorizontal: spacing.sm }}>
            <ListItem
              title={current.supersetGroup == null ? t('workout.createSuperset') : t('workout.removeFromSuperset')}
              left={<Icon icon={current.supersetGroup == null ? Link : Unlink} />}
              onPress={() => {
                if (current.supersetGroup != null) {
                  draft.setSuperset([current.id], null);
                  setSheet({ kind: 'none' });
                } else setSheet({ kind: 'superset', id: current.id });
              }}
            />
            {currentIndex > 0 ? <ListItem title={`${t('workout.reorder')} ↑`} left={<Icon icon={ArrowUp} />} onPress={() => { draft.move(currentIndex, currentIndex - 1); setSheet({ kind: 'none' }); }} /> : null}
            {currentIndex < draft.exercises.length - 1 ? <ListItem title={`${t('workout.reorder')} ↓`} left={<Icon icon={ArrowDown} />} onPress={() => { draft.move(currentIndex, currentIndex + 1); setSheet({ kind: 'none' }); }} /> : null}
            <ListItem title={t('workout.removeExercise')} titleColor={c.danger} left={<Icon icon={Trash2} color="danger" />} onPress={() => { draft.removeExercise(current.id); setSheet({ kind: 'none' }); }} />
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={sheet.kind === 'superset'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.createSuperset')} flush>
        <View style={{ paddingHorizontal: spacing.sm }}>
          {draft.exercises
            .filter((e) => e.id !== current?.id)
            .map((e) => (
              <ListItem key={e.id} title={exerciseName(exMap.get(e.exerciseId) ?? { nameEn: '', nameRu: '', isCustom: true }, i18n.language)} onPress={() => { if (current) draft.setSuperset([current.id, e.id], e.supersetGroup ?? -1); setSheet({ kind: 'none' }); }} />
            ))}
        </View>
      </Sheet>

      <Sheet visible={sheet.kind === 'rest'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.restTimer')}>
        <View style={styles.restGrid}>
          {REST_OPTIONS.map((sec) => (
            <Pressable key={sec} haptic="selection" onPress={() => { if (current) draft.setRest(current.id, sec); setSheet({ kind: 'none' }); }} style={[styles.restOpt, { backgroundColor: current?.restSeconds === sec ? c.text : c.surfaceAlt }]}>
              <Text variant="bodyMedium" color={current?.restSeconds === sec ? c.bg : c.text} tabular>
                {sec === 0 ? t('workout.restOff') : formatDuration(sec)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button title={t('workout.restDefault', { sec: formatDuration(settings.defaultRestSeconds) })} variant="ghost" full onPress={() => { if (current) draft.setRest(current.id, null); setSheet({ kind: 'none' }); }} style={{ marginTop: spacing.md }} />
      </Sheet>

      <Sheet visible={sheet.kind === 'setType'} onClose={() => setSheet({ kind: 'none' })} title={t('workout.setType')} flush>
        <View style={{ paddingHorizontal: spacing.sm }}>
          {(['normal', 'warmup', 'drop', 'failure'] as SetType[]).map((type) => (
            <ListItem key={type} title={t(`workout.setTypes.${type}`)} onPress={() => { if (sheet.kind === 'setType') draft.updateSet(sheet.id, sheet.setId, { type }); setSheet({ kind: 'none' }); }} />
          ))}
          <ListItem title={t('workout.deleteSet')} titleColor={c.danger} left={<Icon icon={Trash2} color="danger" />} onPress={() => { if (sheet.kind === 'setType') draft.removeSet(sheet.id, sheet.setId); setSheet({ kind: 'none' }); }} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { borderRadius: radius.lg, paddingVertical: spacing.md, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  restBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: spacing.sm + 2, borderRadius: radius.pill },
  menuBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  note: { fontFamily: fonts.regular, fontSize: 14, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
  col: { flex: 1, textAlign: 'center' },
  restGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  restOpt: { width: '30%', flexGrow: 1, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
