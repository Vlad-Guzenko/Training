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
  TextInput,
  Title,
  NumberInput,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconArrowDown,
  IconRefresh,
  IconCopy,
  IconDownload,
  IconArrowUp,
  IconTrash,
} from "@tabler/icons-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMediaQuery } from "@mantine/hooks";
import { ActionIcon } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";

import { Exercise, PlanState } from "../types";
import {
  applyProgression,
  buildPlanText,
  safeCopyText,
  uid,
  volumeOf,
  clamp,
  toInt,
} from "../lib/workout";
import { markLocalUpdated } from "../lib/useCloudSync";
import { addSession, ensureDefaultWorkout } from "../lib/cloudNormalized";

function SortableExercise({
  ex,
  idx,
  mutate,
  move,
  remove,
}: {
  ex: Exercise;
  idx: number;
  mutate: (id: string, patch: Partial<Exercise>) => void;
  move: (idx: number, dir: -1 | 1) => void;
  remove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ex.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} withBorder padding="sm" radius="md">
      <Group align="flex-start" wrap="wrap">
        <Badge variant="light" size="lg" radius="sm" miw={28} ta="center">
          {idx + 1}
        </Badge>

        <TextInput
          flex={1}
          w={{ base: "100%", sm: "auto" }}
          label="Название"
          value={ex.name}
          onChange={(e) => mutate(ex.id, { name: e.currentTarget.value })}
        />

        <NumberInput
          label="Подходы"
          value={ex.sets}
          min={1}
          max={20}
          step={1}
          clampBehavior="strict"
          onChange={(v) => mutate(ex.id, { sets: clamp(toInt(v, 1), 1, 20) })}
          maw={120}
          w={{ base: "48%", sm: 120 }}
        />

        <NumberInput
          label="Повт."
          value={ex.reps}
          min={1}
          max={500}
          step={1}
          clampBehavior="strict"
          onChange={(v) => mutate(ex.id, { reps: clamp(toInt(v, 1), 1, 500) })}
          maw={120}
          w={{ base: "48%", sm: 120 }}
        />

        <Textarea
          label="Заметки"
          flex={1}
          w={{ base: "100%", sm: "auto" }}
          autosize
          minRows={1}
          value={ex.notes || ""}
          onChange={(e) => mutate(ex.id, { notes: e.currentTarget.value })}
        />

        <Group gap="xs" ml="auto" w={{ base: "100%", sm: "auto" }}>
          <ActionIcon
            variant="subtle"
            title="Перетащить"
            {...attributes}
            {...listeners}
            w={{ base: 32, sm: "auto" }}
          >
            <IconGripVertical size={18} />
          </ActionIcon>
          <Button variant="subtle" onClick={() => move(idx, -1)}>
            <IconArrowUp size={18} />
          </Button>
          <Button variant="subtle" onClick={() => move(idx, 1)}>
            <IconArrowDown size={18} />
          </Button>
          <Button variant="subtle" color="red" onClick={() => remove(ex.id)}>
            <IconTrash size={18} />
          </Button>
        </Group>
      </Group>
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
        { id: uid(), name: "Новое упражнение", sets: 3, reps: 10, ...it },
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
    alert(ok ? "План скопирован" : "Буфер недоступен — скачан .txt");
  };

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
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
        План
      </Title>

      <Card withBorder shadow="sm" radius="md">
        <Grid gutter="md" align="center">
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Text size="sm" c="dimmed">
              Текущая сессия
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
              Прогрессия, % за сессию
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
                Нежная адаптация
              </Text>
              <Switch
                checked={state.gentle}
                onChange={(e) =>
                  setState((s) => ({ ...s, gentle: e.currentTarget.checked }))
                }
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
            Сделал
          </Button>
          <Button
            variant="default"
            leftSection={<IconArrowDown size={16} />}
            onClick={onTooHard}
          >
            Слишком тяжело
          </Button>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={onSkip}
          >
            Пропустить
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconCopy size={16} />}
            onClick={copyToday}
          >
            Скопировать
          </Button>
          {/* <Button
            variant="subtle"
            leftSection={<IconDownload size={16} />}
            onClick={exportTxt}
          >
            Скачать .txt
          </Button> */}
          <Button variant="light" onClick={() => addExercise()}>
            + Упражнение
          </Button>
        </Group>

        <Divider my="md" />
        <Text fw={600} mb="xs">
          Текущие упражнения (перетащи, чтобы изменить порядок)
        </Text>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={state.exercises.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack gap="sm">
              {state.exercises.length === 0 && (
                <Text size="sm" c="dimmed">
                  Добавь упражнения на вкладке «Упражнения» слева.
                </Text>
              )}
              {state.exercises.map((ex, idx) => (
                <SortableExercise
                  key={ex.id}
                  ex={ex}
                  idx={idx}
                  mutate={mutateExercise}
                  move={moveExercise}
                  remove={removeExercise}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      </Card>
    </>
  );
}
