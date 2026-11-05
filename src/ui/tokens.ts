export type ColorScheme = 'light' | 'dark';

export const palette = {
  yellow: '#FFD400',
  black: '#0A0A0A',
  white: '#FFFFFF',
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
  accentPressed: string;
  accentSoft: string;
  onAccent: string;
  onAccentMuted: string;
  onAccentFill: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  overlay: string;
  inputBackground: string;
  pressed: string;
  segmentIndicator: string;
  /** Тёмное в обеих темах: только здесь жёлтый разрешён как цвет текста и значков. */
  inverseSurface: string;
  inverseText: string;
  inverseMuted: string;
  /** Белая карточка на жёлтом экране итогов: не меняется вместе с темой. */
  paper: string;
  paperMuted: string;
  paperBorder: string;
  muscleBase: string;
  muscleSecondary: string;
  /** Фирменные цвета, которые не меняются вместе с темой. */
  black: string;
  white: string;
}

// Маркер и всё, что лежит на постоянных поверхностях, одинаково в обеих темах.
const themeIndependentColors = {
  accent: palette.yellow,
  accentPressed: '#F5C400',
  onAccent: palette.black,
  onAccentMuted: '#3D3700',
  onAccentFill: 'rgba(10,10,10,0.10)',
  inverseText: '#F7F7F2',
  inverseMuted: '#B3B2A9',
  paper: palette.white,
  paperMuted: '#504F49',
  paperBorder: '#E4E3DD',
  black: palette.black,
  white: palette.white,
};

export const lightColors: ThemeColors = {
  ...themeIndependentColors,
  background: '#FFFFFF',
  surface: '#F5F4F0',
  surfaceAlt: '#E9E8E2',
  surfaceRaised: '#FFFFFF',
  text: '#0A0A0A',
  textMuted: '#504F49',
  textFaint: '#6D6C64',
  border: '#E4E3DD',
  borderStrong: '#8C8B83',
  accentSoft: '#FFEC85',
  danger: '#C62A2F',
  dangerSoft: '#FCE9E8',
  success: '#17774A',
  successSoft: '#E3F4EB',
  overlay: 'rgba(10,10,10,0.50)',
  inputBackground: '#F5F4F0',
  pressed: 'rgba(10,10,10,0.06)',
  segmentIndicator: '#FFFFFF',
  inverseSurface: '#0A0A0A',
  muscleBase: '#2B2B28',
  muscleSecondary: '#A08A14',
};

export const darkColors: ThemeColors = {
  ...themeIndependentColors,
  background: '#0A0A0A',
  surface: '#171715',
  surfaceAlt: '#242421',
  surfaceRaised: '#1D1D1B',
  text: '#F7F7F2',
  textMuted: '#ABAAA1',
  textFaint: '#8D8C84',
  border: '#2C2C29',
  borderStrong: '#75746C',
  accentSoft: '#3F380E',
  danger: '#FF6B6B',
  dangerSoft: '#3B1A1C',
  success: '#3DD68C',
  successSoft: '#123023',
  overlay: 'rgba(0,0,0,0.65)',
  inputBackground: '#1D1D1B',
  pressed: 'rgba(255,255,255,0.08)',
  segmentIndicator: '#3A3A36',
  inverseSurface: '#262623',
  muscleBase: '#5E5E58',
  muscleSecondary: '#C9AE1A',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Фиксированные размеры каркаса: на них опираются сразу несколько экранов. */
export const layout = {
  touchTarget: 48,
  headerHeight: 56,
  tabBarHeight: 64,
  workoutBarHeight: 56,
  restDockHeight: 80,
  restDockCompactHeight: 44,
  rowMinHeight: 56,
  rowCompactMinHeight: 48,
  setRowHeight: 56,
  setCellHeight: 48,
  checkButtonWidth: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

// Приложение плоское: тень есть только у того, что лежит поверх экрана.
export const shadows = {
  sheet: '0 -6px 24px rgba(0, 0, 0, 0.18)',
  toast: '0 4px 16px rgba(0, 0, 0, 0.24)',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
} as const;

export const typeScale = {
  display: { fontSize: 40, lineHeight: 44, fontFamily: fonts.black, letterSpacing: -1.2 },
  h1: { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.6 },
  h2: { fontSize: 22, lineHeight: 28, fontFamily: fonts.bold, letterSpacing: -0.4 },
  h3: { fontSize: 17, lineHeight: 22, fontFamily: fonts.semibold, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, letterSpacing: 0 },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontFamily: fonts.medium, letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fonts.medium, letterSpacing: 0 },
  label: { fontSize: 11, lineHeight: 14, fontFamily: fonts.semibold, letterSpacing: 0.6 },
  numberHero: { fontSize: 56, lineHeight: 60, fontFamily: fonts.black, letterSpacing: -2 },
  timer: { fontSize: 40, lineHeight: 44, fontFamily: fonts.bold, letterSpacing: -1 },
  stat: { fontSize: 22, lineHeight: 26, fontFamily: fonts.bold, letterSpacing: -0.4 },
  statCompact: { fontSize: 18, lineHeight: 22, fontFamily: fonts.bold, letterSpacing: -0.2 },
  setValue: { fontSize: 20, lineHeight: 24, fontFamily: fonts.semibold, letterSpacing: 0 },
  setValueDense: { fontSize: 16, lineHeight: 20, fontFamily: fonts.semibold, letterSpacing: 0 },
  pen: { fontSize: 16, lineHeight: 28, fontFamily: fonts.regular, letterSpacing: 0 },
} as const;

export type TextVariant = keyof typeof typeScale;
