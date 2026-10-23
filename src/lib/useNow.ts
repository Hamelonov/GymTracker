import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/** Current timestamp captured on mount and refreshed whenever the screen gains focus. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );
  return now;
}
