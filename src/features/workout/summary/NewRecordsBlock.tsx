import { Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { exerciseName } from '@/db/repo/exercises';
import type { SaveResult, WorkoutDetail } from '@/db/repo/workouts';
import { pickRecordMetric, recordGain, type ValueFormatters, type RecordMetric } from '@/domain/summary';
import { formatPenSetValue, formatPenWeight, penTimesSign } from '@/domain/pen/serializeWorkout';
import { getSetFieldsForExerciseType, type SetValues } from '@/domain/types';
import { useSettings } from '@/store/settings';
import { Card, Text, spacing, useColors } from '@/ui';
import { SUMMARY_MUTED_TEXT_COLOR, SummaryBlockHeader, summaryStyles } from './SummaryBlockHeader';
import { SummaryTableHeader, summaryTableStyles } from './SummaryTable';

// Неразрывный пробел: «80 кг» не должно разрываться на две строки в узкой колонке.
const NON_BREAKING_SPACE = ' ';

/** Что написать мелко под значением: прошлый рекорд и прибавку или «впервые». */
type RecordChange = { kind: 'gain'; previousValue: string; gainText: string } | { kind: 'firstTime' };

/** Одна ячейка таблицы: значение рекордного подхода и, если рекорд в ней, его изменение. */
interface RecordCell {
  value: string;
  change: RecordChange | null;
}

/** Одно упражнение с рекордом: вес и повторы (или время, дистанция) рекордного подхода. */
interface RecordRow {
  id: string;
  name: string;
  /** null для упражнений без веса. */
  weight: RecordCell | null;
  result: RecordCell;
}

type SetMetricValues = Pick<SetValues, 'weightKg' | 'reps' | 'durationSec' | 'distanceM'>;

function setValueForMetric(set: SetMetricValues, metric: RecordMetric): number | null {
  switch (metric) {
    case 'weight':
      return set.weightKg;
    case 'reps':
      return set.reps;
    case 'duration':
      return set.durationSec;
    case 'distance':
      return set.distanceM;
  }
}

/** При равном рекорде показываем подход, где второй показатель больше: больше повторов или больше вес. */
function tieBreakerValue(set: SetMetricValues, metric: RecordMetric): number {
  if (metric === 'weight') return set.reps ?? 0;
  if (metric === 'reps') return set.weightKg ?? 0;
  return 0;
}

/** Подход, которым поставлен рекорд: лучший по выбранному показателю среди рабочих подходов. */
function findRecordSet<Set extends SetMetricValues>(sets: Set[], metric: RecordMetric): Set | null {
  let recordSet: Set | null = null;
  for (const set of sets) {
    const value = setValueForMetric(set, metric);
    if (value == null) continue;
    if (recordSet == null) {
      recordSet = set;
      continue;
    }
    const recordValue = setValueForMetric(recordSet, metric) ?? 0;
    const isBetter = value > recordValue;
    const isEqualButFuller =
      value === recordValue && tieBreakerValue(set, metric) > tieBreakerValue(recordSet, metric);
    if (isBetter || isEqualButFuller) recordSet = set;
  }
  return recordSet;
}

function formatRecordValue(value: number | null, metric: RecordMetric, formatters: ValueFormatters): string {
  if (value == null) return '—';
  switch (metric) {
    case 'weight':
      return formatters.weight(value);
    case 'duration':
      return formatters.duration(value);
    case 'distance':
      return formatters.distance(value);
    case 'reps':
      return String(Math.round(value));
  }
}

function withNonBreakingSpaces(text: string): string {
  return text.replace(/ /g, NON_BREAKING_SPACE);
}

interface NewRecordsBlockProps {
  saveResult: SaveResult;
  workoutDetail: WorkoutDetail | undefined;
  formatters: ValueFormatters;
}

/**
 * Карточка «Новые рекорды» на экране итогов в виде той же таблицы, что «Сегодня сделано»:
 *   Жим лёжа   85 кг × 6
 *              80 кг +5 кг
 * Прошлый рекорд и прибавка пишутся в той ячейке, где был рекорд: под весом или под повторами.
 * Ничего не рисует, если рекордов нет.
 */
export function NewRecordsBlock({ saveResult, workoutDetail, formatters }: NewRecordsBlockProps) {
  const colors = useColors();
  const { t: translate, i18n } = useTranslation();
  const weightUnit = useSettings((state) => state.weightUnit);
  const distanceUnit = useSettings((state) => state.distanceUnit);
  const penOptions = useMemo(
    () => ({ weightUnit, distanceUnit, language: i18n.language }),
    [weightUnit, distanceUnit, i18n.language],
  );

  const recordRows = useMemo(() => {
    if (!workoutDetail) return [];
    const rows: RecordRow[] = [];
    for (const workoutExercise of workoutDetail.exercises) {
      const hits = saveResult.prs
        .filter((record) => record.exerciseId === workoutExercise.exerciseId)
        .flatMap((record) => record.hits);
      if (hits.length === 0) continue;

      const fields = getSetFieldsForExerciseType(workoutExercise.exercise.type);
      const metric = pickRecordMetric(fields, hits);
      const workingSets = workoutExercise.sets.filter((set) => set.type !== 'warmup');
      const recordSet = findRecordSet(workingSets, metric);
      if (!recordSet) continue;

      const gain = recordGain(hits, metric);
      const formatGainValue = (value: number) =>
        metric === 'weight'
          ? formatPenWeight(value, workoutExercise.exercise.type, penOptions)
          : formatRecordValue(value, metric, formatters);
      let change: RecordChange | null = null;
      if (gain && gain.previous != null && gain.best > gain.previous) {
        change = {
          kind: 'gain',
          previousValue: withNonBreakingSpaces(formatGainValue(gain.previous)),
          gainText: withNonBreakingSpaces(`+${formatGainValue(gain.best - gain.previous)}`),
        };
      } else if (gain && gain.previous == null) {
        change = { kind: 'firstTime' };
      }

      const name = exerciseName(workoutExercise.exercise, i18n.language);
      if (fields.weight) {
        rows.push({
          id: workoutExercise.id,
          name,
          weight: {
            value:
              recordSet.weightKg != null
                ? formatPenWeight(recordSet.weightKg, workoutExercise.exercise.type, penOptions)
                : '—',
            change: metric === 'weight' ? change : null,
          },
          result: {
            value: formatPenSetValue(recordSet, workoutExercise.exercise.type, penOptions) || '—',
            change: metric === 'reps' ? change : null,
          },
        });
        continue;
      }
      rows.push({
        id: workoutExercise.id,
        name,
        weight: null,
        result: {
          value:
            formatPenSetValue(recordSet, workoutExercise.exercise.type, penOptions) ||
            formatRecordValue(setValueForMetric(recordSet, metric), metric, formatters),
          change,
        },
      });
    }
    return rows;
  }, [saveResult, workoutDetail, formatters, penOptions, i18n.language]);

  if (recordRows.length === 0) return null;

  const anyExerciseHasWeight = recordRows.some((row) => row.weight != null);
  // Колонка называется «Повт.», пока в ней есть хоть одно упражнение с весом; у одного кардио — «Результат».
  const resultTitle = anyExerciseHasWeight ? translate('workout.reps') : translate('workout.result');

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(160)} style={{ marginTop: spacing.xl }}>
      <SummaryBlockHeader icon={Trophy} title={translate('workout.newRecords')} />
      <Card raised style={{ backgroundColor: colors.white, borderColor: 'transparent' }}>
        <SummaryTableHeader
          exerciseTitle={translate('workout.exerciseColumn')}
          weightTitle={anyExerciseHasWeight ? translate('workout.weight') : null}
          valuesTitle={resultTitle}
        />

        {recordRows.map((row) => (
          <View key={row.id} style={[summaryTableStyles.exerciseRow, summaryStyles.divider]}>
            <Text variant="bodyMedium" color={colors.black} style={summaryTableStyles.nameColumn}>
              {row.name}
            </Text>
            <View style={summaryTableStyles.valuesColumn}>
              <View style={[summaryTableStyles.valueLine, styles.recordLine]}>
                {anyExerciseHasWeight ? (
                  <>
                    <View style={[summaryTableStyles.weightColumn, styles.weightCell]}>
                      {row.weight ? <RecordCellContent cell={row.weight} alignRight /> : null}
                    </View>
                    <Text
                      variant="bodyMedium"
                      color={SUMMARY_MUTED_TEXT_COLOR}
                      style={summaryTableStyles.timesSignColumn}
                    >
                      {row.weight ? penTimesSign(i18n.language) : ''}
                    </Text>
                  </>
                ) : null}
                <View style={summaryTableStyles.repsColumn}>
                  <RecordCellContent cell={row.result} />
                </View>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </Animated.View>
  );
}

/** Значение ячейки и под ним мелко прошлый рекорд с прибавкой или «впервые». */
function RecordCellContent({ cell, alignRight = false }: { cell: RecordCell; alignRight?: boolean }) {
  const colors = useColors();
  const { t: translate } = useTranslation();
  const textAlignStyle = alignRight ? styles.alignRight : null;

  return (
    <>
      <Text variant="bodyMedium" color={colors.black} tabular style={textAlignStyle}>
        {cell.value}
      </Text>
      {cell.change?.kind === 'gain' ? (
        <Text variant="caption" color={SUMMARY_MUTED_TEXT_COLOR} tabular style={textAlignStyle}>
          {cell.change.previousValue}{' '}
          <Text variant="caption" color={colors.success} tabular>
            {cell.change.gainText}
          </Text>
        </Text>
      ) : null}
      {cell.change?.kind === 'firstTime' ? (
        <Text variant="caption" color={colors.success} style={textAlignStyle}>
          {translate('workout.firstTime')}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // В ячейках по две строки текста, поэтому выравниваем по верху, а не по базовой линии.
  recordLine: { alignItems: 'flex-start' },
  weightCell: { alignItems: 'flex-end' },
  alignRight: { textAlign: 'right' },
});
