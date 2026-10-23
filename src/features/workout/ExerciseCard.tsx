import { BookOpen, Ellipsis, Link, Plus, StickyNote } from 'lucide-react-native';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import type { ActiveExercise, SetType, SetValues, DistanceUnit, WeightUnit } from '@/domain/types';
import { setFieldsFor } from '@/domain/types';
import { Button, Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { SET_COL, SetRow } from './SetRow';

export interface ExerciseCardProps {
  item: ActiveExercise;
  exercise: ExerciseRow | undefined;
  units: { weight: WeightUnit; distance: DistanceUnit };
  showRpe: boolean;
  readOnly?: boolean;
  /** Whether the exercise has a description to show (controls the book icon state). */
  hasDescription: boolean;
  supersetColor?: string | null;
  onMenu: () => void;
  onDescriptionPress: () => void;
  onNotePress: () => void;
  onAddSet: () => void;
  onSetChange: (setId: string, patch: Partial<SetValues>) => void;
  onSetToggle: (setId: string) => void;
  onSetDelete: (setId: string) => void;
  onSetTypePress: (setId: string) => void;
}

export const ExerciseCard = memo(function ExerciseCard({
  item,
  exercise,
  units,
  showRpe,
  readOnly,
  hasDescription,
  supersetColor,
  onMenu,
  onDescriptionPress,
  onNotePress,
  onAddSet,
  onSetChange,
  onSetToggle,
  onSetDelete,
  onSetTypePress,
}: ExerciseCardProps) {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const fields = setFieldsFor(exercise?.type ?? 'weight_reps');
  const name = exercise ? exerciseName(exercise, i18n.language) : '…';
  const typeLabel = (type: SetType) => t(`workout.setTypeShort.${type}`);
  const hasNote = item.note.trim().length > 0;

  return (
    <Animated.View layout={LinearTransition.duration(160)} style={[styles.card, { backgroundColor: c.surface }]}>
      {supersetColor ? <View style={[styles.supersetBar, { backgroundColor: supersetColor }]} /> : null}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
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
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={onDescriptionPress} haptic="selection" hitSlop={6} style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
            <Icon icon={BookOpen} size={17} color={hasDescription ? 'text' : 'faint'} />
          </Pressable>
          {!readOnly ? (
            <Pressable onPress={onNotePress} haptic="selection" hitSlop={6} style={[styles.iconBtn, { backgroundColor: hasNote ? c.accent : c.surfaceAlt }]}>
              <Icon icon={StickyNote} size={17} color={hasNote ? 'onAccent' : 'text'} />
            </Pressable>
          ) : null}
          {!readOnly ? (
            <Pressable onPress={onMenu} haptic="selection" hitSlop={6} style={[styles.iconBtn, { backgroundColor: c.surfaceAlt }]}>
              <Icon icon={Ellipsis} size={18} />
            </Pressable>
          ) : null}
        </View>
      </View>

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
  titleWrap: { flex: 1, paddingTop: 4 },
  supersetTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: 2 },
  col: { flex: 1, textAlign: 'center' },
  addSet: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
});
