import { Ellipsis } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { WorkoutDetail } from '@/db/repo/workouts';
import { formatTime } from '@/domain/dates';
import { IconButton, Text, spacing } from '@/ui';
import { WorkoutActionsSheet } from './WorkoutActionsSheet';
import { WorkoutDetailsBody } from './WorkoutDetailsBody';

interface WorkoutSectionProps {
  workout: WorkoutDetail;
  onDeleted: () => void;
}

/** Одна тренировка на странице просмотра: название, время начала, меню «⋯» и её содержимое. */
export function WorkoutSection({ workout, onDeleted }: WorkoutSectionProps) {
  const { t: translate } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <View>
      <View style={styles.titleRow}>
        <View style={styles.titleColumn}>
          <Text variant="h2" numberOfLines={1}>
            {workout.name}
          </Text>
          <Text variant="caption" color="muted" tabular>
            {formatTime(workout.startedAt)}
          </Text>
        </View>
        <IconButton
          icon={Ellipsis}
          label={translate('common.menu')}
          onPress={() => setIsMenuOpen(true)}
          haptic="selection"
        />
      </View>
      <WorkoutDetailsBody workout={workout} />
      <WorkoutActionsSheet
        workout={workout}
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onDeleted={onDeleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  titleColumn: { flex: 1, gap: 2 },
});
