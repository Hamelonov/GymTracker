import { Plus } from 'lucide-react-native';
import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise, SetType, SetValues, DistanceUnit, WeightUnit } from '@/domain/types';
import { getSetFieldsForExerciseType } from '@/domain/types';
import { Button, Icon, Text, spacing } from '@/ui';
import { unitLabels } from '@/domain/units';
import { ExerciseCardHeader } from './ExerciseCardHeader';
import { NARROW_COLUMN_FLEX, SET_COLUMN_WIDTHS, SetRow } from './SetRow';

export interface ExerciseCardProps {
  workoutExercise: ActiveExercise;
  exerciseDetails: ExerciseRow | undefined;
  units: { weight: WeightUnit; distance: DistanceUnit };
  readOnly?: boolean;
  supersetColor?: string | null;
  /** Отдых после подхода у этого упражнения, секунды; 0 — таймер выключен. */
  restSeconds: number;
  /** Все обработчики получают id активного упражнения; передавайте стабильные ссылки. */
  onMenu: (workoutExerciseId: string) => void;
  onNotePress: (workoutExerciseId: string) => void;
  onDescriptionPress: (workoutExerciseId: string) => void;
  onRestPress: (workoutExerciseId: string) => void;
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
  restSeconds,
  onMenu,
  onNotePress,
  onDescriptionPress,
  onRestPress,
  onAddSet,
  onSetChange,
  onSetToggle,
  onSetTypePress,
}: ExerciseCardProps) {
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
    <Animated.View layout={LinearTransition.duration(110)} style={styles.card}>
      {supersetColor ? <View style={[styles.supersetBar, { backgroundColor: supersetColor }]} /> : null}
      <ExerciseCardHeader
        name={name}
        supersetGroup={workoutExercise.supersetGroup}
        supersetColor={supersetColor}
        hasNote={hasNote}
        restSeconds={restSeconds}
        readOnly={readOnly}
        onDescriptionPress={() => onDescriptionPress(workoutExercise.id)}
        onMenuPress={() => onMenu(workoutExercise.id)}
        onRestPress={() => onRestPress(workoutExercise.id)}
        onNotePress={() => onNotePress(workoutExercise.id)}
      />

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
  // Фона у карточки нет: упражнения идут прямо по странице на всю ширину, как в Hevy.
  card: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  supersetBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
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
