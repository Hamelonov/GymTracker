import { Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { formatRelativeDay } from '@/domain/dates';
import type { DistanceUnit, ExerciseType, WeightUnit } from '@/domain/types';
import { formatSetLineWithExtras } from '@/features/workout/format';
import { push } from '@/lib/nav';
import { Card, EmptyState, Icon, Pressable, Text, spacing } from '@/ui';

interface ExerciseHistoryTabProps {
  history: ExerciseHistoryEntry[];
  exerciseType: ExerciseType;
  units: { weight: WeightUnit; distance: DistanceUnit };
}

/** Все тренировки, в которых делалось это упражнение, от новых к старым, с их подходами. */
export function ExerciseHistoryTab({ history, exerciseType, units }: ExerciseHistoryTabProps) {
  const { t: translate, i18n } = useTranslation();

  if (history.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={translate('exercise.noHistory')}
        hint={translate('exercise.noHistoryHint')}
      />
    );
  }

  return (
    <>
      {history.map((entry) => (
        <Pressable
          key={entry.workoutId}
          onPress={() => push({ pathname: '/workout/[id]', params: { id: entry.workoutId } })}
          scaleTo={0.985}
        >
          <Card raised style={{ marginBottom: spacing.md }}>
            <View style={styles.entryHeader}>
              <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                {entry.workoutName}
              </Text>
              <Text variant="caption" color="muted">
                {formatRelativeDay(entry.startedAt, i18n.language, translate)}
              </Text>
            </View>
            {entry.note ? (
              <Text variant="caption" color="muted" style={{ marginTop: 2, marginBottom: 4 }}>
                {entry.note}
              </Text>
            ) : null}
            {entry.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text variant="caption" color="faint" style={{ width: 20 }} tabular>
                  {set.type === 'normal' ? index + 1 : translate(`workout.setTypeShort.${set.type}`)}
                </Text>
                <Text variant="caption" tabular style={{ flex: 1 }}>
                  {formatSetLineWithExtras(set, exerciseType, units, i18n.language)}
                </Text>
                {set.prTypes.length > 0 ? <Icon icon={Trophy} size={12} color="accent" /> : null}
              </View>
            ))}
          </Card>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
});
