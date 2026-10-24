import type { ThemeColors } from './tokens';

/** Short color names that Text and Icon accept instead of a raw color string. */
export type ThemeColorName = 'text' | 'muted' | 'faint' | 'accent' | 'danger' | 'success' | 'onAccent';

/** Turns a color name like 'muted' into the current theme's color; any other string is used as is. */
export function resolveThemeColor(color: string, colors: ThemeColors): string {
  const colorsByName: Record<ThemeColorName, string> = {
    text: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    accent: colors.accent,
    danger: colors.danger,
    success: colors.success,
    onAccent: colors.onAccent,
  };
  return colorsByName[color as ThemeColorName] ?? color;
}
