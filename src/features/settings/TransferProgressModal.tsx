import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import type { TransferProgressState } from '@/features/settings/useDataTransfer';
import { Text, radius, spacing, useColors } from '@/ui';

interface TransferProgressModalProps {
  progressState: TransferProgressState | null;
}

export function TransferProgressModal({ progressState }: TransferProgressModalProps) {
  const colors = useColors();

  if (!progressState) return null;

  const progressPercent = Math.round(Math.max(0, Math.min(1, progressState.progress)) * 100);

  return (
    <Modal
      transparent
      visible={progressState.isVisible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surfaceRaised }]}>
          <Text variant="h3">{progressState.titleText}</Text>
          <Text color="muted" style={styles.stageText}>
            {progressState.stageText}
          </Text>
          <View style={styles.progressRow}>
            <View
              style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}
              accessibilityRole="progressbar"
              accessibilityLabel={progressState.titleText}
              accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%`, backgroundColor: colors.accent },
                ]}
              />
            </View>
            <Text variant="caption" tabular style={styles.progressPercent}>
              {progressPercent}%
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  stageText: { marginTop: spacing.sm },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill },
  progressPercent: { minWidth: 40, textAlign: 'right' },
});
