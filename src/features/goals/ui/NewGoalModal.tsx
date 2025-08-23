import { useState } from "react";
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Goal, GoalDomain, GoalMetric } from "../domain/types";
import { createGoal } from "../api/repo";
import { modalSafeProps } from "../../../lib/modalSafe";

export default function NewGoalModal({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: (g: Goal) => void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState<GoalDomain>("strength");
  const [metric, setMetric] = useState<GoalMetric>("weight_kg");

  const [target, setTarget] = useState<number | "">(100);
  const [weeks, setWeeks] = useState<number | "">(12);
  const [freq, setFreq] = useState<number | "">(3);

  const [intensity, setIntensity] = useState<"easy" | "base" | "hard">("base");
  const [saving, setSaving] = useState(false);

  const asNumOrEmpty = (v: string | number): number | "" =>
    typeof v === "number" ? v : v === "" ? "" : Number(v);

  async function onSave() {
    setSaving(true);
    try {
      const g = await createGoal({
        name: name || t("goals.defaultName"),
        domain,
        metric,
        targetValue: typeof target === "number" ? target : 0,
        startDate: new Date().toISOString().slice(0, 10),
        planWeeks: typeof weeks === "number" ? weeks : 8,
        freqPerWeek: typeof freq === "number" ? freq : 3,
        intensity,
        progress: 0,
      });
      onCreated(g);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      {...modalSafeProps}
      opened={opened}
      onClose={onClose}
      title={t("goals.new")}
    >
      <Stack>
        <TextInput
          label={t("goals.name")}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={t("goals.defaultName")!}
        />

        <Group grow>
          <Select
            label={t("goals.domainLabel")}
            data={[
              { value: "strength", label: t("goals.domain.strength")! },
              { value: "endurance", label: t("goals.domain.endurance")! },
              {
                value: "calisthenics",
                label: t("goals.domain.calisthenics")!,
              },
            ]}
            value={domain}
            onChange={(v) => setDomain(v as any)}
          />

          <Select
            label={t("goals.metricLabel")}
            data={[
              { value: "weight_kg", label: t("goals.metric.weight_kg")! },
              { value: "reps", label: t("goals.metric.reps")! },
              { value: "time_sec", label: t("goals.metric.time_sec")! },
            ]}
            value={metric}
            onChange={(v) => setMetric(v as any)}
          />
        </Group>

        <Group grow>
          <NumberInput
            label={t("goals.target")}
            value={target}
            onChange={(v) => setTarget(asNumOrEmpty(v))}
            min={1}
          />
          <NumberInput
            label={t("goals.weeks")}
            value={weeks}
            onChange={(v) => setWeeks(asNumOrEmpty(v))}
            min={1}
          />
          <NumberInput
            label={t("goals.freqPerWeek")}
            value={freq}
            onChange={(v) => setFreq(asNumOrEmpty(v))}
            min={1}
          />
        </Group>

        <Select
          label={t("goals.intensity")}
          data={[
            { value: "easy", label: t("goals.intensityLevel.easy")! },
            { value: "base", label: t("goals.intensityLevel.base")! },
            { value: "hard", label: t("goals.intensityLevel.hard")! },
          ]}
          value={intensity}
          onChange={(v) => setIntensity(v as any)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSave} loading={saving}>
            {t("common.save")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
