import type { DistanceUnit, MeasurementUnit, WeightUnit } from './types';

export const KILOGRAMS_PER_POUND = 0.45359237;
export const METERS_PER_KILOMETER = 1000;
export const METERS_PER_MILE = 1609.344;
export const CENTIMETERS_PER_INCH = 2.54;

/** Подписи единиц для отображения; меняются при смене языка интерфейса. */
export const unitLabels: Record<string, string> = {
  kg: 'kg',
  lb: 'lb',
  km: 'km',
  mi: 'mi',
  cm: 'cm',
  in: 'in',
  h: 'h',
  m: 'm',
  s: 's',
};

export function setUnitLabels(labels: Partial<typeof unitLabels>) {
  Object.assign(unitLabels, labels);
}

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KILOGRAMS_PER_POUND;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KILOGRAMS_PER_POUND;
}

export function metersToUnit(meters: number, unit: DistanceUnit): number {
  return unit === 'km' ? meters / METERS_PER_KILOMETER : meters / METERS_PER_MILE;
}

export function unitToMeters(value: number, unit: DistanceUnit): number {
  return unit === 'km' ? value * METERS_PER_KILOMETER : value * METERS_PER_MILE;
}

export function cmToUnit(cm: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? cm : cm / CENTIMETERS_PER_INCH;
}

export function unitToCm(value: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? value : value * CENTIMETERS_PER_INCH;
}

/** Округляет до разумной точности для показа (максимум 2 знака, лишние нули убираются). */
export function roundForDisplay(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatNumberWithoutTrailingZeros(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(roundForDisplay(value, 2));
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit, withUnit = true): string {
  if (kg == null || Number.isNaN(kg)) return '—';
  const valueInUnit = roundForDisplay(kgToUnit(kg, unit), 2);
  return withUnit
    ? `${formatNumberWithoutTrailingZeros(valueInUnit)} ${unitLabels[unit] ?? unit}`
    : formatNumberWithoutTrailingZeros(valueInUnit);
}

export function formatDistance(
  meters: number | null | undefined,
  unit: DistanceUnit,
  withUnit = true,
): string {
  if (meters == null) return '—';
  const valueInUnit = roundForDisplay(metersToUnit(meters, unit), 2);
  return withUnit
    ? `${formatNumberWithoutTrailingZeros(valueInUnit)} ${unitLabels[unit] ?? unit}`
    : formatNumberWithoutTrailingZeros(valueInUnit);
}

export function padToTwoDigits(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function formatDuration(
  totalSec: number | null | undefined,
  options: { compact?: boolean } = {},
): string {
  if (totalSec == null || totalSec < 0) return '—';
  const roundedSeconds = Math.round(totalSec);
  const hours = Math.floor(roundedSeconds / 3600);
  const minutes = Math.floor((roundedSeconds % 3600) / 60);
  const seconds = roundedSeconds % 60;
  if (options.compact) {
    if (hours > 0) return `${hours}${unitLabels.h} ${minutes}${unitLabels.m}`;
    if (minutes > 0 && seconds > 0) return `${minutes}${unitLabels.m} ${seconds}${unitLabels.s}`;
    if (minutes > 0) return `${minutes}${unitLabels.m}`;
    return `${seconds}${unitLabels.s}`;
  }
  if (hours > 0) return `${hours}:${padToTwoDigits(minutes)}:${padToTwoDigits(seconds)}`;
  return `${minutes}:${padToTwoDigits(seconds)}`;
}

/** Разбирает число, введённое пользователем: принимает запятую как разделитель, пусто → null. */
export function parseNumberInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || normalized === '.' || normalized === '-') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Разбирает «m:ss» / «h:mm:ss» или просто секунды в секунды. */
export function parseDurationInput(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return null;
    const [first = 0, second = 0, third = 0] = parts;
    if (parts.length === 2) return first * 60 + second;
    if (parts.length === 3) return first * 3600 + second * 60 + third;
    return null;
  }
  const seconds = parseNumberInput(trimmed);
  return seconds == null ? null : Math.round(seconds);
}

/** Форматирует секунды как «m:ss» для редактируемых полей. */
export function durationToInput(totalSeconds: number | null): string {
  if (totalSeconds == null) return '';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${padToTwoDigits(seconds)}`;
}
