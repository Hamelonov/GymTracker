import { Ellipsis, Link, Plus, StickyNote } from 'lucide-react-native';
import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import { MuscleThumbnail } from '@/features/muscles/MuscleThumbnail';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise, SetType, SetValues, DistanceUnit, WeightUnit } from '@/domain/types';
import { getSetFieldsForExerciseType } from '@/domain/types';
import { Button, Icon, IconButton, Text, layout, spacing, useColors } from '@/ui';
import { unitLabels } from '@/domain/units';
import { SetColumnHeaders } from './SetColumnHeaders';
import { SetRow } from './SetRow';

export interface ExerciseCardProps {
  workoutExercise: ActiveExercise;
  exerciseDetails: ExerciseRow | undefined;
  units: { weight: WeightUnit; distance: DistanceUnit };
  readOnly?: boolean;
  /** У первого блока на странице нет линии и воздуха сверху. */
  isFirst: boolean;
  /** Все обработчики получают id активного упражнения; передавайте стабильные ссылки. */
  onMenu: (workoutExerciseId: string) => void;
  onNotePress: (workoutExerciseId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onSetChange: (workoutExerciseId: string, setId: string, patch: Partial<SetValues>) => void;
  onSetToggle: (workoutExerciseId: string, setId: string) => void;
  onSetDelete: (workoutExerciseId: string, setId: string) => void;
  onSetTypePress: (workoutExerciseId: string, setId: string) => void;
}

const MUSCLE_THUMBNAIL_SIZE = 40;
// Значок 20 в кнопке 40 отступает от её края на 10: со сдвигом он стоит на линии поля экрана.
const HEADER_ACTIONS_EDGE_OFFSET = -10;

/** «−» у упражнений с помощью, «+» у дополнительного веса там, где своего поля веса нет. */
function getWeightSign(type: ExerciseRow['type'] | undefined, hasWeightField: boolean): string {
  if (type === 'assisted_bodyweight') return '−';
  if (!hasWeightField) return '+';
  return '';
}

/** Блок упражнения на всю ширину экрана: без карточки, чтобы полоса маркера шла от края до края. */
export const ExerciseCard = memo(function ExerciseCard({
  workoutExercise,
  exerciseDetails,
  units,
  readOnly,
  isFirst,
  onMenu,
  onNotePress,
  onAddSet,
  onSetChange,
  onSetToggle,
  onSetDelete,
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
  const isDense = extraFields.length > 0;
  const isInSuperset = workoutExercise.supersetGroup != null;
  const completedSetCount = workoutExercise.sets.filter((set) => set.completed).length;
  // Считается здесь: при отметке меняется булев флаг только у двух строк, остальные не перерисовываются.
  const nextSetId = workoutExercise.sets.find((set) => !set.completed)?.id;
  // Упражнения с помощью вычитают введённый вес из веса тела, отсюда знак минус.
  const weightSign = getWeightSign(exerciseDetails?.type, fields.weight);
  const weightColumnLabel = weightSign + (unitLabels[units.weight] ?? units.weight).toUpperCase();
  const distanceColumnLabel = (unitLabels[units.distance] ?? units.distance).toUpperCase();

  return (
    <View style={isFirst ? null : [styles.blockAfterFirst, { borderTopColor: colors.border }]}>
      <View style={styles.header}>
        {exerciseDetails ? (
          <MuscleThumbnail
            primary={exerciseDetails.muscleGroup}
            secondary={exerciseDetails.secondaryMuscles}
            size={MUSCLE_THUMBNAIL_SIZE}
          />
        ) : null}
        <View style={styles.titleColumn}>
          <Text variant="h3" numberOfLines={2}>
            {name}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption" color="muted" tabular>
              {completedSetCount}/{workoutExercise.sets.length}
            </Text>
            {isInSuperset ? (
              <View style={styles.supersetTag}>
                <Icon icon={Link} size={12} color="muted" />
                <Text variant="label" color="muted">
                  {translate('workout.superset').toUpperCase()} {workoutExercise.supersetGroup}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {!readOnly ? (
          <View style={styles.headerActions}>
            <IconButton
              icon={StickyNote}
              variant={hasNote ? 'accent' : 'plain'}
              label={translate('workout.exerciseNote')}
              onPress={() => onNotePress(workoutExercise.id)}
              haptic="selection"
            />
            <IconButton
              icon={Ellipsis}
              label={translate('common.menu')}
              onPress={() => onMenu(workoutExercise.id)}
              haptic="selection"
            />
          </View>
        ) : null}
      </View>

      <SetColumnHeaders
        fields={fields}
        extraFields={extraFields}
        weightColumnLabel={weightColumnLabel}
        distanceColumnLabel={distanceColumnLabel}
        isDense={isDense}
        hasCheckColumn={!readOnly}
      />

      {workoutExercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          index={index}
          fields={fields}
          units={units}
          extraFields={extraFields}
          readOnly={readOnly}
          isNextSet={set.id === nextSetId}
          isDense={isDense}
          completeSetLabel={translate('workout.completeSet')}
          formatSetTypeLabel={shortSetTypeLabel}
          workoutExerciseId={workoutExercise.id}
          onChange={onSetChange}
          onToggle={onSetToggle}
          onDelete={onSetDelete}
          onSetTypePress={onSetTypePress}
        />
      ))}

      {!readOnly ? (
        <View style={styles.addSetWrapper}>
          <Button
            title={translate('workout.addSet')}
            variant="secondary"
            fullWidth
            icon={<Icon icon={Plus} size={20} />}
            onPress={() => onAddSet(workoutExercise.id)}
            haptic="selection"
            debounceMs={0}
          />
        </View>
      ) : null}

      {/* Последним: строки подходов непрозрачные и иначе закрыли бы полосу. */}
      {isInSuperset ? (
        <View pointerEvents="none" style={[styles.supersetBar, { backgroundColor: colors.text }]} />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  blockAfterFirst: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  supersetBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.rowMinHeight,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  titleColumn: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supersetTag: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: HEADER_ACTIONS_EDGE_OFFSET,
  },
  addSetWrapper: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
});
