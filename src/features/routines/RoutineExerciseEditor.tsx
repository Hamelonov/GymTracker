import { Ellipsis, Plus, Timer } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import {
  getSetFieldsForExerciseType,
  type ActiveSet,
  type DistanceUnit,
  type SetType,
  type WeightUnit,
} from '@/domain/types';
import { formatDuration, unitLabels } from '@/domain/units';
import { NO_EXTRA_FIELDS, SET_COLUMN_WIDTHS, SetRow } from '@/features/workout/SetRow';
import { useRoutineDraft, type DraftExercise } from '@/store/routineDraft';
import { Button, Icon, Pressable, Text, fonts, radius, spacing, useColors } from '@/ui';

interface RoutineExerciseEditorProps {
  draftExercise: DraftExercise;
  /** Запись из библиотеки для упражнения; undefined, пока она ещё загружается. */
  exercise: ExerciseRow | undefined;
  units: { weight: WeightUnit; distance: DistanceUnit };
  defaultRestSeconds: number;
  onOpenRestSheet: (draftExerciseId: string) => void;
  onOpenMenuSheet: (draftExerciseId: string) => void;
  onOpenSetTypeSheet: (draftExerciseId: string, setId: string) => void;
}

/** Одна карточка упражнения в редакторе шаблона: название, время отдыха, заметка и запланированные подходы. */
export function RoutineExerciseEditor({
  draftExercise,
  exercise,
  units,
  defaultRestSeconds,
  onOpenRestSheet,
  onOpenMenuSheet,
  onOpenSetTypeSheet,
}: RoutineExerciseEditorProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const setExerciseNote = useRoutineDraft((state) => state.setExerciseNote);
  const updateSet = useRoutineDraft((state) => state.updateSet);
  const removeSet = useRoutineDraft((state) => state.removeSet);
  const addSetToExercise = useRoutineDraft((state) => state.addSetToExercise);
  const fields = getSetFieldsForExerciseType(exercise?.type ?? 'weight_reps');
  const restSeconds = draftExercise.restSeconds;

  const getRestLabel = () => {
    // null означает «использовать значение упражнения по умолчанию», 0 означает, что таймер отдыха выключен.
    if (restSeconds == null) return formatDuration(exercise?.restSeconds ?? defaultRestSeconds);
    if (restSeconds === 0) return translate('workout.restOff');
    return formatDuration(restSeconds);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text variant="h3" numberOfLines={2}>
            {exercise ? exerciseName(exercise, i18n.language) : '…'}
          </Text>
          {draftExercise.supersetGroup != null ? (
            <Text variant="label" color="muted">
              {translate('workout.superset').toUpperCase()} {draftExercise.supersetGroup}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onOpenRestSheet(draftExercise.id)}
          haptic="selection"
          style={[styles.restButton, { backgroundColor: colors.surfaceAlt }]}
        >
          <Icon icon={Timer} size={14} color={restSeconds == null || restSeconds > 0 ? 'text' : 'faint'} />
          <Text variant="label" tabular>
            {getRestLabel()}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onOpenMenuSheet(draftExercise.id)}
          haptic="selection"
          style={[styles.menuButton, { backgroundColor: colors.surfaceAlt }]}
        >
          <Icon icon={Ellipsis} size={18} />
        </Pressable>
      </View>
      <TextInput
        value={draftExercise.note}
        onChangeText={(note) => setExerciseNote(draftExercise.id, note)}
        placeholder={translate('routine.exerciseNotePlaceholder')}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        style={[styles.noteInput, { color: colors.text }]}
      />
      <View style={styles.columnHeaders}>
        <Text
          variant="label"
          color="faint"
          style={{ width: SET_COLUMN_WIDTHS.setNumber, textAlign: 'center' }}
        >
          {translate('workout.setShort').toUpperCase()}
        </Text>
        <View style={{ flex: 1.1 }} />
        {fields.weight ? (
          <Text variant="label" color="faint" style={styles.valueColumn}>
            {(unitLabels[units.weight] ?? units.weight).toUpperCase()}
          </Text>
        ) : null}
        {fields.reps ? (
          <Text variant="label" color="faint" style={styles.valueColumn}>
            {translate('workout.reps').toUpperCase()}
          </Text>
        ) : null}
        {fields.distance ? (
          <Text variant="label" color="faint" style={styles.valueColumn}>
            {(unitLabels[units.distance] ?? units.distance).toUpperCase()}
          </Text>
        ) : null}
        {fields.duration ? (
          <Text variant="label" color="faint" style={styles.valueColumn}>
            {translate('workout.time').toUpperCase()}
          </Text>
        ) : null}
      </View>
      {draftExercise.sets.map((draftSet, index) => {
        // SetRow рассчитан на живые тренировки; подход шаблона показывается как никогда не завершённый.
        const setAsActive: ActiveSet = { ...draftSet, completed: false, completedAt: null, previous: null };
        return (
          <SetRow
            key={draftSet.id}
            set={setAsActive}
            index={index}
            fields={fields}
            units={units}
            extraFields={NO_EXTRA_FIELDS}
            hideCheck
            formatSetTypeLabel={(type: SetType) => translate(`workout.setTypeShort.${type}`)}
            workoutExerciseId={draftExercise.id}
            onChange={(draftExerciseId, setId, patch) => updateSet(draftExerciseId, setId, patch)}
            onToggle={() => {}}
            onDelete={(draftExerciseId, setId) => removeSet(draftExerciseId, setId)}
            onSetTypePress={onOpenSetTypeSheet}
          />
        );
      })}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
        <Button
          title={translate('workout.addSet')}
          variant="secondary"
          size="sm"
          fullWidth
          icon={<Icon icon={Plus} size={16} />}
          onPress={() => addSetToExercise(draftExercise.id)}
          haptic="selection"
          debounceMs={0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, paddingVertical: spacing.md, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  restButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  menuButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  noteInput: { fontFamily: fonts.regular, fontSize: 14, paddingHorizontal: spacing.lg, paddingVertical: 6 },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  valueColumn: { flex: 1, textAlign: 'center' },
});
