import { push } from '@/lib/nav';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseList } from '@/features/exercises/ExerciseList';
import { Header, IconButton, useColors } from '@/ui';

export default function ExercisesTab() {
  const { t } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <Header
        title={t('exercise.library')}
        large
        right={<IconButton icon={Plus} variant="accent" onPress={() => push('/exercise/edit')} haptic="light" />}
      />
      <ExerciseList onPress={(e) => push({ pathname: '/exercise/[id]', params: { id: e.id } })} />
    </View>
  );
}
