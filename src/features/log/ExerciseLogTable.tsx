import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { SetRow } from '@/db/schema';
import { dateLocale } from '@/domain/dates';
import type { DistanceUnit, SetFields, WeightUnit } from '@/domain/types';
import {
  formatDuration,
  formatNumberWithoutTrailingZeros,
  kgToUnit,
  metersToUnit,
  roundForDisplay,
  unitLabels,
} from '@/domain/units';
import { Text, radius, spacing, useColors } from '@/ui';

type Units = { weight: WeightUnit; distance: DistanceUnit };
type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Ширины колонок фиксированы: таблица шире экрана и прокручивается по горизонтали. */
const COLUMN_WIDTHS = { day: 124, weight: 170, sets: 150, rir: 80, rpe: 90, note: 180 };
const SET_SEPARATOR = ' - ';

function formatNumber(value: number): string {
  return formatNumberWithoutTrailingZeros(roundForDisplay(value, 2));
}

/** Дата цифрами в формате языка: «28.03.2026». */
function formatDay(timestamp: number, language: string): string {
  return format(timestamp, 'P', { locale: dateLocale(language) });
}

/** Если во всех подходах одно значение — пишем его один раз, иначе через « - » по подходам. */
function joinIfDifferent(values: string[]): string {
  if (values.length === 0) return '';
  return new Set(values).size === 1 ? (values[0] ?? '') : values.join(SET_SEPARATOR);
}

/** Колонка «Вес»: килограммы по подходам; у упражнений со своим весом — «свой вес» или «+10». */
function formatWeights(sets: SetRow[], fields: SetFields, units: Units, translate: Translate): string {
  const unitLabel = unitLabels[units.weight] ?? units.weight;
  const values = sets.map((set) => {
    if (set.weightKg == null) return fields.weight ? '' : translate('log.bodyweight');
    const weight = formatNumber(kgToUnit(set.weightKg, units.weight));
    return fields.weight ? weight : `+${weight}`;
  });
  const joined = joinIfDifferent(values.filter((value) => value.length > 0));
  // Единица пишется один раз в конце, чтобы строка не разрасталась: «70 - 70 - 80 кг».
  const hasNumbers = values.some((value) => /\d/.test(value));
  return hasNumbers ? `${joined} ${unitLabel}` : joined;
}

/** Буквы типа подхода — те же, что в записи текстом: разминка, отказ, дроп-сет. */
const SET_TYPE_SUFFIX_RU: Record<SetRow['type'], string> = {
  normal: '',
  warmup: 'р',
  failure: 'о',
  drop: 'д',
};
const SET_TYPE_SUFFIX_EN: Record<SetRow['type'], string> = {
  normal: '',
  warmup: 'w',
  failure: 'f',
  drop: 'd',
};

/** Значение одного подхода в записи режима «Ручка»: «9(1)о», «1:00», «5 км 25:00». */
function formatSetValue(set: SetRow, fields: SetFields, units: Units, language: string): string {
  const suffixes = language.startsWith('ru') ? SET_TYPE_SUFFIX_RU : SET_TYPE_SUFFIX_EN;
  if (fields.reps) {
    return `${set.reps ?? '—'}${suffixes[set.type]}`;
  }
  const parts: string[] = [];
  if (fields.distance && set.distanceM != null) {
    parts.push(
      `${formatNumber(metersToUnit(set.distanceM, units.distance))} ${unitLabels[units.distance] ?? units.distance}`,
    );
  }
  if (fields.duration && set.durationSec != null) parts.push(formatDuration(set.durationSec));
  return `${parts.join(' ') || '—'}${suffixes[set.type]}`;
}

/** Колонка «Подходы» — как в записи во время тренировки: «6/6/6» — три подхода по шесть. */
function formatSets(sets: SetRow[], fields: SetFields, units: Units, language: string): string {
  return sets.map((set) => formatSetValue(set, fields, units, language)).join('/');
}

/** RIR и RPE по подходам через слэш, пустой подход — прочерк, чтобы позиции совпадали с колонкой подходов. */
function formatPerSet(sets: SetRow[], valueOf: (set: SetRow) => number | null): string {
  return sets
    .map((set) => {
      const value = valueOf(set);
      return value != null ? formatNumber(value) : '—';
    })
    .join('/');
}

interface ExerciseLogTableProps {
  entries: ExerciseHistoryEntry[];
  fields: SetFields;
  units: Units;
}

/** Таблица прогресса по упражнению: строка на день тренировки, как в журнале владельца. */
export function ExerciseLogTable({ entries, fields, units }: ExerciseLogTableProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const borderStyle = { borderColor: colors.border };
  // RIR и RPE показываются только если у упражнения они хоть раз записаны: пустых колонок не нужно.
  const allSets = entries.flatMap((entry) => entry.sets);
  const hasRir = allSets.some((set) => set.rir != null);
  const hasRpe = allSets.some((set) => set.rpe != null);
  const columns: { key: keyof typeof COLUMN_WIDTHS; label: string }[] = [
    { key: 'day', label: translate('log.columnDay') },
    { key: 'weight', label: translate('log.columnWeight') },
    { key: 'sets', label: translate('log.columnSets') },
    ...(hasRir ? [{ key: 'rir' as const, label: translate('workout.rir') }] : []),
    ...(hasRpe ? [{ key: 'rpe' as const, label: translate('workout.rpe') }] : []),
    { key: 'note', label: translate('log.columnNote') },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, borderStyle]}>
        <View style={[styles.row, { backgroundColor: colors.accentSoft }]}>
          {columns.map((column) => (
            <View key={column.key} style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS[column.key] }]}>
              <Text variant="caption" color="muted">
                {column.label}
              </Text>
            </View>
          ))}
        </View>
        {entries.map((entry) => (
          <View key={entry.workoutId} style={[styles.row, styles.bodyRow, borderStyle]}>
            <View style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS.day }]}>
              <Text variant="caption">{formatDay(entry.startedAt, i18n.language)}</Text>
            </View>
            <View style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS.weight }]}>
              <Text variant="caption" tabular>
                {formatWeights(entry.sets, fields, units, translate)}
              </Text>
            </View>
            <View style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS.sets }]}>
              <Text variant="caption" tabular>
                {formatSets(entry.sets, fields, units, i18n.language)}
              </Text>
            </View>
            {hasRir ? (
              <View style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS.rir }]}>
                <Text variant="caption" tabular>
                  {formatPerSet(entry.sets, (set) => set.rir)}
                </Text>
              </View>
            ) : null}
            {hasRpe ? (
              <View style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS.rpe }]}>
                <Text variant="caption" tabular>
                  {formatPerSet(entry.sets, (set) => set.rpe)}
                </Text>
              </View>
            ) : null}
            <View style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS.note }]}>
              <Text variant="caption" color={entry.note ? 'text' : 'faint'}>
                {entry.note || '—'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  bodyRow: { borderTopWidth: StyleSheet.hairlineWidth },
  cell: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
});
