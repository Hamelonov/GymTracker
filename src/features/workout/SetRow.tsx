import React, { memo } from 'react';
import { Pressable as NativePressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';
import { isSetFilled } from '@/domain/summary';
import type {
  ActiveSet,
  DistanceUnit,
  ExtraField,
  SetFields,
  SetType,
  SetValues,
  WeightUnit,
} from '@/domain/types';
import { Text, layout, playHaptic, spacing, useColors } from '@/ui';
import { formatSetValues } from './format';
import { SetCheckButton } from './SetCheckButton';
import { SetDeleteAction } from './SetDeleteAction';
import { PREVIOUS_COLUMN_FLEX, SET_COLUMN_WIDTHS, getSetColumnGap } from './setRowLayout';
import { SetTypeMark } from './SetTypeMark';
import { SetValueFields } from './SetValueFields';

export interface SetRowProps {
  set: ActiveSet;
  index: number;
  fields: SetFields;
  units: { weight: WeightUnit; distance: DistanceUnit };
  /** Включённые дополнительные колонки карточки; передавайте стабильную ссылку. */
  extraFields: ExtraField[];
  readOnly?: boolean;
  hideCheck?: boolean;
  /** Убирает колонку «прошлый»: поля растягиваются. Нужно шаблону, у него нет прошлого раза. */
  hidePrevious?: boolean;
  /** Первый невыполненный подход блока: его отметка чёрная и сама ведёт палец и глаз. */
  isNextSet?: boolean;
  /** Плотный режим для упражнений с дополнительными колонками. */
  isDense?: boolean;
  /** Подпись отметки для экранного диктора. Приходит строкой, чтобы строка не подписывалась на перевод. */
  completeSetLabel?: string;
  /** Id упражнения-владельца; передаётся обратно в каждый обработчик. */
  workoutExerciseId: string;
  onChange: (workoutExerciseId: string, setId: string, patch: Partial<SetValues>) => void;
  onToggle: (workoutExerciseId: string, setId: string) => void;
  onDelete: (workoutExerciseId: string, setId: string) => void;
  onSetTypePress: (workoutExerciseId: string, setId: string) => void;
  formatSetTypeLabel: (type: SetType) => string;
}

export const SetRow = memo(function SetRow({
  set,
  index,
  fields,
  units,
  extraFields,
  readOnly,
  hideCheck,
  hidePrevious,
  isNextSet,
  isDense,
  completeSetLabel,
  workoutExerciseId,
  onChange: onChangeById,
  onToggle: onToggleById,
  onDelete: onDeleteById,
  onSetTypePress: onTypePressById,
  formatSetTypeLabel,
}: SetRowProps) {
  const colors = useColors();
  const updateValues = (patch: Partial<SetValues>) => onChangeById(workoutExerciseId, set.id, patch);
  const deleteSet = () => onDeleteById(workoutExerciseId, set.id);
  const openSetTypePicker = () => {
    onTypePressById(workoutExerciseId, set.id);
    playHaptic('selection');
  };
  // Сначала меняем экран, вибрация не должна откладывать смену цвета.
  const toggleCompleted = () => {
    onToggleById(workoutExerciseId, set.id);
    playHaptic(set.completed ? 'light' : 'medium');
  };
  // Пустой подход (ничего не введено или одни нули) нельзя отметить выполненным. Пустые
  // поля при завершении заполняются значениями с прошлого раза, поэтому они тоже считаются.
  const valuesOnCompletion: SetValues = {
    weightKg: set.weightKg ?? set.previous?.weightKg ?? null,
    reps: set.reps ?? set.previous?.reps ?? null,
    durationSec: set.durationSec ?? set.previous?.durationSec ?? null,
    distanceM: set.distanceM ?? set.previous?.distanceM ?? null,
    rpe: set.rpe,
    rir: set.rir,
  };
  const canComplete = set.completed || isSetFilled(valuesOnCompletion, fields);
  const previousSetText = set.previous
    ? formatSetValues(set.previous, fields, units, { unitLabel: false })
    : '—';
  const setTypeLabel = set.type === 'normal' ? String(index + 1) : formatSetTypeLabel(set.type);

  const renderDeleteAction = (
    progress: SharedValue<number>,
    _dragOffset: SharedValue<number>,
    swipeableMethods: SwipeableMethods,
  ) => (
    <SetDeleteAction
      progress={progress}
      onPress={() => {
        swipeableMethods.close();
        deleteSet();
      }}
    />
  );

  const rowContent = (
    <View
      style={[
        styles.row,
        {
          gap: getSetColumnGap(isDense),
          backgroundColor: set.completed ? colors.accentSoft : colors.background,
        },
      ]}
    >
      <NativePressable onPress={openSetTypePicker} disabled={readOnly} style={styles.setNumberColumn}>
        <SetTypeMark
          type={set.type}
          label={setTypeLabel}
          isPending={!set.completed && !isNextSet}
          isNextSet={isNextSet}
        />
      </NativePressable>
      {hidePrevious ? null : (
        <View style={styles.previousColumn}>
          {/* На полосе маркера бледный цвет не проходит по контрасту. */}
          <Text variant="caption" color={set.completed ? 'muted' : 'faint'} numberOfLines={1} tabular>
            {previousSetText}
          </Text>
        </View>
      )}
      <SetValueFields
        set={set}
        fields={fields}
        extraFields={extraFields}
        units={units}
        isEditable={!readOnly}
        isDense={isDense}
        onChange={updateValues}
      />
      {!readOnly && !hideCheck ? (
        <SetCheckButton
          isCompleted={set.completed}
          canComplete={canComplete}
          isNextSet={isNextSet}
          label={completeSetLabel}
          onPress={toggleCompleted}
        />
      ) : null}
    </View>
  );

  if (readOnly) return rowContent;
  return (
    <ReanimatedSwipeable
      renderRightActions={renderDeleteAction}
      friction={1.6}
      rightThreshold={48}
      overshootRight={false}
    >
      {rowContent}
    </ReanimatedSwipeable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.setRowHeight,
    paddingHorizontal: spacing.lg,
  },
  setNumberColumn: {
    width: SET_COLUMN_WIDTHS.setNumber,
    height: layout.setCellHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousColumn: { flex: PREVIOUS_COLUMN_FLEX },
});
