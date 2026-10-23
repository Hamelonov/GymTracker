import { Ellipsis, Play } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { RoutineSummary } from '@/db/repo/routines';
import type { ExerciseRow } from '@/db/schema';
import { formatRelativeDay } from '@/domain/dates';
import { Button, Card, Icon, Pressable, Text, spacing, useColors } from '@/ui';

export function RoutineCard({
  routine,
  exercises,
  onStart,
  onMenu,
  onPress,
}: {
  routine: RoutineSummary;
  exercises: Map<string, ExerciseRow>;
  onStart: () => void;
  onMenu: () => void;
  onPress: () => void;
}) {
  const c = useColors();
  const { t, i18n } = useTranslation();
  const names = routine.exerciseIds
    .map((id) => exercises.get(id))
    .filter((e): e is ExerciseRow => !!e)
    .map((e) => exerciseName(e, i18n.language));
  return (
    <Pressable onPress={onPress} scaleTo={0.985}>
      <Card raised style={styles.card}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text variant="h3" numberOfLines={1}>
              {routine.name}
            </Text>
            <Text variant="caption" color="muted" style={{ marginTop: 2 }}>
              {routine.lastPerformedAt ? t('home.lastPerformed', { date: formatRelativeDay(routine.lastPerformedAt, i18n.language, t) }) : t('home.neverPerformed')}
              {' · '}
              {t('home.exercisesCount', { count: routine.exerciseCount })}
            </Text>
          </View>
          <Pressable onPress={onMenu} haptic="selection" hitSlop={8} style={[styles.menu, { backgroundColor: c.surfaceAlt }]}>
            <Icon icon={Ellipsis} size={18} />
          </Pressable>
        </View>
        {names.length > 0 ? (
          <Text variant="caption" color="muted" numberOfLines={2} style={styles.names}>
            {names.join(' · ')}
          </Text>
        ) : (
          <Text variant="caption" color="faint" style={styles.names}>
            {t('routine.emptyHint')}
          </Text>
        )}
        <Button title={t('home.startRoutine')} size="sm" icon={<Icon icon={Play} size={14} color="onAccent" strokeWidth={2.5} />} onPress={onStart} style={styles.start} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  menu: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  names: { marginTop: spacing.md },
  start: { marginTop: spacing.md, alignSelf: 'flex-start' },
});
