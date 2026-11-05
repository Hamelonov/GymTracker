import type { ThemeColors } from './tokens';

/** Короткие названия цветов, которые `Text` и `Icon` принимают вместо готовой строки цвета. */
export type ThemeColorName = 'text' | 'muted' | 'faint' | 'accent' | 'danger' | 'success' | 'onAccent';

/** Превращает название цвета вроде 'muted' в цвет текущей темы; любая другая строка используется как есть. */
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
