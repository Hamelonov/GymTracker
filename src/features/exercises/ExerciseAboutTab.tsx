import { Pencil } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { exerciseDescription } from '@/db/repo/exercises';
import type { ExerciseRow } from '@/db/schema';
import { formatDuration } from '@/domain/units';
import { MuscleMapCard } from '@/features/muscles/MuscleMapCard';
import { push } from '@/lib/nav';
import { Button, Chip, Icon, ListGroup, ListItem, SectionTitle, Text, spacing } from '@/ui';

interface ExerciseAboutTabProps {
  exercise: ExerciseRow;
  timesPerformed: number;
}

/** Мышцы, оборудование, описание и несколько фактов об упражнении. */
export function ExerciseAboutTab({ exercise, timesPerformed }: ExerciseAboutTabProps) {
  const { t: translate, i18n } = useTranslation();
  const description = exerciseDescription(exercise, i18n.language);
  const hasTimesPerformed = timesPerformed > 0;
  const hasRestSeconds = exercise.restSeconds != null;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <MuscleMapCard exercise={exercise} />
      <View style={styles.tagChips}>
        <Chip label={translate(`equipment.${exercise.equipment}`)} small />
        <Chip label={translate(`types.${exercise.type}`)} small />
        {exercise.isCustom ? <Chip label={translate('exercise.custom')} small /> : null}
      </View>
      <SectionTitle title={translate('exercise.description')} />
      {description ? (
        <Text variant="body">{description}</Text>
      ) : (
        <Text variant="body" color="faint">
          {translate('exercise.noDescription')}
        </Text>
      )}
      <Text variant="caption" color="muted" style={styles.descriptionHint}>
        {translate('exercise.descriptionHint')}
      </Text>
      {hasTimesPerformed || hasRestSeconds ? (
        <ListGroup style={styles.facts}>
          {hasTimesPerformed ? (
            <ListItem compact title={translate('exercise.timesPerformed', { count: timesPerformed })} />
          ) : null}
          {hasRestSeconds ? (
            <ListItem
              compact
              title={translate('exercise.restSeconds')}
              right={
                <Text variant="bodyMedium" tabular>
                  {formatDuration(exercise.restSeconds ?? 0)}
                </Text>
              }
            />
          ) : null}
        </ListGroup>
      ) : null}
      <Button
        title={translate('common.edit')}
        variant="secondary"
        fullWidth
        icon={<Icon icon={Pencil} size={16} />}
        onPress={() => push({ pathname: '/exercise/edit', params: { id: exercise.id } })}
        style={styles.editButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  descriptionHint: { marginTop: spacing.md },
  facts: { marginTop: spacing.lg },
  editButton: { marginTop: spacing.lg },
});
