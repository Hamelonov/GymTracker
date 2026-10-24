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

/** Выбранные пользователем единицы для замеров тела. */
export interface MeasurementUnits {
  weight: WeightUnit;
  length: MeasurementUnit;
}

/** Единица рядом со значением: «kg»/«lb» для веса тела, «%» для процента жира, «cm»/«in» для остальных. */
export function getMeasurementUnitLabel(type: MeasurementType, units: MeasurementUnits): string {
  const kind = measurementUnitKind(type);
  if (kind === 'weight') return units.weight;
  if (kind === 'percent') return '%';
  return units.length;
}

/** Переводит сохранённое значение (кг, % или см) в единицы пользователя. */
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

/** Переводит значение, введённое в единицах пользователя, в сохраняемые единицы (кг, % или см). */
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

/** Сохранённое значение в виде текста в единицах пользователя, например «82.5 kg» или «18 %». */
export function formatMeasurement(type: MeasurementType, value: number, units: MeasurementUnits): string {
  const displayValue = formatNumberWithoutTrailingZeros(
    roundForDisplay(convertToDisplayUnit(type, value, units), 1),
  );
  return `${displayValue} ${getMeasurementUnitLabel(type, units)}`;
}
