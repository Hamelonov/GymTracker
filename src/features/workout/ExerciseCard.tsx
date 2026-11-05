import { Ellipsis, Link, Plus, StickyNote } from 'lucide-react-native';
import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise, SetType, SetValues, DistanceUnit, WeightUnit } from '@/domain/types';
import { getSetFieldsForExerciseType } from '@/domain/types';
import { Button, Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { unitLabels } from '@/domain/units';
import { NARROW_COLUMN_FLEX, SET_COLUMN_WIDTHS, SetRow } from './SetRow';

export interface ExerciseCardProps {
  workoutExercise: ActiveExercise;
  exerciseDetails: ExerciseRow | undefined;
  units: { weight: WeightUnit; distance: DistanceUnit };
  readOnly?: boolean;
  supersetColor?: string | null;
  /** Все обработчики получают id активного упражнения; передавайте стабильные ссылки. */
  onMenu: (workoutExerciseId: string) => void;
  onNotePress: (workoutExerciseId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onSetChange: (workoutExerciseId: string, setId: string, patch: Partial<SetValues>) => void;
  onSetToggle: (workoutExerciseId: string, setId: string) => void;
  onSetTypePress: (workoutExerciseId: string, setId: string) => void;
}

/** «−» у упражнений с помощью, «+» у дополнительного веса там, где своего поля веса нет. */
function getWeightSign(type: ExerciseRow['type'] | undefined, hasWeightField: boolean): string {
  if (type === 'assisted_bodyweight') return '−';
  if (!hasWeightField) return '+';
  return '';
}

export const ExerciseCard = memo(function ExerciseCard({
  workoutExercise,
  exerciseDetails,
  units,
  readOnly,
  supersetColor,
  onMenu,
  onNotePress,
  onAddSet,
  onSetChange,
  onSetToggle,
  onSetTypePress,
}: ExerciseCardProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const fields = getSetFieldsForExerciseType(exerciseDetails?.type ?? 'weight_reps');
  const name = exerciseDetails ? exerciseName(exerciseDetails, i18n.language) : '…';
  const shortSetTypeLabel = useCallback(
    (type: SetType) => translate(`workout.setTypeShort.${type}`),
    [translate],
  );
  const hasNote = workoutExercise.note.trim().length > 0;
  const extraFields = workoutExercise.extraFields;
  const showsWeightColumn = fields.weight || extraFields.includes('weight');
  // Упражнения с помощью вычитают введённый вес из веса тела, отсюда знак минус.
  const weightSign = getWeightSign(exerciseDetails?.type, fields.weight);
  const weightColumnLabel = weightSign + (unitLabels[units.weight] ?? units.weight).toUpperCase();
  const distanceColumnLabel = (unitLabels[units.distance] ?? units.distance).toUpperCase();

  return (
    <Animated.View
      layout={LinearTransition.duration(110)}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      {supersetColor ? <View style={[styles.supersetBar, { backgroundColor: supersetColor }]} /> : null}
      <View style={styles.header}>
        {exerciseDetails ? (
          <MuscleThumbnail
            primary={exerciseDetails.muscleGroup}
            secondary={exerciseDetails.secondaryMuscles}
            size={36}
          />
        ) : null}
        <View style={styles.titleWrapper}>
          <Text variant="h3" numberOfLines={2}>
            {name}
          </Text>
          {workoutExercise.supersetGroup != null ? (
            <View style={styles.supersetTag}>
              <Icon icon={Link} size={12} color={supersetColor ?? 'muted'} />
              <Text variant="label" color={supersetColor ?? 'muted'}>
                {translate('workout.superset').toUpperCase()} {workoutExercise.supersetGroup}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {!readOnly ? (
            <Pressable
              onPress={() => onNotePress(workoutExercise.id)}
              haptic="selection"
              hitSlop={6}
              style={[styles.iconButton, { backgroundColor: hasNote ? colors.accent : colors.surfaceAlt }]}
            >
              <Icon icon={StickyNote} size={17} color={hasNote ? 'onAccent' : 'text'} />
            </Pressable>
          ) : null}
          {!readOnly ? (
            <Pressable
              onPress={() => onMenu(workoutExercise.id)}
              haptic="selection"
              hitSlop={6}
              style={[styles.iconButton, { backgroundColor: colors.surfaceAlt }]}
            >
              <Icon icon={Ellipsis} size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.columnHeader}>
        <Text
          variant="label"
          color="faint"
          style={{ width: SET_COLUMN_WIDTHS.setNumber, textAlign: 'center' }}
        >
          {translate('workout.setShort').toUpperCase()}
        </Text>
        <Text variant="label" color="faint" style={{ flex: 1.1, textAlign: 'center' }}>
          {translate('workout.previous').toUpperCase()}
        </Text>
        {showsWeightColumn ? (
          <Text variant="label" color="faint" style={styles.column}>
            {weightColumnLabel}
          </Text>
        ) : null}
        {fields.reps ? (
          <Text variant="label" color="faint" style={styles.column}>
            {translate('workout.reps').toUpperCase()}
          </Text>
        ) : null}
        {fields.distance ? (
          <Text variant="label" color="faint" style={styles.column}>
            {distanceColumnLabel}
          </Text>
        ) : null}
        {fields.duration ? (
          <Text variant="label" color="faint" style={styles.column}>
            {translate('workout.time').toUpperCase()}
          </Text>
        ) : null}
        {extraFields.includes('rir') ? (
          <Text variant="label" color="faint" style={styles.narrowColumn}>
            {translate('workout.rir')}
          </Text>
        ) : null}
        {extraFields.includes('rpe') ? (
          <Text variant="label" color="faint" style={styles.narrowColumn}>
            {translate('workout.rpe')}
          </Text>
        ) : null}
        {!readOnly ? <View style={{ width: SET_COLUMN_WIDTHS.checkButton }} /> : null}
      </View>

      {workoutExercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          index={index}
          fields={fields}
          units={units}
          extraFields={extraFields}
          readOnly={readOnly}
          formatSetTypeLabel={shortSetTypeLabel}
          workoutExerciseId={workoutExercise.id}
          onChange={onSetChange}
          onToggle={onSetToggle}
          onSetTypePress={onSetTypePress}
        />
      ))}

      {!readOnly ? (
        <View style={styles.addSetWrapper}>
          <Button
            title={translate('workout.addSet')}
            variant="secondary"
            size="sm"
            fullWidth
            icon={<Icon icon={Plus} size={16} />}
            onPress={() => onAddSet(workoutExercise.id)}
            haptic="selection"
          />
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  supersetBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, gap: spacing.sm },
  titleWrapper: { flex: 1, paddingTop: 4 },
  supersetTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  column: { flex: 1, textAlign: 'center' },
  narrowColumn: { flex: NARROW_COLUMN_FLEX, textAlign: 'center' },
  addSetWrapper: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
});
