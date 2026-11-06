import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseDescription } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { formatDuration } from '@/domain/units';
import { MuscleMapCard } from '@/features/muscles/MuscleMapCard';
import { Card, Chip, SectionTitle, Text, spacing } from '@/ui';

interface ExerciseAboutTabProps {
  exercise: ExerciseRow;
  timesPerformed: number;
}

/** Мышцы, оборудование, описание и несколько фактов об упражнении. */
export function ExerciseAboutTab({ exercise, timesPerformed }: ExerciseAboutTabProps) {
  const { t: translate, i18n } = useTranslation();
  const description = exerciseDescription(exercise, i18n.language);
  return (
    <View>
      <MuscleMapCard exercise={exercise} />
      <View style={styles.tagChips}>
        <Chip label={translate(`equipment.${exercise.equipment}`)} small />
        <Chip label={translate(`types.${exercise.type}`)} small />
        {exercise.isCustom ? <Chip label={translate('exercise.custom')} small /> : null}
      </View>
      <SectionTitle title={translate('exercise.description')} />
      <Card>
        {description ? (
          <Text style={{ lineHeight: 22 }}>{description}</Text>
        ) : (
          <Text color="faint">{translate('exercise.noDescription')}</Text>
        )}
        <Text variant="caption" color="faint" style={{ marginTop: spacing.md }}>
          {translate('exercise.descriptionHint')}
        </Text>
      </Card>
      {timesPerformed > 0 ? (
        <Text variant="caption" color="muted" align="center" style={{ marginTop: spacing.lg }}>
          {translate('exercise.timesPerformed', { count: timesPerformed })}
        </Text>
      ) : null}
      {exercise.restSeconds != null ? (
        <Text variant="caption" color="muted" align="center" style={{ marginTop: spacing.sm }}>
          {translate('exercise.restSeconds')}: {formatDuration(exercise.restSeconds)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
