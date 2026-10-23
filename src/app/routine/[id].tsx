import { useLocalSearchParams } from 'expo-router';
import { push } from '@/lib/nav';
import { Pencil, Play } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { exerciseName, getExercisesByIds } from '@/db/repo/exercises';
import { getRoutine } from '@/db/repo/routines';
import { useQuery } from '@/db/version';
import { formatRelativeDay } from '@/domain/dates';
import { setFieldsFor } from '@/domain/types';
import { formatSetValues } from '@/features/workout/format';
import { useActiveWorkout } from '@/store/activeWorkout';
import { useRestTimer } from '@/store/restTimer';
import { useSettings } from '@/store/settings';
import { Button, Card, Icon, IconButton, Pressable, Screen, Text, confirm, spacing, useColors } from '@/ui';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const c = useColors();
  const settings = useSettings();
  const r = useQuery(() => (id ? getRoutine(id) : undefined), [id]);
  const exIds = useMemo(() => r?.exercises.map((e) => e.exerciseId) ?? [], [r]);
  const exMap = useQuery(() => getExercisesByIds(exIds), [exIds.join(',')]);
  const active = useActiveWorkout((s) => s.workout);
  const units = { weight: settings.weightUnit, distance: settings.distanceUnit } as const;

  if (!r) return <Screen header={{ back: true }} />;

  const start = async () => {
    if (active) {
      const ok = await confirm({ title: t('home.inProgress'), message: t('workout.discardConfirm'), destructive: true, confirmLabel: t('common.discard') });
      if (!ok) return;
      useRestTimer.getState().skip();
      useActiveWorkout.getState().clear();
    }
    useActiveWorkout.getState().startFromRoutine(r);
    push('/workout/active');
  };

  return (
    <Screen
      header={{ back: true, title: r.name, subtitle: r.lastPerformedAt ? t('home.lastPerformed', { date: formatRelativeDay(r.lastPerformedAt, i18n.language, t) }) : t('home.neverPerformed'), right: <IconButton icon={Pencil} variant="filled" onPress={() => push({ pathname: '/routine/edit', params: { id: r.id } })} /> }}
      footer={<Button title={t('home.startRoutine')} size="lg" full icon={<Icon icon={Play} size={20} color="onAccent" strokeWidth={2.5} />} onPress={start} />}
    >
      {r.notes ? (
        <Text color="muted" style={{ marginBottom: spacing.lg }}>
          {r.notes}
        </Text>
      ) : null}
      {r.exercises.map((e) => {
        const ex = exMap.get(e.exerciseId);
        const fields = setFieldsFor(ex?.type ?? 'weight_reps');
        return (
          <Pressable key={e.id} onPress={() => push({ pathname: '/exercise/[id]', params: { id: e.exerciseId } })} scaleTo={0.985}>
            <Card raised style={{ marginBottom: spacing.md }}>
              <Text variant="h3">{ex ? exerciseName(ex, i18n.language) : '…'}</Text>
              {e.supersetGroup != null ? (
                <Text variant="label" color="muted">
                  {t('workout.superset').toUpperCase()} {e.supersetGroup}
                </Text>
              ) : null}
              {e.note ? (
                <Text variant="caption" color="muted" style={{ marginTop: 4 }}>
                  {e.note}
                </Text>
              ) : null}
              <View style={{ marginTop: spacing.sm, gap: 4 }}>
                {e.sets.map((s, i) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text variant="caption" color="faint" style={{ width: 20 }} tabular>
                      {s.type === 'normal' ? i + 1 : t(`workout.setTypeShort.${s.type}`)}
                    </Text>
                    <Text variant="caption" tabular>
                      {formatSetValues(s, fields, units)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </Pressable>
        );
      })}
      <View style={{ height: 1, backgroundColor: c.bg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
