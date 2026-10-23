import { SkipForward } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatDuration } from '@/domain/units';
import { useRestTimer } from '@/store/restTimer';
import { Icon, Pressable, Text, radius, spacing, useColors } from '@/ui';
import { useRestRemaining } from './ActiveWorkoutBar';

export function RestTimerBar() {
  const c = useColors();
  const { t } = useTranslation();
  const { remaining, total, running } = useRestRemaining();
  const adjust = useRestTimer((s) => s.adjust);
  const skip = useRestTimer((s) => s.skip);
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.value = withTiming(total > 0 ? remaining / total : 0, { duration: 260 });
  }, [remaining, total, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, progress.value)) * 100}%` }));
  if (!running) return null;
  return (
    <Animated.View entering={FadeInDown.duration(160)} exiting={FadeOutDown.duration(120)} style={[styles.wrap, { backgroundColor: c.text }]}>
      <View style={[styles.track, { backgroundColor: c.borderStrong }]}>
        <Animated.View style={[styles.fill, { backgroundColor: c.accent }, fill]} />
      </View>
      <View style={styles.row}>
        <Pressable onPress={() => adjust(-15)} haptic="selection" style={[styles.adj, { borderColor: c.textFaint }]}>
          <Text variant="caption" color={c.bg}>
            −15
          </Text>
        </Pressable>
        <View style={styles.center}>
          <Text variant="label" color={c.textFaint}>
            {t('workout.restTimerTitle').toUpperCase()}
          </Text>
          <Text variant="h1" color={c.bg} tabular>
            {formatDuration(remaining)}
          </Text>
        </View>
        <Pressable onPress={() => adjust(15)} haptic="selection" style={[styles.adj, { borderColor: c.textFaint }]}>
          <Text variant="caption" color={c.bg}>
            +15
          </Text>
        </Pressable>
        <Pressable onPress={skip} haptic="light" style={[styles.skip, { backgroundColor: c.accent }]}>
          <Icon icon={SkipForward} size={16} color="onAccent" />
          <Text variant="caption" color="onAccent">
            {t('workout.skip')}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, overflow: 'hidden', paddingBottom: spacing.md },
  track: { height: 4 },
  fill: { height: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  adj: { width: 48, height: 36, borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.sm },
});
