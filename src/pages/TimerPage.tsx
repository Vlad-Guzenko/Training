import { Button, Card, Group, NumberInput, Text, Title } from "@mantine/core";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
} from "@tabler/icons-react";
import { PlanState } from "../types";
import { clamp, fmtTime, toInt } from "../lib/workout";
import { useTranslation } from "react-i18next";

export default function TimerPage({
  state,
  setState,
}: {
  state: PlanState;
  setState: React.Dispatch<React.SetStateAction<PlanState>>;
}) {
  const { t } = useTranslation();

  return (
    <>
      <Title order={2} mb="sm">
        {t("timer.title")}
      </Title>
      <Card withBorder radius="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <Text fw={600}>{t("timer.restTimer")}</Text>
          <Group>
            <Text size="sm" c="dimmed">
              {t("timer.dur")}
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
              onClick={() =>
                setState((s) => ({
                  ...s,
                  restLeft: s.restSeconds,
                  restRunning: true,
                }))
              }
            >
              {t("timer.start")}
            </Button>
            <Button
              variant="default"
              leftSection={
                state.restRunning ? (
                  <IconPlayerPause size={16} />
                ) : (
                  <IconPlayerPlay size={16} />
                )
              }
              onClick={() =>
                setState((s) => ({ ...s, restRunning: !s.restRunning }))
              }
            >
              {state.restRunning ? t("timer.pause") : t("timer.resume")}
            </Button>
            <Button
              variant="subtle"
              leftSection={<IconRefresh size={16} />}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  restLeft: s.restSeconds,
                  restRunning: false,
                }))
              }
            >
              {t("timer.reset")}
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
