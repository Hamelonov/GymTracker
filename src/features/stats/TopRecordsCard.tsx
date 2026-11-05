import { Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName } from '@/db/repo/exercises';
import type { listTopOneRepMaxRecords } from '@/db/repo/workouts';
import type { WeightUnit } from '@/domain/types';
import { formatWeight } from '@/domain/units';
import { push } from '@/lib/nav';
import { Icon, ListGroup, ListItem, SectionTitle, Text, spacing } from '@/ui';

type RankedRecord = ReturnType<typeof listTopOneRepMaxRecords>[number];

interface TopRecordsCardProps {
  records: RankedRecord[];
  weightUnit: WeightUnit;
}

/** Раздел «Рекорды»: лучшие расчётные одноповторные максимумы по всем упражнениям. */
export function TopRecordsCard({ records, weightUnit }: TopRecordsCardProps) {
  const { t: translate, i18n } = useTranslation();
  return (
    <>
      <SectionTitle title={translate('stats.recordsTitle')} />
      {records.length === 0 ? (
        <Text color="muted">{translate('stats.noData')}</Text>
      ) : (
        <ListGroup dividerInset={48}>
          {records.map((record) => (
            <ListItem
              key={record.exerciseId}
              title={exerciseName(record, i18n.language)}
              left={<Icon icon={Trophy} size={16} />}
              right={
                <View style={styles.valueColumn}>
                  <Text variant="bodyMedium" tabular>
                    {formatWeight(Math.round(record.value * 10) / 10, weightUnit)}
                  </Text>
                  <Text variant="label" color="muted">
                    {translate('pr.one_rm')}
                  </Text>
                </View>
              }
              onPress={() => push({ pathname: '/exercise/[id]', params: { id: record.exerciseId } })}
            />
          ))}
        </ListGroup>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  valueColumn: { alignItems: 'flex-end', gap: spacing.xxs },
});
