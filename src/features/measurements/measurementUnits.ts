import {
  measurementUnitKind,
  type MeasurementType,
  type MeasurementUnit,
  type WeightUnit,
} from '@/domain/types';
import {
  cmToUnit,
  kgToUnit,
  roundForDisplay,
  formatNumberWithoutTrailingZeros,
  unitToCm,
  unitToKg,
} from '@/domain/units';

/** The user's chosen units for body measurements. */
export interface MeasurementUnits {
  weight: WeightUnit;
  length: MeasurementUnit;
}

/** Unit shown next to a value: "kg"/"lb" for body weight, "%" for body fat, "cm"/"in" for the rest. */
export function getMeasurementUnitLabel(type: MeasurementType, units: MeasurementUnits): string {
  const kind = measurementUnitKind(type);
  if (kind === 'weight') return units.weight;
  if (kind === 'percent') return '%';
  return units.length;
}

/** Converts a stored value (kg, % or cm) into the user's unit. */
export function convertToDisplayUnit(
  type: MeasurementType,
  storedValue: number,
  units: MeasurementUnits,
): number {
  const kind = measurementUnitKind(type);
  if (kind === 'weight') return kgToUnit(storedValue, units.weight);
  if (kind === 'percent') return storedValue;
  return cmToUnit(storedValue, units.length);
}

/** Converts a value typed in the user's unit into the stored unit (kg, % or cm). */
export function convertToStoredUnit(
  type: MeasurementType,
  displayValue: number,
  units: MeasurementUnits,
): number {
  const kind = measurementUnitKind(type);
  if (kind === 'weight') return unitToKg(displayValue, units.weight);
  if (kind === 'percent') return displayValue;
  return unitToCm(displayValue, units.length);
}

/** A stored value as text in the user's unit, e.g. "82.5 kg" or "18 %". */
export function formatMeasurement(type: MeasurementType, value: number, units: MeasurementUnits): string {
  const displayValue = formatNumberWithoutTrailingZeros(
    roundForDisplay(convertToDisplayUnit(type, value, units), 1),
  );
  return `${displayValue} ${getMeasurementUnitLabel(type, units)}`;
}
