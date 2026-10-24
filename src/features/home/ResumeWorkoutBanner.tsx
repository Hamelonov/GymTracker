import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { WorkoutName } from '@/features/workout/WorkoutName';
import { Card, Pressable, Text, spacing, useColors } from '@/ui';

interface ResumeWorkoutBannerProps {
  workoutName: string | undefined;
  onPress: () => void;
}

/** Жёлтый баннер на главном экране, возвращающий к свёрнутой тренировке. */
export function ResumeWorkoutBanner({ workoutName, onPress }: ResumeWorkoutBannerProps) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  return (
    <Pressable onPress={onPress} haptic="light">
      <Card style={[styles.banner, { backgroundColor: colors.accent }]}>
        <View style={[styles.liveDot, { backgroundColor: colors.black }]} />
        <View style={{ flex: 1 }}>
          <Text variant="h3" color="onAccent">
            {translate('home.inProgress')}
          </Text>
          {workoutName ? (
            <WorkoutName
              variant="caption"
              color="onAccent"
              signColor="onAccent"
              style={{ opacity: 0.7 }}
              name={workoutName}
            />
          ) : null}
        </View>
        <Text variant="bodyMedium" color="onAccent">
          {translate('home.resume')} →
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
});
