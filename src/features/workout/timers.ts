import { useEffect, useState } from 'react';
import { useRestTimer } from '@/store/restTimer';

/** Whole seconds since `startedAt`, updated every second. Returns 0 when there is no start time. */
export function useElapsedSeconds(startedAt: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt == null) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [startedAt]);
  return startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** Seconds left on the rest timer. Finishes the timer once it reaches zero. */
export function useRestCountdown(): { remaining: number; total: number; running: boolean } {
  const endsAt = useRestTimer((state) => state.endsAt);
  const total = useRestTimer((state) => state.totalSec);
  const finishRest = useRestTimer((state) => state.finish);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt == null) return undefined;
    // Tick faster than once a second so the display never skips a number.
    const intervalId = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(intervalId);
  }, [endsAt]);
  const remaining = endsAt == null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  useEffect(() => {
    if (endsAt != null && now >= endsAt) finishRest();
  }, [now, endsAt, finishRest]);
  return { remaining, total, running: endsAt != null };
}
