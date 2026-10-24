import { router } from 'expo-router';

type Href = Parameters<typeof router.push>[0];

let lastNavigationKey = '';
let lastNavigationAt = 0;
const DUPLICATE_WINDOW_MS = 800;

/**
 * `router.push`, который игнорирует вторую такую же навигацию в течение
 * короткого окна. Иначе быстрые двойные тапы на медленном устройстве открывают один и тот же
 * экран два-три раза.
 */
export function push(href: Href): void {
  const navigationKey = typeof href === 'string' ? href : JSON.stringify(href);
  const now = Date.now();
  if (navigationKey === lastNavigationKey && now - lastNavigationAt < DUPLICATE_WINDOW_MS) return;
  lastNavigationKey = navigationKey;
  lastNavigationAt = now;
  router.push(href);
}

/** Сбрасывает защиту, например после закрытия экрана, чтобы его можно было сразу открыть снова. */
export function resetNavigationGuard(): void {
  lastNavigationKey = '';
  lastNavigationAt = 0;
}
