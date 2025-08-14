import { Button, Card, Group, NumberInput, Text, Title } from "@mantine/core";
import { IconPlayerPlay, IconPlayerPause, IconRefresh } from "@tabler/icons-react";
import { PlanState } from "../types";
import { clamp, fmtTime, toInt } from "../lib/workout";

export default function TimerPage({ state, setState }: { state: PlanState; setState: React.Dispatch<React.SetStateAction<PlanState>> }) {
  return (
    <>
      <Title order={2} mb="sm">
        Таймер
      </Title>
      <Card withBorder shadow="sm" radius="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Text fw={600}>Таймер отдыха</Text>
          <Group>
            <Text size="sm" c="dimmed">
              Длительность (сек.)
            </Text>
            <NumberInput
              value={state.restSeconds}
              min={15}
              max={600}
              onChange={(v) => {
                const val = clamp(toInt(v, 60), 15, 600);
                setState((s) => ({ ...s, restSeconds: val, restLeft: val }));
              }}
              maw={100}
            />
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => setState((s) => ({ ...s, restLeft: s.restSeconds, restRunning: true }))}
            >
              Старт
            </Button>
            <Button
              variant="default"
              leftSection={state.restRunning ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
              onClick={() => setState((s) => ({ ...s, restRunning: !s.restRunning }))}
            >
              {state.restRunning ? "Пауза" : "Продолжить"}
            </Button>
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              onClick={() => setState((s) => ({ ...s, restLeft: s.restSeconds, restRunning: false }))}
            >
              Сброс
            </Button>
          </Group>
        </Group>
        <Title order={1} ta="center" mt="md" ff="mono">
          {fmtTime(state.restLeft)}
        </Title>
      </Card>
    </>
  );
}
