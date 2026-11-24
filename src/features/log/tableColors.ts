import type { ThemeColors } from '@/ui';

/** Во сколько раз границы таблицы заметнее сильной границы приложения: 1.4 — на 40% контрастнее фона. */
const BORDER_CONTRAST_FACTOR = 1.4;

function parseHexColor(hexColor: string): [number, number, number] {
  const digits = hexColor.replace('#', '');
  return [
    parseInt(digits.slice(0, 2), 16),
    parseInt(digits.slice(2, 4), 16),
    parseInt(digits.slice(4, 6), 16),
  ];
}

function toHexColor(channels: number[]): string {
  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/**
 * Меняет, насколько цвет отличается от фона: 1 — цвет как есть, 1.1 — отличие на 10% больше,
 * 0.25 — только четверть отличия. Работает для цветов вида #RRGGBB.
 */
export function scaleColorDifference(color: string, backgroundColor: string, factor: number): string {
  const colorChannels = parseHexColor(color);
  const backgroundChannels = parseHexColor(backgroundColor);
  const scaledChannels = colorChannels.map((channel, index) => {
    const backgroundChannel = backgroundChannels[index] ?? 0;
    const scaledChannel = Math.round(backgroundChannel + (channel - backgroundChannel) * factor);
    return Math.min(255, Math.max(0, scaledChannel));
  });
  return toHexColor(scaledChannels);
}

export interface LogTableColors {
  headerBackground: string;
  firstRowBackground: string;
  secondRowBackground: string;
  border: string;
}

/** Цвета таблицы журнала: бледно-жёлтый заголовок, белые и светло-серые чередующиеся строки и заметные границы. */
export function getLogTableColors(colors: ThemeColors): LogTableColors {
  const firstRowBackground = colors.background;
  return {
    // Яркий акцентный жёлтый на большой шапке слишком кричит, поэтому берём его бледный вариант.
    headerBackground: colors.accentFaint,
    firstRowBackground,
    secondRowBackground: colors.surfaceAlt,
    border: scaleColorDifference(colors.borderStrong, firstRowBackground, BORDER_CONTRAST_FACTOR),
  };
}
