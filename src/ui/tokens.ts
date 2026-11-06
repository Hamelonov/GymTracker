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
  infoSoft: string;
  coral: string;
  coralSoft: string;
  violet: string;
  violetSoft: string;
  overlay: string;
  tabBar: string;
  inputBackground: string;
  /** Фирменные цвета, которые не меняются вместе с темой. */
  black: string;
  white: string;
}

export const lightColors: ThemeColors = {
  background: '#FBF9F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EFE7',
  surfaceRaised: '#FFFFFF',
  text: '#17150F',
  textMuted: '#6E695C',
  textFaint: '#A9A394',
  border: '#ECE8DD',
  borderStrong: '#D6D1C3',
  accent: palette.yellow,
  accentSoft: '#FFF0B0',
  accentFaint: '#FFF8DB',
  onAccent: '#17150F',
  danger: '#E5484D',
  dangerSoft: '#FDEBEA',
  success: '#16A673',
  successSoft: '#DFF5EC',
  info: '#4F6BED',
  infoSoft: '#E7EBFF',
  coral: '#FF6B45',
  coralSoft: '#FFE8E1',
  violet: '#8B5CF6',
  violetSoft: '#EFE9FF',
  overlay: 'rgba(23,21,15,0.42)',
  tabBar: '#FFFFFF',
  inputBackground: '#F2EFE7',
  black: palette.black,
  white: palette.white,
};

export const darkColors: ThemeColors = {
  background: '#0F0E0B',
  surface: '#1A1815',
  surfaceAlt: '#26231E',
  surfaceRaised: '#211F1A',
  text: '#F7F4EC',
  textMuted: '#A39E90',
  textFaint: '#6B675B',
  border: '#2B2822',
  borderStrong: '#3E3A31',
  accent: palette.yellow,
  accentSoft: '#3D3410',
  accentFaint: '#2A2510',
  onAccent: '#17150F',
  danger: '#F2555A',
  dangerSoft: '#3B1D1E',
  success: '#34D399',
  successSoft: '#12332A',
  info: '#7C93FF',
  infoSoft: '#1E2547',
  coral: '#FF8A66',
  coralSoft: '#3C2119',
  violet: '#A78BFA',
  violetSoft: '#2A2145',
  overlay: 'rgba(0,0,0,0.6)',
  tabBar: '#1A1815',
  inputBackground: '#26231E',
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
  sm: 12,
  md: 16,
  lg: 22,
  xl: 32,
  pill: 999,
} as const;

/** Тень только у карточек и шторок и только в светлой теме: в тёмной глубину даёт surface на background. */
export const shadows = {
  card: { boxShadow: '0 2px 12px rgba(23,21,15,0.06)' },
  none: {},
} as const;

/** Длительности в мс. Кривая: Easing.out(Easing.cubic), на уход Easing.in(Easing.cubic). */
export const motion = {
  press: 70,
  quick: 140,
  base: 180,
  exit: 130,
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
