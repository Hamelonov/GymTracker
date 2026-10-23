import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';
import { darkColors, lightColors, type ColorScheme, type ThemeColors } from './tokens';

interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<Theme>({ scheme: 'light', colors: lightColors, isDark: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const scheme: ColorScheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const value = useMemo<Theme>(
    () => ({ scheme, colors: scheme === 'dark' ? darkColors : lightColors, isDark: scheme === 'dark' }),
    [scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useContext(ThemeContext).colors;
}
