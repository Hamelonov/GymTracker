import { Pencil } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseDescription } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { formatDuration } from '@/domain/units';
import { push } from '@/lib/nav';
import { Button, Card, Chip, Icon, SectionTitle, Text, spacing } from '@/ui';

interface ExerciseAboutTabProps {
  exercise: ExerciseRow;
  timesPerformed: number;
}

/** Muscles, equipment, description and a few facts about the exercise. */
export function ExerciseAboutTab({ exercise, timesPerformed }: ExerciseAboutTabProps) {
  const { t: translate, i18n } = useTranslation();
  const description = exerciseDescription(exercise, i18n.language);
  return (
    <View>
      <View style={styles.tagChips}>
        <Chip label={translate(`muscles.${exercise.muscleGroup}`)} selected small />
        {exercise.secondaryMuscles.map((muscle) => (
          <Chip key={muscle} label={translate(`muscles.${muscle}`)} small />
        ))}
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
      <Button
        title={translate('common.edit')}
        variant="secondary"
        fullWidth
        icon={<Icon icon={Pencil} size={16} />}
        onPress={() => push({ pathname: '/exercise/edit', params: { id: exercise.id } })}
        style={{ marginTop: spacing.md }}
      />
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
  tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
