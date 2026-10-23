import { Check, Trash2 } from 'lucide-react-native';
import React, { memo, useState } from 'react';
import { Pressable as RNPressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { interpolate, LinearTransition, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/store/settings';
import type { ActiveSet, SetFields, SetType, WeightUnit, DistanceUnit, SetValues } from '@/domain/types';
import {
  durationToInput,
  kgToUnit,
  metersToUnit,
  parseDurationInput,
  parseNumberInput,
  roundDisplay,
  trimNumber,
  unitToKg,
  unitToMeters,
} from '@/domain/units';
import { Icon, Pressable, Text, fonts, radius, spacing, useColors } from '@/ui';
import { formatSetValues } from './format';

export interface SetRowProps {
  set: ActiveSet;
  index: number;
  fields: SetFields;
  units: { weight: WeightUnit; distance: DistanceUnit };
  showRpe: boolean;
  readOnly?: boolean;
  hideCheck?: boolean;
  /** Id of the owning exercise; passed back to every handler. */
  activeId: string;
  onChange: (activeId: string, setId: string, patch: Partial<SetValues>) => void;
  onToggle: (activeId: string, setId: string) => void;
  onDelete: (activeId: string, setId: string) => void;
  onTypePress: (activeId: string, setId: string) => void;
  typeLabel: (type: SetType) => string;
}

function NumField({
  value,
  onCommit,
  placeholder,
  parse,
  format,
  editable,
  highlight,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  placeholder: string;
  parse: (t: string) => number | null;
  format: (v: number | null) => string;
  editable: boolean;
  highlight: boolean;
}) {
  const c = useColors();
  const [text, setText] = useState(() => format(value));
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setText(format(value));
  }
  return (
    <TextInput
      value={text}
      editable={editable}
      onChangeText={(t) => {
        setText(t);
        onCommit(parse(t));
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(format(value));
      }}
      placeholder={placeholder}
      placeholderTextColor={c.textFaint}
      keyboardType="decimal-pad"
      selectTextOnFocus
      selectionColor={c.accent}
      cursorColor={c.text}
      style={[
        styles.input,
        { color: c.text, backgroundColor: highlight ? 'transparent' : c.inputBg },
        focused ? { borderColor: c.text } : null,
      ]}
    />
  );
}

function DeleteAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const c = useColors();
  const style = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 0.15], [0, 1], 'clamp') }));
  return (
    <Animated.View style={style}>
      <Pressable onPress={onPress} style={[styles.delete, { backgroundColor: c.danger }]} haptic="medium">
        <Icon icon={Trash2} size={20} color={c.bg} />
      </Pressable>
    </Animated.View>
  );
}

export const SetRow = memo(function SetRow({ set, index, fields, units, showRpe, readOnly, hideCheck, activeId, onChange: onChangeById, onToggle: onToggleById, onDelete: onDeleteById, onTypePress: onTypePressById, typeLabel }: SetRowProps) {
  const onChange = (patch: Partial<SetValues>) => onChangeById(activeId, set.id, patch);
  const onToggle = () => onToggleById(activeId, set.id);
  const onDelete = () => onDeleteById(activeId, set.id);
  const onTypePress = () => onTypePressById(activeId, set.id);
  const c = useColors();
  const hapticsOn = useSettings((s) => s.haptics);
  const bgStyle = { backgroundColor: set.completed ? c.accentSoft : c.surface };
  const prevText = set.previous ? formatSetValues(set.previous, fields, units, { unitLabel: false }) : '—';
  const placeholderFrom = (v: number | null | undefined, f: (x: number) => string) => (v != null ? f(v) : '');

  const renderRight = (progress: SharedValue<number>, _t: SharedValue<number>, methods: SwipeableMethods) => (
    <DeleteAction
      progress={progress}
      onPress={() => {
        methods.close();
        onDelete();
      }}
    />
  );

  const row = (
    <Animated.View style={[styles.row, bgStyle]} layout={LinearTransition.duration(110)}>
      <Pressable onPress={onTypePress} disabled={readOnly} style={[styles.setNo, { backgroundColor: set.type === 'normal' ? c.surfaceAlt : c.text }]} haptic="selection">
        <Text variant="caption" color={set.type === 'normal' ? c.text : c.bg} tabular>
          {set.type === 'normal' ? String(index + 1) : typeLabel(set.type)}
        </Text>
      </Pressable>
      <View style={styles.prev}>
        <Text variant="caption" color="faint" numberOfLines={1} tabular>
          {prevText}
        </Text>
      </View>
      {fields.weight ? (
        <NumField
          value={set.weightKg}
          onCommit={(v) => onChange({ weightKg: v == null ? null : unitToKg(v, units.weight) })}
          placeholder={placeholderFrom(set.previous?.weightKg, (v) => trimNumber(roundDisplay(kgToUnit(v, units.weight))))}
          parse={parseNumberInput}
          format={(v) => (v == null ? '' : trimNumber(roundDisplay(kgToUnit(v, units.weight))))}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {fields.reps ? (
        <NumField
          value={set.reps}
          onCommit={(v) => onChange({ reps: v == null ? null : Math.round(v) })}
          placeholder={placeholderFrom(set.previous?.reps, (v) => String(v))}
          parse={parseNumberInput}
          format={(v) => (v == null ? '' : String(v))}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {fields.distance ? (
        <NumField
          value={set.distanceM}
          onCommit={(v) => onChange({ distanceM: v == null ? null : unitToMeters(v, units.distance) })}
          placeholder={placeholderFrom(set.previous?.distanceM, (v) => trimNumber(roundDisplay(metersToUnit(v, units.distance))))}
          parse={parseNumberInput}
          format={(v) => (v == null ? '' : trimNumber(roundDisplay(metersToUnit(v, units.distance))))}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {fields.duration ? (
        <NumField
          value={set.durationSec}
          onCommit={(v) => onChange({ durationSec: v })}
          placeholder={placeholderFrom(set.previous?.durationSec, (v) => durationToInput(v))}
          parse={parseDurationInput}
          format={(v) => durationToInput(v)}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {showRpe ? (
        <NumField
          value={set.rpe}
          onCommit={(v) => onChange({ rpe: v == null ? null : Math.min(10, Math.max(1, v)) })}
          placeholder=""
          parse={parseNumberInput}
          format={(v) => (v == null ? '' : trimNumber(v))}
          editable={!readOnly}
          highlight={set.completed}
        />
      ) : null}
      {!readOnly && !hideCheck ? (
        <RNPressable
         
          onPress={() => {
            if (hapticsOn) void Haptics.impactAsync(set.completed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
            onToggle();
          }}
          hitSlop={6}
          style={[styles.check, { backgroundColor: set.completed ? c.text : c.surfaceAlt }]}
        >
          <Icon icon={Check} size={18} color={set.completed ? c.accent : c.textFaint} strokeWidth={3} />
        </RNPressable>
      ) : null}
    </Animated.View>
  );

  if (readOnly) return row;
  return (
    <ReanimatedSwipeable renderRightActions={renderRight} friction={1.6} rightThreshold={48} overshootRight={false}>
      {row}
    </ReanimatedSwipeable>
  );
});

export const SET_COL = {
  setNo: 36,
  check: 40,
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
    paddingHorizontal: spacing.lg,
  },
  setNo: { width: SET_COL.setNo, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  prev: { flex: 1.1, alignItems: 'center' },
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
  check: { width: SET_COL.check, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  delete: { width: 72, height: 38, alignItems: 'center', justifyContent: 'center', marginVertical: 5, marginRight: spacing.lg, borderRadius: radius.sm },
});
