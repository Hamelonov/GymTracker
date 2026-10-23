import { Inter_500Medium } from '@expo-google-fonts/inter';
import { useFont } from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Area, Bar, CartesianChart, Line, Scatter } from 'victory-native';
import { Text, radius, spacing, useColors } from '@/ui';

export type ChartPoint = { x: number; y: number; label: string };

export function LineChart({ data, height = 220, formatY, kind = 'line' }: { data: ChartPoint[]; height?: number; formatY?: (v: number) => string; kind?: 'line' | 'bar' }) {
  const c = useColors();
  const font = useFont(Inter_500Medium, 11);
  if (data.length === 0) return null;
  const labels = new Map(data.map((d) => [d.x, d.label]));
  const single = data.length === 1;
  const chartData = single ? [{ x: data[0]!.x - 1, y: data[0]!.y, label: '' }, ...data, { x: data[0]!.x + 1, y: data[0]!.y, label: '' }] : data;
  const ys = data.map((d) => d.y);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const range = yMax - yMin;
  const pad = range === 0 ? Math.max(1, Math.abs(yMax) * 0.1) : range * 0.15;
  const yDomain: [number, number] = [kind === 'bar' ? 0 : Math.max(0, Math.floor(yMin - pad)), Math.ceil(yMax + pad)];
  const span = yDomain[1] - yDomain[0];
  const step = span <= 4 ? 1 : span <= 8 ? 2 : null;
  const tickValues = step ? Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => yDomain[0] + i * step) : undefined;
  return (
    <View style={[styles.wrap, { height, backgroundColor: c.surface }]}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['y']}
        padding={{ left: 4, right: 12, top: 16, bottom: 4 }}
        domain={{ y: yDomain }}
        domainPadding={{ left: kind === 'bar' ? 24 : 12, right: kind === 'bar' ? 24 : 12, top: 24, bottom: 8 }}
        xAxis={{
          font,
          labelColor: c.textFaint,
          lineColor: 'transparent',
          tickCount: Math.min(6, data.length),
          formatXLabel: (v) => labels.get(Math.round(Number(v))) ?? '',
        }}
        yAxis={[
          {
            font,
            labelColor: c.textFaint,
            lineColor: c.border,
            tickCount: 4,
            tickValues,
            formatYLabel: (v) => (formatY ? formatY(Number(v)) : String(Math.round(Number(v)))),
          },
        ]}
      >
        {({ points, chartBounds }) =>
          kind === 'bar' ? (
            <Bar points={points.y} chartBounds={chartBounds} color={c.accent} roundedCorners={{ topLeft: 6, topRight: 6 }} animate={{ type: 'timing', duration: 300 }} />
          ) : (
            <>
              <Area points={points.y} y0={chartBounds.bottom} color={c.accentSoft} opacity={0.9} curveType="monotoneX" animate={{ type: 'timing', duration: 300 }} />
              <Line points={points.y} color={c.text} strokeWidth={2.5} curveType="monotoneX" animate={{ type: 'timing', duration: 300 }} />
              {data.length <= 40 ? <Scatter points={points.y.filter((p) => labels.get(Math.round(Number(p.xValue))))} radius={4} color={c.accent} style="fill" /> : null}
            </>
          )
        }
      </CartesianChart>
    </View>
  );
}

export function ChartEmpty({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={[styles.empty, { backgroundColor: c.surface }]}>
      <Text color="faint">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.lg, padding: spacing.sm, overflow: 'hidden' },
  empty: { height: 160, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
