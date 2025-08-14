import { Card, Divider, Group, Stack, Text, Title, Badge } from "@mantine/core";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from "recharts";
import { PlanState } from "../types";

export default function HistoryPage({ state }: { state: PlanState }) {
  const chartData = state.history.map((h) => ({ name: `#${h.sessionNumber}`, volume: h.volume, rpe: h.rpe }));

  return (
    <>
      <Title order={2} mb="sm">
        История
      </Title>
      <Card withBorder shadow="sm" radius="md">
        {state.history.length === 0 ? (
          <Text size="sm" c="dimmed">
            Пока пусто. Заверши сессию «Сделал», чтобы появились записи.
          </Text>
        ) : (
          <Stack gap="xs">
            {state.history
              .slice()
              .reverse()
              .map((h) => (
                <Card key={h.date} withBorder padding="sm" radius="md">
                  <Group justify="space-between" align="center">
                    <Group>
                      <Badge variant="light">Сессия #{h.sessionNumber}</Badge>
                      <Text c="dimmed">{new Date(h.date).toLocaleString("ru-RU")}</Text>
                    </Group>
                    <Group>
                      <Text>
                        Объём: <b>{h.volume.toLocaleString("ru-RU")}</b>
                      </Text>
                      <Text>
                        RPE: <b>{h.rpe}</b>
                      </Text>
                    </Group>
                  </Group>
                </Card>
              ))}
            <Divider my="sm" />
            <Text fw={600}>Прогресс по объёму</Text>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip />
                  <Line type="monotone" dataKey="volume" dot activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Stack>
        )}
      </Card>
    </>
  );
}
