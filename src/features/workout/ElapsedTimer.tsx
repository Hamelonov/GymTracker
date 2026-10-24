import React from 'react';
import { formatDuration } from '@/domain/units';
import { Text, type TextProps } from '@/ui';
import { useElapsedSeconds } from './timers';

/**
 * Самообновляющаяся метка «м:сс». Секундный тик внутри этого крошечного
 * компонента означает, что остальной экран активной тренировки
 * не перерисовывается каждую секунду.
 */
export function ElapsedTimer({
  startedAt,
  fixedSeconds,
  ...textProps
}: { startedAt: number | null; fixedSeconds?: number } & Omit<TextProps, 'children'>) {
  const elapsedSeconds = useElapsedSeconds(fixedSeconds == null ? startedAt : null);
  return (
    <Text tabular {...textProps}>
      {formatDuration(fixedSeconds ?? elapsedSeconds)}
    </Text>
  );
}
