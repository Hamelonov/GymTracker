import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { useActiveWorkout } from '@/store/activeWorkout';
import { usePickerResult } from '@/store/picker';
import { Button, Header, spacing, useColors } from '@/ui';

type Mode = 'workout' | 'routine' | 'replace';

export default function ExercisePickerScreen() {
  const params = useLocalSearchParams<{ mode?: Mode; token?: string; target?: string }>();
  const mode: Mode = params.mode ?? 'workout';
  const { t } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const addExercises = useActiveWorkout((s) => s.addExercises);
  const replaceExercise = useActiveWorkout((s) => s.replaceExercise);
  const publish = usePickerResult((s) => s.publish);

  const finish = (ids: string[]) => {
    if (ids.length === 0) return;
    if (mode === 'workout') addExercises(ids);
    else if (mode === 'replace' && params.target) replaceExercise(params.target, ids[0] ?? '');
    else if (mode === 'routine' && params.token) publish(params.token, ids);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Header title={mode === 'replace' ? t('workout.replaceExercise') : t('workout.addExercises')} back="close" />
      <ExerciseList
        selectedIds={mode === 'replace' ? undefined : selectedSet}
        onCreate={() => router.push({ pathname: '/exercise/edit', params: { pick: mode === 'replace' ? '0' : '1' } })}
        bottomPadding={selected.length > 0 ? 90 : 0}
        onPress={(e) => {
          if (mode === 'replace') {
            finish([e.id]);
            return;
          }
          setSelected((prev) => (prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id]));
        }}
      />
      {selected.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, backgroundColor: c.bg, borderTopColor: c.border }]}>
          <Button
            title={t('exercise.addSelected', { count: selected.length })}
            size="lg"
            full
            icon={<Plus size={20} color={c.onAccent} strokeWidth={2.5} />}
            onPress={() => finish(selected)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
