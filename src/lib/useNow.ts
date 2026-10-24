import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** Текущее время, фиксируется при монтировании и обновляется, когда экран получает фокус. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );
  return now;
}
