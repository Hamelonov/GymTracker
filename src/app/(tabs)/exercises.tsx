import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { Header, IconButton, useColors } from '@/ui';

export default function ExercisesTab() {
  const { t: translate } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Header
        title={translate('exercise.library')}
        large
        largeRight={
          <IconButton icon={Plus} variant="accent" onPress={() => push('/exercise/edit')} haptic="light" />
        }
      />
      <ExerciseList
        onPress={(exercise) => push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
      />
    </View>
  );
}
