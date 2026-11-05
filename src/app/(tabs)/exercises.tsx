import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { IconButton, Screen } from '@/ui';

export default function ExercisesTab() {
  const { t: translate } = useTranslation();
  return (
    <Screen
      header={{
        title: translate('exercise.library'),
        large: true,
        largeRight: (
          <IconButton icon={Plus} variant="accent" onPress={() => push('/exercise/edit')} haptic="light" />
        ),
      }}
      scrollable={false}
      padded={false}
      tabScreen
    >
      <ExerciseList
        onPress={(exercise) => push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      />
    </Screen>
  );
}
