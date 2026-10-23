import { router } from 'expo-router';

type Href = Parameters<typeof router.push>[0];

let lastKey = '';
let lastAt = 0;
const WINDOW_MS = 800;

/**
 * `router.push` that ignores a second identical navigation fired within a
 * short window. Rapid double taps on a slow device otherwise open the same
 * screen two or three times.
 */
export function push(href: Href): void {
  const key = typeof href === 'string' ? href : JSON.stringify(href);
  const now = Date.now();
  if (key === lastKey && now - lastAt < WINDOW_MS) return;
  lastKey = key;
  lastAt = now;
  router.push(href);
}

/** Resets the guard, e.g. after a screen was closed so it can be reopened right away. */
export function resetNavGuard(): void {
  lastKey = '';
  lastAt = 0;
}
