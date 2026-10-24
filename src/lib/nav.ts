import { router } from 'expo-router';

type Href = Parameters<typeof router.push>[0];

let lastNavigationKey = '';
let lastNavigationAt = 0;
const DUPLICATE_WINDOW_MS = 800;

/**
 * `router.push` that ignores a second identical navigation fired within a
 * short window. Rapid double taps on a slow device otherwise open the same
 * screen two or three times.
 */
export function push(href: Href): void {
  const navigationKey = typeof href === 'string' ? href : JSON.stringify(href);
  const now = Date.now();
  if (navigationKey === lastNavigationKey && now - lastNavigationAt < DUPLICATE_WINDOW_MS) return;
  lastNavigationKey = navigationKey;
  lastNavigationAt = now;
  router.push(href);
}

/** Resets the guard, e.g. after a screen was closed so it can be reopened right away. */
export function resetNavigationGuard(): void {
  lastNavigationKey = '';
  lastNavigationAt = 0;
}
