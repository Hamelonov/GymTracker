import { Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { listTopOneRepMaxRecords } from '@/db/repo/workouts';
import type { WeightUnit } from '@/domain/types';
import { formatWeight } from '@/domain/units';
import { push } from '@/lib/nav';
import { Card, Icon, Pressable, SectionTitle, Text, spacing } from '@/ui';

type RankedRecord = ReturnType<typeof listTopOneRepMaxRecords>[number];

interface TopRecordsCardProps {
  records: RankedRecord[];
  weightUnit: WeightUnit;
}

/** "Records" section: the best estimated one-rep maxes across all exercises. */
export function TopRecordsCard({ records, weightUnit }: TopRecordsCardProps) {
  const { t: translate, i18n } = useTranslation();
  return (
    <>
      <SectionTitle title={translate('stats.recordsTitle')} />
      <Card padded={false}>
        {records.length === 0 ? (
          <Text color="faint" style={styles.emptyText}>
            {translate('stats.noData')}
          </Text>
        ) : (
          records.map((record) => (
            <Pressable
              key={record.exerciseId}
              onPress={() => push({ pathname: '/exercise/[id]', params: { id: record.exerciseId } })}
              style={styles.recordRow}
            >
              <Icon icon={Trophy} size={16} color="accent" />
              <Text variant="bodyMedium" style={styles.exerciseName} numberOfLines={1}>
                {exerciseName(record, i18n.language)}
              </Text>
              <Text variant="bodyMedium" tabular>
                {formatWeight(Math.round(record.value * 10) / 10, weightUnit)}
              </Text>
              <Text variant="label" color="faint">
                {translate('pr.one_rm')}
              </Text>
            </Pressable>
          ))
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  emptyText: { padding: spacing.lg },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  exerciseName: { flex: 1 },
});
