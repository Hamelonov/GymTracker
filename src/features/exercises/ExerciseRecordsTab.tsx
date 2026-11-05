import { Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { RecordDetail } from '@/db/repo/exercises';
import { formatRelativeDay } from '@/domain/dates';
import type { DistanceUnit, RecordType, WeightUnit } from '@/domain/types';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';
import { push } from '@/lib/nav';
import { EmptyState, Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';

type Units = { weight: WeightUnit; distance: DistanceUnit };

function formatRecordValue(recordType: RecordType, value: number, units: Units): string {
  if (recordType === 'reps') return String(Math.round(value));
  if (recordType === 'duration') return formatDuration(value);
  if (recordType === 'distance') return formatDistance(value, units.distance);
  // У расчётного 1ПМ длинная дробная часть, поэтому он округляется до одного знака после запятой.
  const weightKg = recordType === 'one_rm' ? Math.round(value * 10) / 10 : value;
  return formatWeight(weightKg, units.weight);
}

interface ExerciseRecordsTabProps {
  records: RecordDetail[];
  units: Units;
}

/** Сетка личных рекордов; нажатие открывает тренировку, в которой рекорд был установлен. */
export function ExerciseRecordsTab({ records, units }: ExerciseRecordsTabProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();

  if (records.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title={translate('exercise.noHistory')}
        hint={translate('exercise.noHistoryHint')}
      />
    );
  }

  return (
    <View style={styles.recordGrid}>
      {records.map((record) => (
        <Pressable
          key={record.type}
          onPress={() =>
            record.workoutId && push({ pathname: '/workout/[id]', params: { id: record.workoutId } })
          }
          style={[styles.recordTile, { backgroundColor: colors.surface }]}
          scaleTo={0.97}
        >
          <View style={styles.recordTitleRow}>
            <Icon icon={Trophy} size={14} color="accent" />
            <Text variant="label" color="muted">
              {translate(`pr.${record.type}`).toUpperCase()}
            </Text>
          </View>
          <Text variant="h2" tabular>
            {formatRecordValue(record.type, record.value, units)}
          </Text>
          <Text variant="caption" color="faint">
            {formatRelativeDay(record.achievedAt, i18n.language, translate)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  recordTile: { width: '47%', flexGrow: 1, padding: spacing.lg, borderRadius: radius.lg, gap: 4 },
  recordTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
