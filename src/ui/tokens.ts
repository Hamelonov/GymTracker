export type ColorScheme = 'light' | 'dark';

export const palette = {
  yellow: '#FFD400',
  yellowDeep: '#F5C400',
  yellowSoft: '#FFF4B8',
  yellowFaint: '#FFF9D6',
  black: '#0A0A0A',
  white: '#FFFFFF',
  red: '#E5484D',
  green: '#30A46C',
  blue: '#3E63DD',
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  /** Фон отмеченного подхода: светлее accentSoft, чтобы жёлтый квадрат с галочкой не сливался. */
  accentFaint: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  info: string;
  overlay: string;
  tabBar: string;
  inputBackground: string;
  /** Фирменные цвета, которые не меняются вместе с темой. */
  black: string;
  white: string;
}

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F6F6F4',
  surfaceAlt: '#ECECE9',
  surfaceRaised: '#FFFFFF',
  text: '#0A0A0A',
  textMuted: '#6A6A66',
  textFaint: '#A3A39E',
  border: '#E6E6E2',
  borderStrong: '#CFCFCA',
  accent: palette.yellow,
  accentSoft: palette.yellowSoft,
  accentFaint: palette.yellowFaint,
  onAccent: palette.black,
  danger: palette.red,
  dangerSoft: '#FDECEC',
  success: palette.green,
  successSoft: '#E6F6EE',
  info: palette.blue,
  overlay: 'rgba(10,10,10,0.45)',
  tabBar: 'rgba(255,255,255,0.96)',
  inputBackground: '#F0F0ED',
  black: palette.black,
  white: palette.white,
};

export const darkColors: ThemeColors = {
  background: '#0A0A0A',
  surface: '#161616',
  surfaceAlt: '#212121',
  surfaceRaised: '#1C1C1C',
  text: '#F7F7F5',
  textMuted: '#9C9C97',
  textFaint: '#5E5E5A',
  border: '#262626',
  borderStrong: '#3A3A3A',
  accent: palette.yellow,
  accentSoft: '#3A3410',
  accentFaint: '#2A260E',
  onAccent: palette.black,
  danger: '#F2555A',
  dangerSoft: '#3A1C1E',
  success: '#3DD68C',
  successSoft: '#153226',
  info: '#6E8CFF',
  overlay: 'rgba(0,0,0,0.6)',
  tabBar: 'rgba(10,10,10,0.96)',
  inputBackground: '#1F1F1F',
  black: palette.black,
  white: palette.white,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
} as const;

export const typeScale = {
  display: { fontSize: 44, lineHeight: 48, fontFamily: fonts.black, letterSpacing: -1.5 },
  h1: { fontSize: 30, lineHeight: 36, fontFamily: fonts.bold, letterSpacing: -0.8 },
  h2: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, letterSpacing: -0.4 },
  h3: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular, letterSpacing: 0 },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontFamily: fonts.medium, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 17, fontFamily: fonts.medium, letterSpacing: 0 },
  label: { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, letterSpacing: 0.6 },
  mono: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold, letterSpacing: -0.2 },
} as const;

export type TextVariant = keyof typeof typeScale;
