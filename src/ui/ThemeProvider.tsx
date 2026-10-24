import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { type ThemePreference, useSettings } from '@/store/settings';
import { darkColors, lightColors, type ColorScheme, type ThemeColors } from './tokens';

interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({ scheme: 'light', colors: lightColors, isDark: false });

function resolveColorScheme(
  themePreference: ThemePreference,
  systemScheme: string | null | undefined,
): ColorScheme {
  if (themePreference !== 'system') return themePreference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useSettings((state) => state.theme);
  const scheme = resolveColorScheme(themePreference, systemScheme);
  const theme = useMemo<Theme>(
    () => ({ scheme, colors: scheme === 'dark' ? darkColors : lightColors, isDark: scheme === 'dark' }),
    [scheme],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).colors;
}
