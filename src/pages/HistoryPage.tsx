// src/pages/HistoryPage.tsx
import { useMemo, useState } from "react";
import {
  Card,
  CardSection,
  Text,
  SegmentedControl,
  Group,
  useMantineTheme,
  useMantineColorScheme,
  Title,
} from "@mantine/core";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  Brush,
} from "recharts";
import type { PlanState } from "../types";

// ---------- тип точки ----------
type DP = {
  name: string; // "#5"
  volume: number; // объём за сессию
  rpe: number; // RPE
  date: Date; // дата сессии
  _x: number; // числовая ось для LTTB
};

// ---------- LTTB downsampling ----------
function lttb(points: DP[], threshold: number): DP[] {
  if (threshold >= points.length || threshold <= 0) return points;
  const sampled: DP[] = [points[0]];
  const bucketSize = (points.length - 2) / (threshold - 2);
  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    const start = Math.floor((i + 1) * bucketSize) + 1;
    const end = Math.floor((i + 2) * bucketSize) + 1;
    const bucket = points.slice(start, end);

    const nextStart = Math.floor((i + 2) * bucketSize) + 1;
    const nextEnd = Math.floor((i + 3) * bucketSize) + 1;
    const nextBucket = points.slice(nextStart, nextEnd);

    const avgX =
      nextBucket.reduce((s, p) => s + (p?._x ?? 0), 0) /
      (nextBucket.length || 1);
    const avgY =
      nextBucket.reduce((s, p) => s + (p?.volume ?? 0), 0) /
      (nextBucket.length || 1);

    let maxArea = -1;
    let maxPoint: DP = bucket[0] ?? points[start] ?? points[a];
    let maxIdx = start;

    for (let j = 0; j < bucket.length; j++) {
      const p = bucket[j];
      const ax = points[a]._x;
      const ay = points[a].volume;
      const area =
        Math.abs((ax - avgX) * (p.volume - ay) - (ax - p._x) * (avgY - ay)) *
        0.5;
      if (area > maxArea) {
        maxArea = area;
        maxPoint = p;
        maxIdx = start + j;
      }
    }
    sampled.push(maxPoint);
    a = maxIdx;
  }

  sampled.push(points[points.length - 1]);
  return sampled;
}

// ---------- скользящая средняя ----------
function movingAvg(arr: number[], k: number): number[] {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - (k - 1)), i + 1);
    const s = slice.reduce((a, b) => a + b, 0);
    return Math.round(s / slice.length);
  });
}

// ---------- компонент ----------
export default function HistoryPage({ state }: { state: PlanState }) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [range, setRange] = useState<"30" | "90" | "180" | "365" | "all">("90");

  // исходные данные
  const dataFull: DP[] = useMemo(() => {
    const base = (state.history ?? []).map((h) => ({
      name: `#${h.sessionNumber}`,
      volume: h.volume,
      rpe: h.rpe,
      date: new Date(h.date),
    }));
    return base.map((d, idx) => ({ ...d, _x: +d.date || idx }));
  }, [state.history]);

  // диапазон
  const dataRanged: DP[] = useMemo(() => {
    if (range === "all") return dataFull;
    const days = parseInt(range, 10);
    const cutoff = Date.now() - days * 24 * 3600 * 1000;
    return dataFull.filter((d) => +d.date >= cutoff);
  }, [dataFull, range]);

  // downsampling
  const data: DP[] = useMemo(() => {
    const MAX_POINTS = 240;
    return dataRanged.length > MAX_POINTS
      ? lttb(dataRanged, MAX_POINTS)
      : dataRanged;
  }, [dataRanged]);

  if (data.length === 0) {
    return (
      <>
        <Title order={2} mb="sm">
          История
        </Title>
        <Card withBorder shadow="sm" radius="md" p="md">
          <Text c="dimmed">
            Пока нет данных. Заверши хотя бы одну сессию — график оживёт.
          </Text>
        </Card>
      </>
    );
  }

  // сглаживание и PR
  const vols = data.map((d) => d.volume);
  const maWindow = data.length < 40 ? 3 : data.length < 120 ? 5 : 9;
  const ma = movingAvg(vols, maWindow);
  let max = 0;
  const maxSoFar = vols.map((v) => (max = Math.max(max, v)));

  // палитра под тему
  const axisColor =
    colorScheme === "dark" ? theme.colors.gray[5] : theme.colors.gray[6];
  const gridColor =
    colorScheme === "dark" ? theme.colors.gray[4] : theme.colors.gray[3];
  const maColor =
    colorScheme === "dark" ? theme.colors.gray[4] : theme.colors.gray[6];
  const prColor = theme.colors.green[6];
  // яркая сплошная — зависит от темы

  const accentShades = theme.colors[theme.primaryColor];
  const volumeStroke =
    colorScheme === "dark" ? accentShades[4] : accentShades[6];
  const activeDotFill =
    colorScheme === "dark" ? accentShades[3] : accentShades[7];

  // Brush под тему
  const brushStroke =
    colorScheme === "dark" ? theme.colors.gray[4] : theme.colors.gray[7];
  const brushTraveller =
    colorScheme === "dark" ? theme.colors.gray[3] : theme.colors.gray[6];
  const brushFill =
    colorScheme === "dark" ? theme.colors.dark[6] : theme.colors.gray[0];

  return (
    <>
      <Title order={2} mb="sm">
        История
      </Title>
      <Card withBorder shadow="sm" radius="md" p="md">
        <Group justify="space-between" mb="xs">
          <Text fw={700}>Прогресс по объёму</Text>
          <SegmentedControl
            size="xs"
            value={range}
            onChange={(v) => setRange(v as any)}
            data={[
              { label: "30д", value: "30" },
              { label: "90д", value: "90" },
              { label: "6м", value: "180" },
              { label: "12м", value: "365" },
              { label: "Все", value: "all" },
            ]}
          />
        </Group>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              {/* из-за бага типов Recharts добавляем ...({} as any) */}
              <XAxis
                dataKey="name"
                tickMargin={6}
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 12 }}
                {...({} as any)}
              />
              <YAxis
                width={42}
                domain={["dataMin - 5", "dataMax + 10"]}
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: gridColor, strokeDasharray: "3 3" }}
                wrapperStyle={{ backdropFilter: "blur(2px)" }}
                formatter={(val: any, key: string) =>
                  key === "volume" ? [`${val}`, "Объём"] : [`${val}`, "RPE"]
                }
                labelFormatter={(_label, payload) => {
                  const p = Array.isArray(payload)
                    ? (payload[0]?.payload as DP | undefined)
                    : undefined;
                  const d =
                    p?.date instanceof Date
                      ? p.date
                      : p
                      ? new Date((p as any).date ?? p)
                      : null;
                  return d ? d.toLocaleString() : String(_label);
                }}
              />

              {/* сплошная — объём (яркая) + активная точка под акцент */}
              <Line
                type="monotone"
                dataKey="volume"
                stroke={volumeStroke}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: activeDotFill, stroke: "transparent" }}
              />

              {/* пунктир — MA (приглушённый) */}
              <Line
                type="monotone"
                data={data.map((d, i) => ({ ...d, ma: ma[i] }))}
                dataKey="ma"
                stroke={maColor}
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />

              {/* PR точки — зелёные */}
              {data.map((d, i) =>
                d.volume === maxSoFar[i] ? (
                  <ReferenceDot
                    key={`${d.name}-${i}`}
                    x={d.name}
                    y={d.volume}
                    r={4}
                    fill={prColor}
                    stroke={prColor}
                  />
                ) : null
              )}

              {/* скроллер под тему */}
              <Brush
                dataKey="name"
                height={16}
                travellerWidth={8}
                stroke={brushStroke}
                traveller
                travellerStroke={brushTraveller as any}
                fill={brushFill}
                {...({} as any)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* красивая инструкция */}
        <CardSection
          withBorder
          inheritPadding
          py="xs"
          mt="md"
          style={{
            backgroundColor:
              colorScheme === "dark"
                ? theme.colors.dark[7]
                : theme.colors.gray[0],
            borderRadius: theme.radius.md,
          }}
        >
          <Group align="flex-start" gap="sm" wrap="nowrap">
            <Text size="sm" c="dimmed">
              <b>Как читать график:</b>
              <br />
              <span style={{ color: volumeStroke }}>Сплошная линия</span> —
              объём за сессию. <span style={{ color: maColor }}>Пунктир</span> —
              скользящая средняя (MA{maWindow}) для сглаживания тренда.{" "}
              <span style={{ color: prColor }}>Зелёные точки</span> — личные
              рекорды (PR) на момент сессии.
              <br />
              Вверху выбери период (30/90 дней, 6/12 месяцев или всё). Ползунок
              внизу позволяет прокручивать и приближать нужный участок. Наведи
              на точку, чтобы увидеть дату, RPE и объём.
            </Text>
          </Group>
        </CardSection>
      </Card>
    </>
  );
}
