import { Check, Trash2 } from 'lucide-react-native';
import React, { memo, useState } from 'react';
import { Pressable as RNPressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  interpolate,
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/store/settings';
import type {
  ActiveSet,
  ExtraField,
  SetFields,
  SetType,
  WeightUnit,
  DistanceUnit,
  SetValues,
} from '@/domain/types';
import {
  durationToInput,
  kgToUnit,
  metersToUnit,
  parseDurationInput,
  parseNumberInput,
  roundForDisplay,
  formatNumberWithoutTrailingZeros,
  unitToKg,
  unitToMeters,
} from '@/domain/units';
import { Icon, Pressable, Text, fonts, radius, spacing, useColors } from '@/ui';
import { formatSetValues } from './format';
import { isSetFilled } from '@/domain/summary';

export interface SetRowProps {
  set: ActiveSet;
  index: number;
  fields: SetFields;
  units: { weight: WeightUnit; distance: DistanceUnit };
  /** Включённые дополнительные колонки карточки; передавайте стабильную ссылку. */
  extraFields: ExtraField[];
  readOnly?: boolean;
  hideCheck?: boolean;
  /** Id упражнения-владельца; передаётся обратно в каждый обработчик. */
  workoutExerciseId: string;
  onChange: (workoutExerciseId: string, setId: string, patch: Partial<SetValues>) => void;
  onToggle: (workoutExerciseId: string, setId: string) => void;
  onDelete: (workoutExerciseId: string, setId: string) => void;
  onSetTypePress: (workoutExerciseId: string, setId: string) => void;
  formatSetTypeLabel: (type: SetType) => string;
}

function NumberField({
  value,
  onCommit,
  placeholder,
  parse,
  format,
  editable,
  highlight,
  narrow,
}: {
  value: number | null;
  onCommit: (value: number | null) => void;
  placeholder: string;
  parse: (text: string) => number | null;
  format: (value: number | null) => string;
  editable: boolean;
  highlight: boolean;
  /** Узкая колонка для RIR и RPE, чтобы основные значения не теснились. */
  narrow?: boolean;
}) {
  const colors = useColors();
  const [text, setText] = useState(() => format(value));
  const [isFocused, setIsFocused] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  // Подхватываем изменения значений, сделанные в другом месте, но никогда не затираем то, что пользователь сейчас вводит.
  if (value !== previousValue) {
    setPreviousValue(value);
    if (!isFocused) setText(format(value));
  }
  return (
    <TextInput
      value={text}
      editable={editable}
      onChangeText={(newText) => {
        setText(newText);
        onCommit(parse(newText));
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setText(format(value));
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType="decimal-pad"
      selectTextOnFocus
      selectionColor={colors.accent}
      cursorColor={colors.text}
      style={[
        styles.input,
        narrow ? styles.inputNarrow : null,
        { color: colors.text, backgroundColor: highlight ? 'transparent' : colors.inputBackground },
        isFocused ? { borderColor: colors.text } : null,
      ]}
    />
  );
}

function DeleteAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const colors = useColors();
  const fadeInStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View style={fadeInStyle}>
      <Pressable
        onPress={onPress}
        style={[styles.deleteButton, { backgroundColor: colors.danger }]}
        haptic="medium"
      >
        <Icon icon={Trash2} size={20} color={colors.background} />
      </Pressable>
    </Animated.View>
  );
}

/** Форматирует значение с прошлого раза как плейсхолдер или пустую строку, если его не было. */
function placeholderFromPrevious(
  previousValue: number | null | undefined,
  format: (value: number) => string,
): string {
  return previousValue != null ? format(previousValue) : '';
}

export const SetRow = memo(function SetRow({
  set,
  index,
  fields,
  units,
  extraFields,
  readOnly,
  hideCheck,
  workoutExerciseId,
  onChange: onChangeById,
  onToggle: onToggleById,
  onDelete: onDeleteById,
  onSetTypePress: onTypePressById,
  formatSetTypeLabel,
}: SetRowProps) {
  const updateValues = (patch: Partial<SetValues>) => onChangeById(workoutExerciseId, set.id, patch);
  const toggleCompleted = () => onToggleById(workoutExerciseId, set.id);
  const deleteSet = () => onDeleteById(workoutExerciseId, set.id);
  const openSetTypePicker = () => onTypePressById(workoutExerciseId, set.id);
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
  const colors = useColors();
  const hapticsEnabled = useSettings((state) => state.haptics);
  const rowBackgroundStyle = { backgroundColor: set.completed ? colors.accentSoft : colors.surface };
  const previousSetText = set.previous
    ? formatSetValues(set.previous, fields, units, { unitLabel: false })
    : '—';
  const isNormalSet = set.type === 'normal';
  const showsWeight = fields.weight || extraFields.includes('weight');

  const formatWeightForInput = (weightKg: number) =>
    formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(weightKg, units.weight)));
  const formatDistanceForInput = (meters: number) =>
    formatNumberWithoutTrailingZeros(roundForDisplay(metersToUnit(meters, units.distance)));

  const renderDeleteAction = (
    progress: SharedValue<number>,
    _dragOffset: SharedValue<number>,
    swipeableMethods: SwipeableMethods,
  ) => (
    <DeleteAction
      progress={progress}
      onPress={() => {
        swipeableMethods.close();
        deleteSet();
      }}
    />
  );

  const rowContent = (
    <Animated.View style={[styles.row, rowBackgroundStyle]} layout={LinearTransition.duration(110)}>
      <Pressable
        onPress={openSetTypePicker}
        disabled={readOnly}
        style={[styles.setNumberBadge, { backgroundColor: isNormalSet ? colors.surfaceAlt : colors.text }]}
        haptic="selection"
      >
        <Text variant="caption" color={isNormalSet ? colors.text : colors.background} tabular>
          {isNormalSet ? String(index + 1) : formatSetTypeLabel(set.type)}
        </Text>
      </Pressable>
      <View style={styles.previousColumn}>
        <Text variant="caption" color="faint" numberOfLines={1} tabular>
          {previousSetText}
        </Text>
      </View>
      {showsWeight ? (
        <NumberField
          value={set.weightKg}
          onCommit={(value) =>
            updateValues({ weightKg: value == null ? null : unitToKg(value, units.weight) })
          }
          placeholder={placeholderFromPrevious(set.previous?.weightKg, formatWeightForInput)}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : formatWeightForInput(value))}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {fields.reps ? (
        <NumberField
          value={set.reps}
          onCommit={(value) => updateValues({ reps: value == null ? null : Math.round(value) })}
          placeholder={placeholderFromPrevious(set.previous?.reps, (reps) => String(reps))}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : String(value))}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {fields.distance ? (
        <NumberField
          value={set.distanceM}
          onCommit={(value) =>
            updateValues({ distanceM: value == null ? null : unitToMeters(value, units.distance) })
          }
          placeholder={placeholderFromPrevious(set.previous?.distanceM, formatDistanceForInput)}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : formatDistanceForInput(value))}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {fields.duration ? (
        <NumberField
          value={set.durationSec}
          onCommit={(value) => updateValues({ durationSec: value })}
          placeholder={placeholderFromPrevious(set.previous?.durationSec, (seconds) =>
            durationToInput(seconds),
          )}
          parse={parseDurationInput}
          format={(value) => durationToInput(value)}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {extraFields.includes('rir') ? (
        <NumberField
          value={set.rir}
          onCommit={(value) =>
            updateValues({ rir: value == null ? null : Math.min(10, Math.max(0, Math.round(value))) })
          }
          placeholder={placeholderFromPrevious(set.previous?.rir, (rir) => String(rir))}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : String(value))}
          editable={!readOnly}
          highlight={set.completed}
          narrow
        />
      ) : null}
      {extraFields.includes('rpe') ? (
        <NumberField
          value={set.rpe}
          onCommit={(value) => updateValues({ rpe: value == null ? null : Math.min(10, Math.max(1, value)) })}
          placeholder={placeholderFromPrevious(set.previous?.rpe, formatNumberWithoutTrailingZeros)}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : formatNumberWithoutTrailingZeros(value))}
          editable={!readOnly}
          highlight={set.completed}
          narrow
        />
      ) : null}
      {!readOnly && !hideCheck ? (
        <RNPressable
          disabled={!canComplete}
          onPress={() => {
            if (hapticsEnabled)
              void Haptics.impactAsync(
                set.completed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
              );
            toggleCompleted();
          }}
          hitSlop={6}
          style={[
            styles.checkButton,
            {
              backgroundColor: set.completed ? colors.text : colors.surfaceAlt,
              opacity: canComplete ? 1 : 0.35,
            },
          ]}
        >
          <Icon
            icon={Check}
            size={18}
            color={set.completed ? colors.accent : colors.textFaint}
            strokeWidth={3}
          />
        </RNPressable>
      ) : null}
    </Animated.View>
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

export const SET_COLUMN_WIDTHS = {
  setNumber: 36,
  checkButton: 40,
};

/** Доля ширины узких колонок RIR и RPE относительно основных. */
export const NARROW_COLUMN_FLEX = 0.75;

/** Стабильная пустая ссылка для карточек без дополнительных колонок (редактор программ). */
export const NO_EXTRA_FIELDS: ExtraField[] = [];

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
    paddingHorizontal: spacing.lg,
  },
  setNumberBadge: {
    width: SET_COLUMN_WIDTHS.setNumber,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousColumn: { flex: 1.1, alignItems: 'center' },
  input: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 16,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  inputNarrow: { flex: NARROW_COLUMN_FLEX },
  checkButton: {
    width: SET_COLUMN_WIDTHS.checkButton,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 72,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
    marginRight: spacing.lg,
    borderRadius: radius.sm,
  },
});
