import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getWorkout } from '@/db/repo/workouts';
import { useQuery } from '@/db/version';
import { formatDistance, formatDuration, formatWeight } from '@/domain/units';
import { WorkoutStats } from '@/features/workout/WorkoutStats';
import { NewRecordsBlock } from '@/features/workout/summary/NewRecordsBlock';
import { TodayDoneBlock } from '@/features/workout/summary/TodayDoneBlock';
import { useLastSave } from '@/store/lastSave';
import { useSettings } from '@/store/settings';
import { Button, Text, spacing, useColors } from '@/ui';

export default function SummaryScreen() {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const saveResult = useLastSave((state) => state.result);
  const settings = useSettings();
  const workoutDetail = useQuery(
    () => (saveResult ? getWorkout(saveResult.workoutId) : undefined),
    [saveResult?.workoutId],
  );
  const weightUnit = settings.weightUnit;
  const distanceUnit = settings.distanceUnit;

  const usesDecimalComma = i18n.language.startsWith('ru');
  const formatters = useMemo(
    () => ({
      // «82,5 кг» в русском интерфейсе, «82.5 kg» в английском.
      weight: (weightKg: number) => {
        const weightText = formatWeight(weightKg, weightUnit);
        return usesDecimalComma ? weightText.replace('.', ',') : weightText;
      },
      duration: (seconds: number) => formatDuration(seconds),
      distance: (meters: number) => formatDistance(meters, distanceUnit),
    }),
    [weightUnit, distanceUnit, usesDecimalComma],
  );

  const closeSummary = () => {
    useLastSave.getState().setResult(null);
    if (saveResult) router.replace({ pathname: '/workout/[id]', params: { id: saveResult.workoutId } });
    else router.replace('/');
  };

  if (!saveResult) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <Button title={translate('common.close')} variant="ghost" onPress={closeSummary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.accent }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Animated.View entering={FadeInUp.duration(160)}>
          <Text variant="display" color="onAccent">
            {translate('workout.summaryTitle')}
          </Text>
          <Text variant="body" color="onAccent" style={{ marginTop: spacing.sm, opacity: 0.75 }}>
            {translate('workout.summarySubtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(160)} style={{ marginTop: spacing.xxl }}>
          <WorkoutStats
            variant="inverse"
            durationSec={saveResult.durationSec}
            exerciseCount={saveResult.exerciseCount}
            setCount={saveResult.setCount}
          />
        </Animated.View>

        <NewRecordsBlock saveResult={saveResult} workoutDetail={workoutDetail} formatters={formatters} />
        <TodayDoneBlock workoutDetail={workoutDetail} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          title={translate('common.done')}
          size="lg"
          fullWidth
          variant="secondary"
          onPress={closeSummary}
          style={{ backgroundColor: colors.black }}
          textColor={colors.accent}
          haptic="light"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
