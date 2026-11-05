import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRestTimer } from '@/store/restTimer';

/** Проверяем чаще раза в секунду, чтобы на экране никогда не пропускалось число. */
const REST_TICK_MS = 250;

/** Целые секунды с `startedAt`, обновляется каждую секунду. Возвращает 0, если времени начала нет. */
export function useElapsedSeconds(startedAt: number | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt == null) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [startedAt]);
  return startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}

function readRemainingRestSeconds(): number {
  const { endsAt } = useRestTimer.getState();
  return endsAt == null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function subscribeToRestTicks(onTick: () => void) {
  const intervalId = setInterval(onTick, REST_TICK_MS);
  return () => clearInterval(intervalId);
}

function subscribeToNothing() {
  return () => {};
}

/** Секунды, оставшиеся на таймере отдыха. Завершает таймер, когда он доходит до нуля. */
export function useRestCountdown(): { remaining: number; total: number; running: boolean } {
  const endsAt = useRestTimer((state) => state.endsAt);
  const total = useRestTimer((state) => state.totalSec);
  const finishRest = useRestTimer((state) => state.finish);
  // Тик четыре раза в секунду, но перерисовка только при смене целого числа: React сравнивает снимки сам.
  const remaining = useSyncExternalStore(
    endsAt == null ? subscribeToNothing : subscribeToRestTicks,
    readRemainingRestSeconds,
  );
  useEffect(() => {
    if (endsAt != null && remaining === 0) finishRest();
  }, [remaining, endsAt, finishRest]);
  return { remaining, total, running: endsAt != null };
}
