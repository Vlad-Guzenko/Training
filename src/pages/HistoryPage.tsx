// src/pages/HistoryPage.tsx
import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
  useMantineTheme,
  useComputedColorScheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { PlanState, HistoryPoint } from "../types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Brush,
} from "recharts";

type Filter = "all" | "goals" | "general";
type Range = "30d" | "90d" | "6m" | "all";

interface DP {
  label: string;
  volume: number;
  rpe?: number | null;
  _x: number;
  goalName?: string;
}

const DAY = 86400000;

function toDateSafe(iso: string | Date | undefined): Date {
  if (!iso) return new Date(0);
  if (iso instanceof Date) return iso;
  const d = new Date(iso);
  return isNaN(+d) ? new Date(0) : d;
}

function fmtDateShort(d: Date) {
  try {
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export default function HistoryPage({ state }: { state: PlanState }) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const colVol = theme.colors.indigo[5];
  const colRpe = theme.colors.orange[6];

  // фильтры
  const [filter, setFilter] = useState<Filter>("all");
  const [range, setRange] = useState<Range>("30d");

  // акцентные стили для переключателей (без проблемных data-checked)
  const accentedSegProps = {
    color: theme.primaryColor,
    radius: "md" as const,
    styles: {
      root: { background: "transparent" },
      indicator: { boxShadow: "none" },
      label: { fontWeight: 700 },
    },
  };

  // дата "с" для выбранного диапазона
  const dateFrom = useMemo<Date | null>(() => {
    const now = Date.now();
    switch (range) {
      case "30d":
        return new Date(now - 30 * DAY);
      case "90d":
        return new Date(now - 90 * DAY);
      case "6m": {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        return d;
      }
      default:
        return null; // all
    }
  }, [range]);

  // 1) фильтр по типу сессий
  const base = useMemo<HistoryPoint[]>(() => {
    const src = state.history ?? [];
    return src.filter((h) => {
      if (filter === "goals") return !!h.goalId;
      if (filter === "general") return !h.goalId;
      return true;
    });
  }, [state.history, filter]);

  // 2) фильтр по периоду
  const ranged = useMemo<HistoryPoint[]>(() => {
    if (!dateFrom) return base;
    return base.filter((h) => toDateSafe(h.date) >= dateFrom);
  }, [base, dateFrom]);

  // 3) данные для графика
  const dataFull = useMemo<DP[]>(() => {
    const sorted = [...ranged].sort(
      (a, b) => +toDateSafe(a.date) - +toDateSafe(b.date)
    );
    return sorted.map((h, idx) => {
      const d = toDateSafe(h.date);
      const vol = Number((h as any).volume ?? 0);
      const rpeVal = (h as any).rpe ?? null;
      return {
        label: `#${h.sessionNumber} • ${fmtDateShort(d)}`,
        volume: isFinite(vol) ? vol : 0,
        rpe: typeof rpeVal === "number" ? rpeVal : null,
        _x: +d || idx,
        goalName: h.goalName,
      };
    });
  }, [ranged]);

  // 4) статистика по текущему срезу
  const stats = useMemo(() => {
    let totalVol = 0,
      rpeSum = 0,
      rpeCnt = 0;
    ranged.forEach((h) => {
      totalVol += Number((h as any).volume ?? 0);
      if (typeof (h as any).rpe === "number") {
        rpeSum += Number((h as any).rpe);
        rpeCnt++;
      }
    });
    return {
      count: ranged.length,
      volume: totalVol,
      rpeAvg: rpeCnt ? Math.round((rpeSum / rpeCnt) * 10) / 10 : null,
    };
  }, [ranged]);

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={2}>
          {t("history.title", { defaultValue: "История" })}
        </Title>

        <Group gap="sm" wrap="wrap">
          <SegmentedControl
            {...accentedSegProps}
            value={range}
            onChange={(v) => setRange(v as Range)}
            data={[
              {
                label: t("history.range.30d", { defaultValue: "30д" }),
                value: "30d",
              },
              {
                label: t("history.range.90d", { defaultValue: "90д" }),
                value: "90d",
              },
              {
                label: t("history.range.6m", { defaultValue: "6м" }),
                value: "6m",
              },
              {
                label: t("history.range.all", { defaultValue: "Все" }),
                value: "all",
              },
            ]}
          />

          <SegmentedControl
            {...accentedSegProps}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={[
              {
                label: t("history.filter.all", { defaultValue: "Все" }),
                value: "all",
              },
              {
                label: t("history.filter.goals", { defaultValue: "Целевые" }),
                value: "goals",
              },
              {
                label: t("history.filter.general", { defaultValue: "Обычные" }),
                value: "general",
              },
            ]}
          />
        </Group>
      </Group>

      <Group gap="lg">
        <Text size="sm" c="dimmed">
          {t("history.filter." + filter, { defaultValue: filter })}
        </Text>
        <Text size="sm" c="dimmed">
          {t("history.sessions", { defaultValue: "Sessions" })}: {stats.count}
        </Text>
        <Text size="sm" c="dimmed">
          {t("history.volume", { defaultValue: "Volume" })}: {stats.volume}
        </Text>
        <Text size="sm" c="dimmed">
          {t("history.rpeAvg", {
            value: stats.rpeAvg ?? "—",
            defaultValue: "Avg RPE: {{value}}",
          })}
        </Text>
      </Group>

      <Card withBorder radius="lg" p="lg">
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <AreaChart
              data={dataFull}
              margin={{ top: 8, right: 12, left: 8, bottom: 32 }}
            >
              <defs>
                <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colVol} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={colVol} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="label" hide />
              <YAxis
                yAxisId="left"
                stroke={colVol}
                domain={[0, (max: number) => Math.ceil(max * 1.15)]}
              />
              <YAxis yAxisId="right" stroke={colRpe} orientation="right" />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 8 }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p: any = payload[0].payload;
                  return (
                    <Card withBorder radius="md" p="sm">
                      <Stack gap={2}>
                        <Text fw={600}>{label}</Text>
                        <Group gap={8}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: colVol,
                            }}
                          />
                          <Text size="sm">Volume: {p.volume}</Text>
                        </Group>
                        {typeof p.rpe === "number" && (
                          <Group gap={8}>
                            <span
                              style={{
                                display: "inline-block",
                                width: 10,
                                height: 10,
                                borderRadius: 999,
                                background: colRpe,
                              }}
                            />
                            <Text size="sm">RPE: {p.rpe}</Text>
                          </Group>
                        )}
                        {p.goalName && (
                          <Badge variant="light" mt={4}>
                            {t("history.badge.goal", {
                              defaultValue: "Цель: {{name}}",
                              name: p.goalName,
                            })}
                          </Badge>
                        )}
                      </Stack>
                    </Card>
                  );
                }}
              />

              <Area
                name="Volume"
                yAxisId="left"
                type="monotone"
                dataKey="volume"
                stroke={colVol}
                strokeOpacity={0.9}
                fill="url(#volFill)"
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                name="RPE"
                yAxisId="right"
                type="monotone"
                dataKey="rpe"
                stroke={colRpe}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />

              {range === "all" && dataFull.length > 30 && (
                <Brush
                  dataKey="label"
                  height={24}
                  travellerWidth={10}
                  stroke={colVol}
                  fill="transparent"
                  startIndex={Math.max(0, dataFull.length - 30)}
                  tickFormatter={(l) => String(l).split("•")[0]}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Stack>
  );
}
