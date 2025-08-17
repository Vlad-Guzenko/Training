import { useMemo } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
  ActionIcon,
  useMantineTheme,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconArrowDown,
  IconRefresh,
  IconCopy,
  IconTrash,
  IconGripVertical,
} from "@tabler/icons-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMediaQuery } from "@mantine/hooks";
import React from "react";

import { Exercise, PlanState } from "../types";
import {
  applyProgression,
  buildPlanText,
  safeCopyText,
  uid,
  volumeOf,
  clamp,
} from "../lib/workout";
import { markLocalUpdated } from "../lib/useCloudSync";
import { addSession, ensureDefaultWorkout } from "../lib/cloudNormalized";
import { t } from "i18next";
import { useTranslation } from "react-i18next";

/* ---------- компактный счётчик – / + ---------- */
function StatControl({
  label,
  value,
  dec,
  inc,
  min = 1,
  max = 999,
}: {
  label: string;
  value: number;
  dec: () => void;
  inc: () => void;
  min?: number;
  max?: number;
}) {
  const canDec = value > min;
  const canInc = value < max;

  return (
    <Stack gap={4} align="center" w={140} style={{ textAlign: "center" }}>
      <Text size="xs" c="dimmed" style={{ letterSpacing: 0.2 }}>
        {label}
      </Text>
      <Group
        gap="xs"
        wrap="nowrap"
        align="center"
        justify="center"
        style={{ width: "100%" }}
      >
        <ActionIcon
          size="sm"
          variant="outline"
          radius="sm"
          onClick={dec}
          disabled={!canDec}
        >
          −
        </ActionIcon>
        <Text
          fw={800}
          style={{
            minWidth: 40,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </Text>
        <ActionIcon
          size="sm"
          variant="outline"
          radius="sm"
          onClick={inc}
          disabled={!canInc}
        >
          +
        </ActionIcon>
      </Group>
    </Stack>
  );
}

/* ---------- карточка упражнения (единый PWA-стиль для всех экранов) ---------- */
function SortableExercise({
  ex,
  idx,
  mutate,
  remove,
}: {
  ex: Exercise;
  idx: number;
  mutate: (id: string, patch: Partial<Exercise>) => void;
  remove: (id: string) => void;
}) {
  const theme = useMantineTheme();
  const accent = theme.primaryColor;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex.id });
  const [notesOpen, setNotesOpen] = React.useState(false);
  const hasNotes = Boolean(ex.notes && ex.notes.trim());

  return (
    <Card
      ref={setNodeRef}
      withBorder
      radius="md"
      shadow={isDragging ? "md" : "xs"}
      p="sm"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
      }}
    >
      {/* верх: номер + название + ручка DnD справа */}
      <Group justify="space-between" align="center" wrap="nowrap" mb={8}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <Badge variant="light" size="sm" radius="sm" miw={22} ta="center">
            {idx + 1}
          </Badge>
          <Text
            fw={700}
            size="sm"
            truncate
            style={{
              flex: 1,
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {ex.name}
          </Text>
        </Group>

        <ActionIcon
          variant="subtle"
          className="dnd-handle"
          size="lg"
          radius="md"
          style={{
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          title={t("plan.dragHandle")}
          {...attributes}
          {...listeners}
        >
          <IconGripVertical size={22} stroke={1.8} />
        </ActionIcon>
      </Group>

      {/* средняя строка: два счётчика */}
      <Group
        gap="sm"
        wrap="nowrap"
        justify="space-between"
        mb={8}
        style={{ width: "100%" }}
      >
        <StatControl
          label={t("plan.repsShort")}
          value={ex.reps}
          dec={() => mutate(ex.id, { reps: clamp((ex.reps || 1) - 1, 1, 500) })}
          inc={() => mutate(ex.id, { reps: clamp((ex.reps || 1) + 1, 1, 500) })}
          max={500}
        />
        <StatControl
          label={t("plan.setsShort")}
          value={ex.sets}
          dec={() => mutate(ex.id, { sets: clamp((ex.sets || 1) - 1, 1, 20) })}
          inc={() => mutate(ex.id, { sets: clamp((ex.sets || 1) + 1, 1, 20) })}
          max={20}
        />
        <div style={{ flex: 1 }} />
      </Group>

      {/* нижняя строка: Заметки слева (с индикатором) + Корзина справа */}
      <Group justify="space-between" mb={notesOpen ? 8 : 0}>
        <Group gap="xs" align="center">
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => setNotesOpen((v) => !v)}
          >
            {notesOpen ? t("common.hideNotes") : t("common.notes")}
          </Button>

          {hasNotes && (
            <span
              className="note-indicator"
              style={{
                backgroundColor: theme.colors[theme.primaryColor][6],
              }}
            />
          )}
        </Group>

        <ActionIcon
          color="red"
          variant="subtle"
          title={t("common.delete")}
          onClick={() => remove(ex.id)}
        >
          <IconTrash size={18} />
        </ActionIcon>
      </Group>

      {notesOpen && (
        <Textarea
          size="sm"
          autosize
          minRows={1}
          maxRows={3}
          placeholder={t("plan.notesPlaceholder")}
          value={ex.notes || ""}
          onChange={(e) => mutate(ex.id, { notes: e.currentTarget.value })}
        />
      )}
    </Card>
  );
}

/* ---------------------------- Страница ---------------------------- */
export default function PlanPage({
  state,
  setState,
}: {
  state: PlanState;
  setState: React.Dispatch<React.SetStateAction<PlanState>>;
}) {
  const totalVolume = useMemo(
    () => volumeOf(state.exercises),
    [state.exercises]
  );

  const isSmall = useMediaQuery("(max-width: 48em)"); // ~768px
  const isDesktop = useMediaQuery("(min-width: 62em)"); // для модификаторов DnD
  const { t } = useTranslation();

  const bumpSession = (d: number) =>
    setState((s) => ({
      ...s,
      sessionNumber: Math.max(1, s.sessionNumber + d),
    }));

  const mutateExercise = (id: string, patch: Partial<Exercise>) =>
    setState((s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const addExercise = (it: Partial<Exercise> = {}) =>
    setState((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        { id: uid(), name: t("plan.newExercise"), sets: 3, reps: 10, ...it },
      ],
    }));

  const removeExercise = (id: string) =>
    setState((s) => ({
      ...s,
      exercises: s.exercises.filter((e) => e.id !== id),
    }));

  const moveExercise = (idx: number, dir: -1 | 1) =>
    setState((s) => {
      const arr = [...s.exercises];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return s;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return { ...s, exercises: arr };
    });

  function adaptProgressByRpe(rpe: number) {
    if (rpe <= 6) return state.progressPct + 3;
    if (rpe <= 8) return state.progressPct;
    if (rpe === 9) return Math.max(2, state.progressPct - 3);
    return 0;
  }

  const onDone = async () => {
    const sessionForHistory = {
      sessionNumber: state.sessionNumber,
      date: new Date().toISOString(),
      volume: state.exercises.reduce((sum, e) => sum + e.sets * e.reps, 0),
      rpe: state.rpeToday,
    };

    const nextPct = adaptProgressByRpe(state.rpeToday);

    setState((s) => ({
      ...s,
      history: [...s.history, sessionForHistory],
      sessionNumber: s.sessionNumber + 1,
      progressPct: nextPct,
      exercises: s.exercises.map((e) => ({
        ...e,
        reps:
          state.rpeToday === 10
            ? applyProgression(
                e.reps,
                Math.max(10, s.progressPct),
                s.gentle,
                false
              )
            : applyProgression(
                e.reps,
                nextPct || s.progressPct,
                s.gentle,
                true
              ),
      })),
    }));

    markLocalUpdated();

    try {
      const wid = await ensureDefaultWorkout();
      await addSession(wid, {
        sessionNumber: sessionForHistory.sessionNumber,
        rpe: sessionForHistory.rpe,
        volume: sessionForHistory.volume,
        date: new Date(sessionForHistory.date),
        exercises: state.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          notes: e.notes,
        })),
      });
    } catch (e) {
      console.warn("cloud addSession error", e);
    }
  };

  const onTooHard = () =>
    setState((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({
        ...e,
        reps: applyProgression(
          e.reps,
          Math.max(10, s.progressPct),
          s.gentle,
          false
        ),
      })),
    }));

  const onSkip = () =>
    setState((s) => ({
      ...s,
      sessionNumber: s.sessionNumber + 1,
      history: [
        ...s.history,
        {
          sessionNumber: s.sessionNumber,
          date: new Date().toISOString(),
          volume: totalVolume,
          rpe: 0,
        },
      ],
    }));

  const exportTxt = () => {
    const text = buildPlanText(state, totalVolume);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-plan-session-${state.sessionNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToday = async () => {
    const ok = await safeCopyText(
      buildPlanText(state, totalVolume),
      `workout-plan-session-${state.sessionNumber}.txt`
    );
    alert(ok ? t("plan.planCopied") : t("plan.clipboardFallback"));
  };

  // DnD: Pointer + Touch (для PWA). На мобиле ограничиваем ось Y, на ПК без ограничений.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    })
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setState((s) => {
      const oldIndex = s.exercises.findIndex((x) => x.id === active.id);
      const newIndex = s.exercises.findIndex((x) => x.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return s;
      return { ...s, exercises: arrayMove(s.exercises, oldIndex, newIndex) };
    });
  };

  return (
    <>
      <Title order={2} mb="sm">
        {t("plan.title")}
      </Title>

      <Card withBorder shadow="sm" radius="md">
        <Grid gutter="md" align="center">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Text size="sm" c="dimmed">
              {t("plan.currentSession")}
            </Text>
            <Group mt={6} gap="xs">
              <Button variant="default" onClick={() => bumpSession(-1)}>
                -
              </Button>
              <Badge size="lg" variant="light">
                #{state.sessionNumber}
              </Badge>
              <Button variant="default" onClick={() => bumpSession(+1)}>
                +
              </Button>
            </Group>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 5 }}>
            <Text size="sm" c="dimmed" ta="center">
              {t("plan.progressPerSession")}
            </Text>
            <Slider
              value={state.progressPct}
              min={1}
              max={25}
              onChange={(v) => setState((s) => ({ ...s, progressPct: v }))}
              mt={4}
            />
            <Text ta="center" fw={600} mt={6}>
              {state.progressPct}%
            </Text>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 3 }}>
            <Group justify={isSmall ? "flex-start" : "flex-end"} wrap="wrap">
              <Text size="sm" c="dimmed">
                {t("plan.gentleAdaptation")}
              </Text>
              <Switch
                checked={state.gentle}
                onChange={() => setState((s) => ({ ...s, gentle: !s.gentle }))}
              />
            </Group>
          </Grid.Col>
        </Grid>

        <Divider my="md" />

        <Group wrap="wrap">
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            onClick={onDone}
            color="indigo"
          >
            {t("plan.didIt")}
          </Button>
          <Button
            variant="default"
            leftSection={<IconArrowDown size={16} />}
            onClick={onTooHard}
          >
            {t("plan.tooHard")}
          </Button>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={onSkip}
          >
            {t("plan.skip")}
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconCopy size={16} />}
            onClick={copyToday}
          >
            {t("plan.copyPlan")}
          </Button>
          <Button variant="light" onClick={() => addExercise()}>
            {t("plan.addExercise")}
          </Button>
        </Group>

        <Divider my="md" />
        <Text fw={600} mb="xs">
          {t("plan.listTitle")}
        </Text>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={isDesktop ? [] : [restrictToVerticalAxis]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={state.exercises.map((e) => e.id)}
            strategy={rectSortingStrategy}
          >
            {/* 2 карточки в ряд на десктопе, 1 на мобиле. Внутри — PWA-верстка */}
            <Grid gutter="md" align="stretch">
              {state.exercises.length === 0 && (
                <Grid.Col span={12}>
                  <Text size="sm" c="dimmed">
                    {t("plan.addExerciseFrom")}
                  </Text>
                </Grid.Col>
              )}
              {state.exercises.map((ex, idx) => (
                <Grid.Col key={ex.id} span={{ base: 12, md: 6 }}>
                  <SortableExercise
                    ex={ex}
                    idx={idx}
                    mutate={mutateExercise}
                    remove={removeExercise}
                  />
                </Grid.Col>
              ))}
            </Grid>
          </SortableContext>
        </DndContext>
      </Card>
    </>
  );
}
