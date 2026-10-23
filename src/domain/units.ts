import type { DistanceUnit, MeasurementUnit, WeightUnit } from './types';

export const KG_PER_LB = 0.45359237;
export const M_PER_KM = 1000;
export const M_PER_MI = 1609.344;
export const CM_PER_IN = 2.54;

/** Display labels for units; swapped when the UI language changes. */
export const unitLabels: Record<string, string> = { kg: 'kg', lb: 'lb', km: 'km', mi: 'mi', cm: 'cm', in: 'in', h: 'h', m: 'm', s: 's' };

export function setUnitLabels(labels: Partial<typeof unitLabels>) {
  Object.assign(unitLabels, labels);
}

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function metersToUnit(m: number, unit: DistanceUnit): number {
  return unit === 'km' ? m / M_PER_KM : m / M_PER_MI;
}

export function unitToMeters(value: number, unit: DistanceUnit): number {
  return unit === 'km' ? value * M_PER_KM : value * M_PER_MI;
}

export function cmToUnit(cm: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? cm : cm / CM_PER_IN;
}

export function unitToCm(value: number, unit: MeasurementUnit): number {
  return unit === 'cm' ? value : value * CM_PER_IN;
}

/** Round to a sensible display precision (max 2 decimals, strip trailing zeros). */
export function roundDisplay(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function trimNumber(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return String(roundDisplay(v, 2));
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit, withUnit = true): string {
  if (kg == null || Number.isNaN(kg)) return '—';
  const v = roundDisplay(kgToUnit(kg, unit), 2);
  return withUnit ? `${trimNumber(v)} ${unitLabels[unit] ?? unit}` : trimNumber(v);
}

export function formatDistance(m: number | null | undefined, unit: DistanceUnit, withUnit = true): string {
  if (m == null) return '—';
  const v = roundDisplay(metersToUnit(m, unit), 2);
  return withUnit ? `${trimNumber(v)} ${unitLabels[unit] ?? unit}` : trimNumber(v);
}

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDuration(totalSec: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (totalSec == null || totalSec < 0) return '—';
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (opts.compact) {
    const L = unitLabels;
    if (h > 0) return `${h}${L.h} ${m}${L.m}`;
    if (m > 0) return sec > 0 ? `${m}${L.m} ${sec}${L.s}` : `${m}${L.m}`;
    return `${sec}${L.s}`;
  }
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`;
  return `${m}:${pad(sec)}`;
}

/** Parse user-typed number input: accepts comma decimal separator, empty → null. */
export function parseNumberInput(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '' || t === '.' || t === '-') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Parse "m:ss" / "h:mm:ss" or plain seconds into seconds. */
export function parseDurationInput(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const parts = t.split(':').map((p) => Number(p));
    if (parts.some((p) => !Number.isFinite(p))) return null;
    if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    return null;
  }
  const n = parseNumberInput(t);
  return n == null ? null : Math.round(n);
}

/** Format seconds as "m:ss" for editable inputs. */
export function durationToInput(sec: number | null): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${pad(s)}`;
}
