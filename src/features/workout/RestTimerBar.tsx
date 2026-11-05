import { useFocusEffect } from 'expo-router';
import { SkipForward } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDuration } from '@/domain/units';
import { useKeyboardVisible } from '@/lib/useKeyboardVisible';
import { useRestTimer } from '@/store/restTimer';
import {
  FastPressable,
  Icon,
  Pressable,
  Text,
  fonts,
  layout,
  motionDuration,
  playHaptic,
  radius,
  spacing,
  useColors,
  useToastStore,
} from '@/ui';
import { useRestCountdown } from './timers';

const PROGRESS_TRACK_HEIGHT = 4;
const ADJUST_BUTTON_WIDTH = 52;
const ADJUST_STEP_SECONDS = 15;
// Под ширину «12:34» цифрами таймера: столбец не дёргается, когда минут становится меньше десяти.
const TIMER_COLUMN_MIN_WIDTH = 104;
const EXIT_DURATION_MS = 100;
// Плашка задана по ширине: без предела системный шрифт её разорвёт.
const DOCK_MAX_FONT_SCALE = 1.2;

/** Жёлтая плашка отдыха у нижнего края. Живёт только пока таймер идёт. */
export function RestTimerBar() {
  const isResting = useRestTimer((state) => state.endsAt != null);
  if (!isResting) return null;
  return <RestDock />;
}

function RestDock() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isKeyboardVisible = useKeyboardVisible();
  const { remaining, total } = useRestCountdown();
  const setDockOffset = useToastStore((state) => state.setDockOffset);
  const occupiedHeight = isKeyboardVisible
    ? layout.restDockCompactHeight
    : layout.restDockHeight + insets.bottom;

  // По фокусу, а не по монтированию: под открытым поверх экраном плашки не видно и тост поднимать незачем.
  useFocusEffect(
    useCallback(() => {
      setDockOffset(occupiedHeight);
      return () => setDockOffset(0);
    }, [occupiedHeight, setDockOffset]),
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(motionDuration.fast)}
      exiting={FadeOutDown.duration(EXIT_DURATION_MS)}
      // Над клавиатурой плашка встаёт в поток, чтобы прокрутка кончалась над ней и поле ввода осталось на виду.
      style={[
        isKeyboardVisible ? null : styles.pinnedToBottom,
        { backgroundColor: colors.accent, paddingBottom: isKeyboardVisible ? 0 : insets.bottom },
      ]}
    >
      {isKeyboardVisible ? (
        <CompactRestRow remaining={remaining} />
      ) : (
        <FullRestRows remaining={remaining} total={total} />
      )}
    </Animated.View>
  );
}

function CompactRestRow({ remaining }: { remaining: number }) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const skipRest = useRestTimer((state) => state.skip);
  const handleSkipPress = () => {
    skipRest();
    playHaptic('light');
  };
  return (
    <View style={styles.compactRow}>
      <Text variant="statCompact" color="onAccent" maxFontSizeMultiplier={DOCK_MAX_FONT_SCALE}>
        {formatDuration(remaining)}
      </Text>
      <FastPressable
        onPress={handleSkipPress}
        accessibilityRole="button"
        accessibilityLabel={translate('workout.skip')}
        style={({ pressed }) => [
          styles.compactSkipButton,
          pressed ? { backgroundColor: colors.onAccentFill } : null,
        ]}
      >
        <Icon icon={SkipForward} size={20} color="onAccent" strokeWidth={2.5} />
      </FastPressable>
    </View>
  );
}

function FullRestRows({ remaining, total }: { remaining: number; total: number }) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const adjustRest = useRestTimer((state) => state.adjust);
  const skipRest = useRestTimer((state) => state.skip);
  const remainingShare = total > 0 ? remaining / total : 0;
  // Стартует с текущей доли: после закрытия клавиатуры дорожка не должна заново бежать от полной.
  const progress = useSharedValue(remainingShare);
  useEffect(() => {
    progress.set(withTiming(remainingShare, { duration: motionDuration.slow, easing: Easing.linear }));
  }, [remainingShare, progress]);
  const progressFillWidth = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));
  return (
    <>
      <View style={[styles.progressTrack, { backgroundColor: colors.onAccentFill }]}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: colors.onAccent }, progressFillWidth]}
        />
      </View>
      <View style={styles.controlsRow}>
        <View style={styles.timerColumn}>
          <Text variant="label" color="onAccentMuted" maxFontSizeMultiplier={DOCK_MAX_FONT_SCALE}>
            {translate('workout.restTimerTitle').toUpperCase()}
          </Text>
          <Text variant="timer" color="onAccent" maxFontSizeMultiplier={DOCK_MAX_FONT_SCALE}>
            {formatDuration(remaining)}
          </Text>
        </View>
        <View style={styles.buttonsRow}>
          <AdjustRestButton label="−15" onPress={() => adjustRest(-ADJUST_STEP_SECONDS)} />
          <AdjustRestButton label="+15" onPress={() => adjustRest(ADJUST_STEP_SECONDS)} />
          <Pressable
            onPress={skipRest}
            haptic="light"
            accessibilityRole="button"
            style={[styles.skipButton, { backgroundColor: colors.onAccent }]}
          >
            <Icon icon={SkipForward} size={16} color="accent" />
            <Text
              variant="caption"
              color="accent"
              maxFontSizeMultiplier={DOCK_MAX_FONT_SCALE}
              style={styles.skipLabel}
            >
              {translate('workout.skip')}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function AdjustRestButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      haptic="selection"
      debounceMs={0}
      accessibilityRole="button"
      style={[styles.adjustButton, { backgroundColor: colors.onAccentFill }]}
    >
      <Text variant="bodyMedium" color="onAccent" tabular maxFontSizeMultiplier={DOCK_MAX_FONT_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pinnedToBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  progressTrack: { height: PROGRESS_TRACK_HEIGHT },
  // Абсолютный элемент без детей: анимация ширины здесь не трогает раскладку соседей.
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.restDockHeight - PROGRESS_TRACK_HEIGHT,
    paddingHorizontal: spacing.lg,
  },
  timerColumn: { minWidth: TIMER_COLUMN_MIN_WIDTH },
  buttonsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adjustButton: {
    width: ADJUST_BUTTON_WIDTH,
    height: layout.touchTarget,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: layout.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xs,
  },
  skipLabel: { fontFamily: fonts.semibold },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.restDockCompactHeight,
    paddingLeft: spacing.lg,
  },
  compactSkipButton: {
    width: layout.touchTarget,
    height: layout.restDockCompactHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
