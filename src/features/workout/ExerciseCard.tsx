import { router } from 'expo-router';
import { BookOpen, Ellipsis, Link, Plus, StickyNote, Timer } from 'lucide-react-native';
import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { exerciseDescription, exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise, SetType, SetValues, DistanceUnit, WeightUnit } from '@/domain/types';
import { setFieldsFor } from '@/domain/types';
import { formatDuration } from '@/domain/units';
import { Button, Icon, Pressable, Text, fonts, radius, spacing, useColors } from '@/ui';
import { SET_COL, SetRow } from './SetRow';

export interface ExerciseCardProps {
  item: ActiveExercise;
  exercise: ExerciseRow | undefined;
  units: { weight: WeightUnit; distance: DistanceUnit };
  showRpe: boolean;
  restSeconds: number;
  readOnly?: boolean;
  lastNote?: string;
  supersetColor?: string | null;
  onMenu: () => void;
  onRestPress: () => void;
  onAddSet: () => void;
  onSetChange: (setId: string, patch: Partial<SetValues>) => void;
  onSetToggle: (setId: string) => void;
  onSetDelete: (setId: string) => void;
  onSetTypePress: (setId: string) => void;
  onNoteChange: (note: string) => void;
}

export const ExerciseCard = memo(function ExerciseCard({
  item,
  exercise,
  units,
  showRpe,
  restSeconds,
  readOnly,
  lastNote,
  supersetColor,
  onMenu,
  onRestPress,
  onAddSet,
  onSetChange,
  onSetToggle,
  onSetDelete,
  onSetTypePress,
  onNoteChange,
}: ExerciseCardProps) {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const [showDescription, setShowDescription] = useState(false);
  const fields = setFieldsFor(exercise?.type ?? 'weight_reps');
  const description = exercise ? exerciseDescription(exercise, i18n.language) : '';
  const name = exercise ? exerciseName(exercise, i18n.language) : '…';
  const typeLabel = (type: SetType) => t(`workout.setTypeShort.${type}`);

  return (
    <Animated.View layout={LinearTransition.springify().damping(24)} style={[styles.card, { backgroundColor: c.surface }]}>
      {supersetColor ? <View style={[styles.supersetBar, { backgroundColor: supersetColor }]} /> : null}
      <View style={styles.header}>
        <Pressable style={styles.titleWrap} onPress={() => exercise && router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}>
          <Text variant="h3" numberOfLines={2}>
            {name}
          </Text>
          {item.supersetGroup != null ? (
            <View style={styles.supersetTag}>
              <Icon icon={Link} size={12} color={supersetColor ?? 'muted'} />
              <Text variant="label" color={supersetColor ?? 'muted'}>
                {t('workout.superset').toUpperCase()} {item.supersetGroup}
              </Text>
            </View>
          ) : null}
        </Pressable>
        {!readOnly ? (
          <View style={styles.headerActions}>
            <Pressable onPress={onRestPress} haptic="selection" style={[styles.restBtn, { backgroundColor: c.surfaceAlt }]}>
              <Icon icon={Timer} size={14} color={restSeconds > 0 ? 'text' : 'faint'} />
              <Text variant="label" color={restSeconds > 0 ? 'text' : 'faint'} tabular>
                {restSeconds > 0 ? formatDuration(restSeconds) : t('workout.restOff')}
              </Text>
            </Pressable>
            <Pressable onPress={onMenu} haptic="selection" hitSlop={8} style={[styles.menuBtn, { backgroundColor: c.surfaceAlt }]}>
              <Icon icon={Ellipsis} size={18} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {description ? (
        <View style={styles.descWrap}>
          <Pressable onPress={() => setShowDescription((v) => !v)} style={styles.descToggle} haptic="selection">
            <Icon icon={BookOpen} size={14} color="muted" />
            <Text variant="caption" color="muted">
              {t('workout.description')}
            </Text>
          </Pressable>
          {showDescription ? (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={[styles.descBody, { backgroundColor: c.surfaceAlt }]}>
              <Text variant="caption" color="text" style={{ lineHeight: 18 }}>
                {description}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.noteRow}>
        <Icon icon={StickyNote} size={16} color={item.note ? 'text' : 'faint'} />
        <TextInput
          value={item.note}
          onChangeText={onNoteChange}
          editable={!readOnly}
          placeholder={t('workout.exerciseNotePlaceholder')}
          placeholderTextColor={c.textFaint}
          selectionColor={c.accent}
          cursorColor={c.text}
          multiline
          style={[styles.noteInput, { color: c.text }]}
        />
      </View>
      {!item.note && lastNote && !readOnly ? (
        <Pressable onPress={() => onNoteChange(lastNote)} style={styles.lastNote} haptic="selection">
          <Text variant="caption" color="faint" numberOfLines={1}>
            {t('workout.copyLastNote')}: {lastNote}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.colHeader}>
        <Text variant="label" color="faint" style={{ width: SET_COL.setNo, textAlign: 'center' }}>
          {t('workout.setShort').toUpperCase()}
        </Text>
        <Text variant="label" color="faint" style={{ flex: 1.1, textAlign: 'center' }}>
          {t('workout.previous').toUpperCase()}
        </Text>
        {fields.weight ? <Text variant="label" color="faint" style={styles.col}>{(exercise?.type === 'assisted_bodyweight' ? '−' : '') + units.weight.toUpperCase()}</Text> : null}
        {fields.reps ? <Text variant="label" color="faint" style={styles.col}>{t('workout.reps').toUpperCase()}</Text> : null}
        {fields.distance ? <Text variant="label" color="faint" style={styles.col}>{units.distance.toUpperCase()}</Text> : null}
        {fields.duration ? <Text variant="label" color="faint" style={styles.col}>{t('workout.time').toUpperCase()}</Text> : null}
        {showRpe ? <Text variant="label" color="faint" style={styles.col}>{t('workout.rpe')}</Text> : null}
        {!readOnly ? <View style={{ width: SET_COL.check }} /> : null}
      </View>

      {item.sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          index={i}
          fields={fields}
          units={units}
          showRpe={showRpe}
          readOnly={readOnly}
          typeLabel={typeLabel}
          onChange={(patch) => onSetChange(s.id, patch)}
          onToggle={() => onSetToggle(s.id)}
          onDelete={() => onSetDelete(s.id)}
          onTypePress={() => onSetTypePress(s.id)}
        />
      ))}

      {!readOnly ? (
        <View style={styles.addSet}>
          <Button title={t('workout.addSet')} variant="secondary" size="sm" full icon={<Icon icon={Plus} size={16} />} onPress={onAddSet} haptic="selection" />
        </View>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, paddingTop: spacing.md, paddingBottom: spacing.md, marginBottom: spacing.md, overflow: 'hidden' },
  supersetBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, gap: spacing.sm },
  titleWrap: { flex: 1 },
  supersetTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  restBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: spacing.sm + 2, borderRadius: radius.pill },
  menuBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  descWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  descToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 },
  descBody: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  noteInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, paddingVertical: 6, minHeight: 32, textAlignVertical: 'center' },
  lastNote: { paddingHorizontal: spacing.lg + 24, marginTop: -2, marginBottom: 4 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: 2 },
  col: { flex: 1, textAlign: 'center' },
  addSet: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
});
