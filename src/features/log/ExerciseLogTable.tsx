import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import type { SetRow } from '@/db/schema';
import { dateLocale } from '@/domain/dates';
import { buildPenGroups, formatPenSetValue, penTimesSign } from '@/domain/pen/serializeWorkout';
import {
  getSetFieldsForExerciseType,
  type DistanceUnit,
  type ExerciseType,
  type WeightUnit,
} from '@/domain/types';
import { formatNumberWithoutTrailingZeros, roundForDisplay } from '@/domain/units';
import { Card, Text, spacing, useColors } from '@/ui';

type Units = { weight: WeightUnit; distance: DistanceUnit };
type PenOptions = { weightUnit: WeightUnit; distanceUnit: DistanceUnit; language: string };

/** Ширины колонок фиксированы: таблица шире экрана и прокручивается по горизонтали. */
const COLUMN_WIDTHS = { day: 100, weight: 64, timesSign: 14, sets: 110, rir: 80, rpe: 80, note: 180 };

/** Дата цифрами в формате языка: «28.03.2026». */
function formatDay(timestamp: number, language: string): string {
  return format(timestamp, 'P', { locale: dateLocale(language) });
}

/** RIR или RPE всех подходов дня через слэш, как подходы: «0/1/1». Пустой подход — прочерк, чтобы позиции совпадали. */
function formatPerSet(sets: SetRow[], valueOf: (set: SetRow) => number | null): string {
  if (sets.every((set) => valueOf(set) == null)) return '—';
  return sets
    .map((set) => {
      const value = valueOf(set);
      return value != null ? formatNumberWithoutTrailingZeros(roundForDisplay(value, 2)) : '—';
    })
    .join('/');
}

interface WeightLine {
  /** «70кг» или null, если подходы без веса. */
  weight: string | null;
  /** «9/8/8» — подходы этого веса. */
  sets: string;
}

/** Строки одного дня — как в «Сегодня сделано»: каждый новый вес на своей строке, «70кг х 9/8», «65кг х 10». */
function buildWeightLines(sets: SetRow[], exerciseType: ExerciseType, options: PenOptions): WeightLine[] {
  const lines = buildPenGroups(sets, exerciseType, options).map((group) => ({
    weight: group.weightText,
    // RIR стоит в своей колонке, поэтому в подходах его скобок нет: иначе одно и то же написано дважды.
    sets:
      group.sets
        .map((set) => formatPenSetValue({ ...set, rir: null }, exerciseType, options))
        .filter((value) => value.length > 0)
        .join('/') || '—',
  }));
  return lines.length > 0 ? lines : [{ weight: null, sets: '—' }];
}

interface ExerciseLogTableProps {
  entries: ExerciseHistoryEntry[];
  exerciseType: ExerciseType;
  units: Units;
}

/** Таблица прогресса по упражнению: строка на день тренировки, в вёрстке блока «Сегодня сделано». */
export function ExerciseLogTable({ entries, exerciseType, units }: ExerciseLogTableProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const penOptions = { weightUnit: units.weight, distanceUnit: units.distance, language: i18n.language };
  const timesSign = penTimesSign(i18n.language);
  // У упражнений со своим весом в этой колонке дополнительный вес — это усложнение, а не рабочий вес.
  const weightTitle = getSetFieldsForExerciseType(exerciseType).weight
    ? translate('log.columnWeight')
    : translate('log.columnVariation');
  // Колонки без единого значения не показываются: ни веса у подтягиваний без отягощения, ни пустых RIR и RPE.
  const allSets = entries.flatMap((entry) => entry.sets);
  const hasWeight = allSets.some((set) => set.weightKg != null);
  const hasRir = allSets.some((set) => set.rir != null);
  const hasRpe = allSets.some((set) => set.rpe != null);
  const dividerStyle = { borderTopColor: colors.border };

  return (
    <Card raised style={styles.card}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tableContent}
      >
        <View>
          <View style={[styles.row, styles.headerRow]}>
            <HeaderCell title={translate('log.columnDay')} width={COLUMN_WIDTHS.day} />
            {hasWeight ? (
              <>
                <HeaderCell title={weightTitle} width={COLUMN_WIDTHS.weight} alignRight />
                <View style={{ width: COLUMN_WIDTHS.timesSign }} />
              </>
            ) : null}
            <HeaderCell title={translate('log.columnSets')} width={COLUMN_WIDTHS.sets} />
            {hasRir ? <HeaderCell title={translate('workout.rir')} width={COLUMN_WIDTHS.rir} /> : null}
            {hasRpe ? <HeaderCell title={translate('workout.rpe')} width={COLUMN_WIDTHS.rpe} /> : null}
            <HeaderCell title={translate('log.columnNote')} width={COLUMN_WIDTHS.note} />
          </View>

          {entries.map((entry) => (
            <View key={entry.workoutId} style={[styles.row, styles.dayRow, dividerStyle]}>
              <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.day }}>
                {formatDay(entry.startedAt, i18n.language)}
              </Text>
              <View style={styles.weightLines}>
                {buildWeightLines(entry.sets, exerciseType, penOptions).map((line, lineIndex) => (
                  <View key={lineIndex} style={styles.row}>
                    {hasWeight ? (
                      <>
                        <Text variant="bodyMedium" tabular style={styles.weightColumn}>
                          {line.weight ?? ''}
                        </Text>
                        <Text variant="bodyMedium" color="muted" style={styles.timesSignColumn}>
                          {line.weight != null ? timesSign : ''}
                        </Text>
                      </>
                    ) : null}
                    <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.sets }}>
                      {line.sets}
                    </Text>
                  </View>
                ))}
              </View>
              {hasRir ? (
                <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rir }}>
                  {formatPerSet(entry.sets, (set) => set.rir)}
                </Text>
              ) : null}
              {hasRpe ? (
                <Text variant="bodyMedium" tabular style={{ width: COLUMN_WIDTHS.rpe }}>
                  {formatPerSet(entry.sets, (set) => set.rpe)}
                </Text>
              ) : null}
              <Text
                variant="bodyMedium"
                color={entry.note ? 'text' : 'faint'}
                style={{ width: COLUMN_WIDTHS.note }}
              >
                {entry.note || '—'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

interface HeaderCellProps {
  title: string;
  width: number;
  /** Подпись веса прижата вправо, как и сами значения веса. */
  alignRight?: boolean;
}

function HeaderCell({ title, width, alignRight = false }: HeaderCellProps) {
  return (
    <Text variant="label" color="muted" style={{ width, textAlign: alignRight ? 'right' : 'left' }}>
      {title.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Отступы делает сама таблица внутри прокрутки, чтобы при сдвиге вбок текст не обрезался краем карточки.
  card: { paddingHorizontal: 0, paddingTop: spacing.lg, paddingBottom: 0 },
  headerRow: { paddingBottom: spacing.md },
  tableContent: { paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  dayRow: { paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  weightLines: { gap: spacing.xs },
  weightColumn: { width: COLUMN_WIDTHS.weight, textAlign: 'right' },
  timesSignColumn: { width: COLUMN_WIDTHS.timesSign, textAlign: 'center' },
});
