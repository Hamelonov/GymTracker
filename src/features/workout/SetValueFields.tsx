import React from 'react';
import type { ActiveSet, DistanceUnit, ExtraField, SetFields, SetValues, WeightUnit } from '@/domain/types';
import {
  durationToInput,
  formatNumberWithoutTrailingZeros,
  kgToUnit,
  metersToUnit,
  parseDurationInput,
  parseNumberInput,
  roundForDisplay,
  unitToKg,
  unitToMeters,
} from '@/domain/units';
import { SetNumberField } from './SetNumberField';

interface SetValueFieldsProps {
  set: ActiveSet;
  fields: SetFields;
  extraFields: ExtraField[];
  units: { weight: WeightUnit; distance: DistanceUnit };
  isEditable: boolean;
  isDense: boolean | undefined;
  onChange: (patch: Partial<SetValues>) => void;
}

/** Форматирует значение с прошлого раза как плейсхолдер или пустую строку, если его не было. */
function placeholderFromPrevious(
  previousValue: number | null | undefined,
  format: (value: number) => string,
): string {
  return previousValue != null ? format(previousValue) : '';
}

/** Поля значений подхода: какие показать, решают тип упражнения и дополнительные колонки. */
export function SetValueFields({
  set,
  fields,
  extraFields,
  units,
  isEditable,
  isDense,
  onChange,
}: SetValueFieldsProps) {
  const showsWeight = fields.weight || extraFields.includes('weight');
  const formatWeightForInput = (weightKg: number) =>
    formatNumberWithoutTrailingZeros(roundForDisplay(kgToUnit(weightKg, units.weight)));
  const formatDistanceForInput = (meters: number) =>
    formatNumberWithoutTrailingZeros(roundForDisplay(metersToUnit(meters, units.distance)));

  return (
    <>
      {showsWeight ? (
        <SetNumberField
          value={set.weightKg}
          onCommit={(value) => onChange({ weightKg: value == null ? null : unitToKg(value, units.weight) })}
          placeholder={placeholderFromPrevious(set.previous?.weightKg, formatWeightForInput)}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : formatWeightForInput(value))}
          isEditable={isEditable}
          isCompleted={set.completed}
          isDense={isDense}
        />
      ) : null}
      {fields.reps ? (
        <SetNumberField
          value={set.reps}
          onCommit={(value) => onChange({ reps: value == null ? null : Math.round(value) })}
          placeholder={placeholderFromPrevious(set.previous?.reps, (reps) => String(reps))}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : String(value))}
          isEditable={isEditable}
          isCompleted={set.completed}
          isDense={isDense}
        />
      ) : null}
      {fields.distance ? (
        <SetNumberField
          value={set.distanceM}
          onCommit={(value) =>
            onChange({ distanceM: value == null ? null : unitToMeters(value, units.distance) })
          }
          placeholder={placeholderFromPrevious(set.previous?.distanceM, formatDistanceForInput)}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : formatDistanceForInput(value))}
          isEditable={isEditable}
          isCompleted={set.completed}
          isDense
        />
      ) : null}
      {fields.duration ? (
        <SetNumberField
          value={set.durationSec}
          onCommit={(value) => onChange({ durationSec: value })}
          placeholder={placeholderFromPrevious(set.previous?.durationSec, (seconds) =>
            durationToInput(seconds),
          )}
          parse={parseDurationInput}
          format={(value) => durationToInput(value)}
          isEditable={isEditable}
          isCompleted={set.completed}
          isDense
        />
      ) : null}
      {extraFields.includes('rir') ? (
        <SetNumberField
          value={set.rir}
          onCommit={(value) =>
            onChange({ rir: value == null ? null : Math.min(10, Math.max(0, Math.round(value))) })
          }
          placeholder={placeholderFromPrevious(set.previous?.rir, (rir) => String(rir))}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : String(value))}
          isEditable={isEditable}
          isCompleted={set.completed}
          isDense={isDense}
          isNarrow
        />
      ) : null}
      {extraFields.includes('rpe') ? (
        <SetNumberField
          value={set.rpe}
          onCommit={(value) => onChange({ rpe: value == null ? null : Math.min(10, Math.max(1, value)) })}
          placeholder={placeholderFromPrevious(set.previous?.rpe, formatNumberWithoutTrailingZeros)}
          parse={parseNumberInput}
          format={(value) => (value == null ? '' : formatNumberWithoutTrailingZeros(value))}
          isEditable={isEditable}
          isCompleted={set.completed}
          isDense={isDense}
          isNarrow
        />
      ) : null}
    </>
  );
}
