import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ExerciseHistoryEntry } from '@/db/repo/exercises';
import { dateLocale } from '@/domain/dates';
import { penTimesSign } from '@/domain/pen/serializeWorkout';
import type { DistanceUnit, ExerciseType, WeightUnit } from '@/domain/types';
import { buildWeightLines, describeLogColumns, formatPerSet } from './logLines';
import { PinchZoomView } from './PinchZoomView';
import { Card, Text, spacing, useColors } from '@/ui';

type Units = { weight: WeightUnit; distance: DistanceUnit };

/** Ширины колонок фиксированы: таблица шире экрана и прокручивается по горизонтали. */
const COLUMN_WIDTHS = { day: 100, weight: 64, timesSign: 14, sets: 110, rir: 80, rpe: 80, note: 180 };

/** Дата цифрами в формате языка: «28.03.2026». */
function formatDay(timestamp: number, language: string): string {
  return format(timestamp, 'P', { locale: dateLocale(language) });
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
  const { hasWeight, hasRir, hasRpe, weightTitleKey } = describeLogColumns(entries, exerciseType);
  const weightTitle = translate(weightTitleKey);
  const dividerStyle = { borderTopColor: colors.border };

  return (
    <Card raised style={styles.card}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tableContent}
      >
        <PinchZoomView>
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
        </PinchZoomView>
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
