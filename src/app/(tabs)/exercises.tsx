import { push } from '@/lib/nav';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { spacing, useColors } from '@/ui';

export default function ExercisesTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <ExerciseList
        onPress={(exercise) => push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
        onCreate={() => push('/exercise/edit')}
      />
    </View>
  );
}
