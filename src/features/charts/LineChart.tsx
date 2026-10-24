import { Inter_500Medium } from '@expo-google-fonts/inter';
import { useFont } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Area, Bar, CartesianChart, Line, Scatter } from 'victory-native';
import { Text, radius, spacing, useColors } from '@/ui';

export type ChartPoint = { x: number; y: number; label: string };

interface LineChartProps {
  data: ChartPoint[];
  height?: number;
  formatY?: (value: number) => string;
  kind?: 'line' | 'bar';
}

/** На малых диапазонах метка ставится на каждые 1 или 2 единицы; на больших диапазонах график выбирает метки сам. */
function getYAxisTickStep(domainSpan: number): number | null {
  if (domainSpan <= 4) return 1;
  if (domainSpan <= 8) return 2;
  return null;
}

export function LineChart({ data, height = 220, formatY, kind = 'line' }: LineChartProps) {
  const colors = useColors();
  const font = useFont(Inter_500Medium, 11);
  if (data.length === 0) return null;
  const labelsByX = new Map(data.map((point) => [point.x, point.label]));
  const firstPoint = data[0]!;
  // Одна точка не рисует линию, поэтому по бокам от неё добавляются соседние точки без подписей.
  const chartData =
    data.length === 1
      ? [
          { x: firstPoint.x - 1, y: firstPoint.y, label: '' },
          ...data,
          { x: firstPoint.x + 1, y: firstPoint.y, label: '' },
        ]
      : data;
  const yValues = data.map((point) => point.y);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin;
  const yPadding = yRange === 0 ? Math.max(1, Math.abs(yMax) * 0.1) : yRange * 0.15;
  const yDomain: [number, number] = [
    kind === 'bar' ? 0 : Math.max(0, Math.floor(yMin - yPadding)),
    Math.ceil(yMax + yPadding),
  ];
  const yDomainSpan = yDomain[1] - yDomain[0];
  const tickStep = getYAxisTickStep(yDomainSpan);
  const tickValues = tickStep
    ? Array.from(
        { length: Math.floor(yDomainSpan / tickStep) + 1 },
        (_, index) => yDomain[0] + index * tickStep,
      )
    : undefined;
  const horizontalDomainPadding = kind === 'bar' ? 24 : 12;

  return (
    <View style={[styles.wrapper, { height, backgroundColor: colors.surface }]}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['y']}
        padding={{ left: 4, right: 12, top: 16, bottom: 4 }}
        domain={{ y: yDomain }}
        domainPadding={{
          left: horizontalDomainPadding,
          right: horizontalDomainPadding,
          top: 24,
          bottom: 8,
        }}
        xAxis={{
          font,
          labelColor: colors.textFaint,
          lineColor: 'transparent',
          tickCount: Math.min(6, data.length),
          formatXLabel: (value) => labelsByX.get(Math.round(Number(value))) ?? '',
        }}
        yAxis={[
          {
            font,
            labelColor: colors.textFaint,
            lineColor: colors.border,
            tickCount: 4,
            tickValues,
            formatYLabel: (value) => (formatY ? formatY(Number(value)) : String(Math.round(Number(value)))),
          },
        ]}
      >
        {({ points, chartBounds }) =>
          kind === 'bar' ? (
            <Bar
              points={points.y}
              chartBounds={chartBounds}
              color={colors.accent}
              roundedCorners={{ topLeft: 6, topRight: 6 }}
              animate={{ type: 'timing', duration: 180 }}
            />
          ) : (
            <>
              <Area
                points={points.y}
                y0={chartBounds.bottom}
                color={colors.accentSoft}
                opacity={0.9}
                curveType="monotoneX"
                animate={{ type: 'timing', duration: 180 }}
              />
              <Line
                points={points.y}
                color={colors.text}
                strokeWidth={2.5}
                curveType="monotoneX"
                animate={{ type: 'timing', duration: 180 }}
              />
              {/* Точки только для настоящих (подписанных) значений и только пока их не слишком много. */}
              {data.length <= 40 ? (
                <Scatter
                  points={points.y.filter((point) => labelsByX.get(Math.round(Number(point.xValue))))}
                  radius={4}
                  color={colors.accent}
                  style="fill"
                />
              ) : null}
            </>
          )
        }
      </CartesianChart>
    </View>
  );
}

export function EmptyChart({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={[styles.empty, { backgroundColor: colors.surface }]}>
      <Text color="faint">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.lg, padding: spacing.sm, overflow: 'hidden' },
  empty: { height: 160, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
