import { SkipForward } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { formatDuration } from '@/domain/units';
import { useRestTimer } from '@/store/restTimer';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { useRestCountdown } from './timers';

export function RestTimerBar() {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const { remaining, total, running } = useRestCountdown();
  const adjustRest = useRestTimer((state) => state.adjust);
  const skipRest = useRestTimer((state) => state.skip);
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = withTiming(total > 0 ? remaining / total : 0, { duration: 260 });
  }, [remaining, total, progress]);
  const progressFillWidth = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));
  if (!running) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(120)}
      exiting={FadeOutDown.duration(100)}
      style={[styles.wrapper, { backgroundColor: colors.inverseSurface }]}
    >
      <View style={[styles.progressTrack, { backgroundColor: colors.borderStrong }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: colors.accent }, progressFillWidth]} />
      </View>
      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => adjustRest(-15)}
          haptic="selection"
          style={[styles.adjustButton, { borderColor: colors.inverseMuted }]}
        >
          <Text variant="caption" color="inverseText">
            −15
          </Text>
        </Pressable>
        <View style={styles.centerColumn}>
          <Text variant="label" color="inverseMuted">
            {translate('workout.restTimerTitle').toUpperCase()}
          </Text>
          <Text variant="h1" color="inverseText" tabular>
            {formatDuration(remaining)}
          </Text>
        </View>
        <Pressable
          onPress={() => adjustRest(15)}
          haptic="selection"
          style={[styles.adjustButton, { borderColor: colors.inverseMuted }]}
        >
          <Text variant="caption" color="inverseText">
            +15
          </Text>
        </Pressable>
        <Pressable
          onPress={skipRest}
          haptic="light"
          style={[styles.skipButton, { backgroundColor: colors.accent }]}
        >
          <Icon icon={SkipForward} size={16} color="onAccent" />
          <Text variant="caption" color="onAccent">
            {translate('workout.skip')}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.lg, overflow: 'hidden', paddingBottom: spacing.md },
  progressTrack: { height: 4 },
  progressFill: { height: 4 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  adjustButton: {
    width: 48,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerColumn: { flex: 1, alignItems: 'center' },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
});
