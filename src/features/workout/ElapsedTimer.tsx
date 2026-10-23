import React from 'react';
import { formatDuration } from '@/domain/units';
import { Text, type TextProps } from '@/ui';
import { useElapsed } from './ActiveWorkoutBar';

/**
 * Self-updating "m:ss" label. Keeping the 1-second tick inside this tiny
 * component means the rest of the active workout screen is not re-rendered
 * every second.
 */
export function ElapsedTimer({ startedAt, fixedSeconds, ...rest }: { startedAt: number | null; fixedSeconds?: number } & Omit<TextProps, 'children'>) {
  const elapsed = useElapsed(fixedSeconds == null ? startedAt : null);
  return (
    <Text tabular {...rest}>
      {formatDuration(fixedSeconds ?? elapsed)}
    </Text>
  );
}
