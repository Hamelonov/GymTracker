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
const COLUMN_WIDTHS = { day: 124, weight: 170, sets: 220, total: 70, note: 160 };
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

/** Значение одного подхода: повторы с RIR и RPE, время или дистанция со временем. */
function formatSetValue(set: SetRow, fields: SetFields, units: Units): string {
  if (fields.reps) {
    const rir = set.rir != null ? `(${set.rir})` : '';
    const rpe = set.rpe != null ? ` @${formatNumber(set.rpe)}` : '';
    return `${set.reps ?? '—'}${rir}${rpe}`;
  }
  const parts: string[] = [];
  if (fields.distance && set.distanceM != null) {
    parts.push(
      `${formatNumber(metersToUnit(set.distanceM, units.distance))} ${unitLabels[units.distance] ?? units.distance}`,
    );
  }
  if (fields.duration && set.durationSec != null) parts.push(formatDuration(set.durationSec));
  return parts.join(' ') || '—';
}

/** Колонка «Подход № / Повтор»: «1/10 - 2/9 - 3/8», разминка и отказ помечены буквой. */
function formatSets(sets: SetRow[], fields: SetFields, units: Units, translate: Translate): string {
  return sets
    .map((set, index) => {
      const typeMark =
        set.type === 'normal' ? '' : ` ${translate(`workout.setTypeShort.${set.type}`).toLowerCase()}`;
      return `${index + 1}/${formatSetValue(set, fields, units)}${typeMark}`;
    })
    .join(SET_SEPARATOR);
}

/** Колонка «Итого»: сумма повторов, общее время или дистанция. */
function formatTotal(sets: SetRow[], fields: SetFields, units: Units): string {
  if (fields.reps) return String(sets.reduce((total, set) => total + (set.reps ?? 0), 0));
  if (fields.distance) {
    const meters = sets.reduce((total, set) => total + (set.distanceM ?? 0), 0);
    return `${formatNumber(metersToUnit(meters, units.distance))} ${unitLabels[units.distance] ?? units.distance}`;
  }
  return formatDuration(sets.reduce((total, set) => total + (set.durationSec ?? 0), 0));
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
  const columns: { key: keyof typeof COLUMN_WIDTHS; label: string }[] = [
    { key: 'day', label: translate('log.columnDay') },
    { key: 'weight', label: translate('log.columnWeight') },
    { key: 'sets', label: translate('log.columnSets') },
    { key: 'total', label: translate('log.columnTotal') },
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
                {formatSets(entry.sets, fields, units, translate)}
              </Text>
            </View>
            <View style={[styles.cell, borderStyle, { width: COLUMN_WIDTHS.total }]}>
              <Text variant="caption" tabular>
                {formatTotal(entry.sets, fields, units)}
              </Text>
            </View>
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
