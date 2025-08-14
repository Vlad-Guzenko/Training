import React, { JSX, useEffect, useMemo, useState } from "react";
import {
  MantineProvider,
  AppShell,
  Group,
  Burger,
  Title,
  Button,
  SegmentedControl,
  NavLink,
  ScrollArea,
  Container,
  Card,
  Grid,
  Text,
  Badge,
  Divider,
  Stack,
  TextInput,
  NumberInput,
  Textarea,
  Switch,
  Slider,
} from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import {
  IconListDetails,
  IconRun,
  IconHistory,
  IconClockHour4,
  IconSettings,
  IconPlayerPlay,
  IconPlayerPause,
  IconRefresh,
  IconArrowDown,
  IconArrowUp,
  IconTrash,
  IconCopy,
  IconDownload,
  IconPlus,
  IconWeight,
  IconHome,
} from "@tabler/icons-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip } from "recharts";
import { BrowserRouter, Routes, Route, NavLink as RouterLink, useLocation } from "react-router-dom";
// Drag & Drop
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MultiSelect } from "@mantine/core";
import { Select } from "@mantine/core";

/**
 * Workout Planner — Mantine v7 + Router (TSX)
 * — Полный layout на AppShell с левым сайдбаром (активный пункт подсвечивается по URL).
 * — React Router для реальных страниц: /, /exercises, /history, /timer, /settings.
 * — Сохранён весь функционал (прогрессия, библиотека упражнений, история, таймер, DnD в «Плане»).
 */

// ---- Types ----
export type Env = "outdoor" | "home" | "gym";
export type Muscle = "legs" | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "core" | "full";
export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  notes?: string;
  env?: Env;
  muscle?: Muscle;
}
export interface HistoryPoint {
  sessionNumber: number;
  date: string;
  volume: number;
  rpe: number;
}
export interface PlanState {
  sessionNumber: number;
  progressPct: number;
  gentle: boolean;
  exercises: Exercise[];
  lastActionAt?: string;
  history: HistoryPoint[];
  rpeToday: number;
  restSeconds: number;
  restLeft: number;
  restRunning: boolean;
}

// ---- Helpers ----
const LS_KEY = "progressive-workout-planner-router-v1";
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const volumeOf = (exs: Exercise[]) => exs.reduce((s, e) => s + e.sets * e.reps, 0);
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const toInt = (v: string | number | null | undefined, def = 0) =>
  typeof v === "number" ? Math.trunc(v) : typeof v === "string" && v.trim() !== "" ? Math.trunc(parseFloat(v)) : def;

function loadState(): PlanState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PlanState) : null;
  } catch {
    return null;
  }
}
function saveState(s: PlanState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function applyProgression(base: number, pct: number, gentle: boolean, up: boolean) {
  const factor = up ? 1 + pct / 100 : 1 - pct / 100;
  const raw = base * factor;
  if (gentle) {
    if (base <= 10) return Math.max(1, Math.round(raw));
    if (base <= 20) return Math.max(1, Math.round(raw / 2) * 2);
    return Math.max(1, Math.round(raw / 5) * 5);
  }
  return Math.max(1, Math.round(raw));
}
function buildPlanText(s: PlanState, volume: number) {
  const lines = s.exercises.map((e, i) => `${i + 1}. ${e.name}: ${e.sets}×${e.reps}`).join("\n");
  return `Тренировка #${s.sessionNumber}\n\n${lines}\n\nОбщий объём: ${volume} повт.`;
}
async function safeCopyText(text: string, filename: string) {
  try {
    if ((navigator as any)?.clipboard?.writeText) {
      await (navigator as any).clipboard.writeText(text);
      return true;
    }
    throw new Error("Clipboard API not available");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return true;
      throw new Error("exec failed");
    } catch {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return false;
    }
  }
}

// ---- Exercise Library ----
interface LibItem {
  env: Env;
  muscle: Muscle;
  name: string;
  sets: number;
  reps: number;
  notes?: string;
}
const LIB: LibItem[] = [
  // OUTDOOR
  { env: "outdoor", muscle: "legs", name: "Бег трусцой (мин)", sets: 1, reps: 20, notes: "Лёгкий темп" },
  { env: "outdoor", muscle: "legs", name: "Приседания с собственным весом", sets: 4, reps: 15 },
  { env: "outdoor", muscle: "chest", name: "Отжимания от земли", sets: 4, reps: 12 },
  { env: "outdoor", muscle: "back", name: "Подтягивания на турнике", sets: 3, reps: 6 },
  { env: "outdoor", muscle: "triceps", name: "Отжимания на брусьях", sets: 3, reps: 8 },
  { env: "outdoor", muscle: "core", name: "Планка (сек)", sets: 3, reps: 45 },
  { env: "outdoor", muscle: "shoulders", name: 'Отжимания "пик" (угол)', sets: 3, reps: 8 },
  // HOME
  { env: "home", muscle: "legs", name: "Выпады на месте", sets: 3, reps: 12 },
  { env: "home", muscle: "legs", name: "Ягодичный мост", sets: 3, reps: 15 },
  { env: "home", muscle: "chest", name: "Отжимания у дивана (наклонные)", sets: 4, reps: 10 },
  { env: "home", muscle: "back", name: "Тяга гантели в наклоне (1 рука)", sets: 3, reps: 10 },
  { env: "home", muscle: "biceps", name: "Сгибания рук с гантелями", sets: 3, reps: 12 },
  { env: "home", muscle: "triceps", name: "Разгибания рук над головой (гантели)", sets: 3, reps: 12 },
  { env: "home", muscle: "core", name: "Скручивания", sets: 3, reps: 20 },
  { env: "home", muscle: "core", name: "Русские повороты", sets: 3, reps: 20 },
  { env: "home", muscle: "shoulders", name: "Жим гантелей сидя", sets: 3, reps: 10 },
  // GYM
  { env: "gym", muscle: "legs", name: "Приседания со штангой", sets: 5, reps: 5 },
  { env: "gym", muscle: "legs", name: "Жим ногами", sets: 4, reps: 10 },
  { env: "gym", muscle: "back", name: "Становая тяга", sets: 5, reps: 3 },
  { env: "gym", muscle: "back", name: "Тяга верхнего блока", sets: 4, reps: 10 },
  { env: "gym", muscle: "chest", name: "Жим штанги лёжа", sets: 5, reps: 5 },
  { env: "gym", muscle: "chest", name: "Сведение в тренажёре", sets: 3, reps: 12 },
  { env: "gym", muscle: "shoulders", name: "Жим штанги стоя", sets: 5, reps: 5 },
  { env: "gym", muscle: "biceps", name: "Подъём штанги на бицепс", sets: 4, reps: 8 },
  { env: "gym", muscle: "triceps", name: "Французский жим лёжа", sets: 4, reps: 8 },
  { env: "gym", muscle: "core", name: "Подъёмы коленей в висе", sets: 3, reps: 12 },
  { env: "gym", muscle: "full", name: "Гребной тренажёр (мин)", sets: 1, reps: 15 },
];

const ENV_OPTS: { value: Env; label: string }[] = [
  { value: "outdoor", label: "Улица" },
  { value: "home", label: "Дом" },
  { value: "gym", label: "Зал" },
];
const MUSCLE_OPTS: { value: Muscle; label: string }[] = [
  { value: "legs", label: "Ноги" },
  { value: "chest", label: "Грудь" },
  { value: "back", label: "Спина" },
  { value: "shoulders", label: "Плечи" },
  { value: "biceps", label: "Бицепс" },
  { value: "triceps", label: "Трицепс" },
  { value: "core", label: "Кор" },
  { value: "full", label: "Все тело" },
];

// ---- Sortable exercise card (used on Plan page) ----
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <Card ref={setNodeRef} style={style} withBorder padding="sm" radius="md">
      <Group align="flex-start" wrap="wrap">
        <Badge variant="light" size="lg" radius="sm" miw={28} ta="center">
          {idx + 1}
        </Badge>
        <TextInput flex={1} label="Название" value={ex.name} onChange={(e) => mutate(ex.id, { name: e.currentTarget.value })} />
        <NumberInput
          label="Подходы"
          value={ex.sets}
          min={1}
          max={20}
          step={1}
          clampBehavior="strict"
          onChange={(v) => mutate(ex.id, { sets: clamp(toInt(v, 1), 1, 20) })}
          maw={120}
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
        />
        <Textarea
          label="Заметки"
          flex={1}
          autosize
          minRows={1}
          value={ex.notes || ""}
          onChange={(e) => mutate(ex.id, { notes: e.currentTarget.value })}
        />
        <Group gap="xs" ml="auto">
          <Button variant="subtle" {...attributes} {...listeners} title="Перетащить">
            ≡
          </Button>
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

// ---- Root App with Router & Shared State ----
export default function App(): JSX.Element {
  return (
    <MantineProvider>
      <BrowserRouter>
        <ShellWithState />
      </BrowserRouter>
    </MantineProvider>
  );
}

function ShellWithState(): JSX.Element {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [primary, setPrimary] = useState<string>("violet");
  const [opened, setOpened] = useState(false);

  // Shared plan state across pages
  const saved = loadState();
  const [state, setState] = useState<PlanState>(
    () =>
      saved || {
        sessionNumber: 1,
        progressPct: 5,
        gentle: true,
        exercises: [],
        history: [],
        rpeToday: 7,
        restSeconds: 90,
        restLeft: 90,
        restRunning: false,
      }
  );

  useEffect(() => saveState(state), [state]);
  useEffect(() => {
    if (!state.restRunning) return;
    const id = setInterval(() => setState((s) => ({ ...s, restLeft: Math.max(0, s.restLeft - 1), restRunning: s.restLeft - 1 > 0 })), 1000);
    return () => clearInterval(id);
  }, [state.restRunning]);

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 240, breakpoint: "sm", collapsed: { mobile: !opened } }} padding="md">
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={() => setOpened((o) => !o)} hiddenFrom="sm" size="sm" />
            <Title order={3}>Конструктор прогрессирующих тренировок</Title>
          </Group>
          <Group>
            <SegmentedControl
              value={primary}
              onChange={setPrimary}
              data={[
                { label: "Indigo", value: "indigo" },
                { label: "Teal", value: "teal" },
                { label: "Violet", value: "violet" },
                { label: "Amber", value: "yellow" },
                { label: "Rose", value: "pink" },
              ]}
              visibleFrom="sm"
            />
            <Button variant="default" onClick={() => setColorScheme(colorScheme === "dark" ? "light" : "dark")}>
              {colorScheme === "dark" ? "Светлая" : "Тёмная"}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <Sidebar onNavigate={() => setOpened(false)} />

      {/* Main content routed */}
      <AppShell.Main>
        <Container size="lg">
          <Routes>
            <Route path="/" element={<PlanPage state={state} setState={setState} />} />
            <Route path="/exercises" element={<ExercisesPage state={state} setState={setState} />} />
            <Route path="/history" element={<HistoryPage state={state} />} />
            <Route path="/timer" element={<TimerPage state={state} setState={setState} />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  return (
    <AppShell.Navbar p="sm">
      <ScrollArea type="auto" style={{ height: "100%" }}>
        <Stack gap="xs">
          <NavLink
            component={RouterLink}
            to="/"
            label="План"
            active={location.pathname === "/"}
            leftSection={<IconHome size={18} />}
            onClick={onNavigate}
          />
          <NavLink
            component={RouterLink}
            to="/exercises"
            label="Упражнения"
            active={location.pathname.startsWith("/exercises")}
            leftSection={<IconWeight size={18} />}
            onClick={onNavigate}
          />
          <NavLink
            component={RouterLink}
            to="/history"
            label="История"
            active={location.pathname.startsWith("/history")}
            leftSection={<IconHistory size={18} />}
            onClick={onNavigate}
          />
          <NavLink
            component={RouterLink}
            to="/timer"
            label="Таймер"
            active={location.pathname.startsWith("/timer")}
            leftSection={<IconClockHour4 size={18} />}
            onClick={onNavigate}
          />
          <NavLink
            component={RouterLink}
            to="/settings"
            label="Настройки"
            active={location.pathname.startsWith("/settings")}
            leftSection={<IconSettings size={18} />}
            onClick={onNavigate}
          />
        </Stack>
      </ScrollArea>
    </AppShell.Navbar>
  );
}

// ---- Pages ----
function PlanPage({ state, setState }: { state: PlanState; setState: React.Dispatch<React.SetStateAction<PlanState>> }) {
  const totalVolume = useMemo(() => volumeOf(state.exercises), [state.exercises]);
  const bumpSession = (d: number) => setState((s) => ({ ...s, sessionNumber: Math.max(1, s.sessionNumber + d) }));
  const mutateExercise = (id: string, patch: Partial<Exercise>) =>
    setState((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const addExercise = (it: Partial<Exercise> = {}) =>
    setState((s) => ({ ...s, exercises: [...s.exercises, { id: uid(), name: "Новое упражнение", sets: 3, reps: 10, ...it }] }));
  const removeExercise = (id: string) => setState((s) => ({ ...s, exercises: s.exercises.filter((e) => e.id !== id) }));
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
  const onDone = () => {
    const history = [
      ...state.history,
      { sessionNumber: state.sessionNumber, date: new Date().toISOString(), volume: totalVolume, rpe: state.rpeToday },
    ];
    const nextPct = adaptProgressByRpe(state.rpeToday);
    setState((s) => ({
      ...s,
      history,
      sessionNumber: s.sessionNumber + 1,
      progressPct: nextPct,
      exercises: s.exercises.map((e) => ({
        ...e,
        reps:
          state.rpeToday === 10
            ? applyProgression(e.reps, Math.max(10, s.progressPct), s.gentle, false)
            : applyProgression(e.reps, nextPct || s.progressPct, s.gentle, true),
      })),
    }));
  };
  const onTooHard = () =>
    setState((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({ ...e, reps: applyProgression(e.reps, Math.max(10, s.progressPct), s.gentle, false) })),
    }));
  const onSkip = () =>
    setState((s) => ({
      ...s,
      sessionNumber: s.sessionNumber + 1,
      history: [...s.history, { sessionNumber: s.sessionNumber, date: new Date().toISOString(), volume: totalVolume, rpe: 0 }],
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
    const ok = await safeCopyText(buildPlanText(state, totalVolume), `workout-plan-session-${state.sessionNumber}.txt`);
    alert(ok ? "План скопирован" : "Буфер недоступен — скачан .txt");
  };

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setState((s) => {
      const oldIndex = s.exercises.findIndex((e) => e.id === active.id);
      const newIndex = s.exercises.findIndex((e) => e.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return s;
      const arr = arrayMove(s.exercises, oldIndex, newIndex);
      return { ...s, exercises: arr };
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
            <Slider value={state.progressPct} min={1} max={25} onChange={(v) => setState((s) => ({ ...s, progressPct: v }))} mt={4} />
            <Text ta="center" fw={600} mt={6}>
              {state.progressPct}%
            </Text>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 3 }}>
            <Group justify="flex-end">
              <Text size="sm" c="dimmed">
                Нежная адаптация
              </Text>
              <Switch checked={state.gentle} onChange={(e) => setState((s) => ({ ...s, gentle: e.currentTarget.checked }))} />
            </Group>
          </Grid.Col>
        </Grid>
        <Divider my="md" />
        <Group wrap="wrap">
          <Button leftSection={<IconPlayerPlay size={16} />} onClick={onDone} color="indigo">
            Сделал
          </Button>
          <Button variant="default" leftSection={<IconArrowDown size={16} />} onClick={onTooHard}>
            Слишком тяжело
          </Button>
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={onSkip}>
            Пропустить
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconCopy size={16} />}
            onClick={async () => {
              await copyToday();
            }}
          >
            Скопировать
          </Button>
          <Button variant="subtle" leftSection={<IconDownload size={16} />} onClick={exportTxt}>
            Скачать .txt
          </Button>
        </Group>
        <Divider my="md" />
        <Text fw={600} mb="xs">
          Текущие упражнения (перетащи, чтобы изменить порядок)
        </Text>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={state.exercises.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <Stack gap="sm">
              {state.exercises.length === 0 && (
                <Text size="sm" c="dimmed">
                  Добавь упражнения на вкладке «Упражнения» слева.
                </Text>
              )}
              {state.exercises.map((ex, idx) => (
                <SortableExercise key={ex.id} ex={ex} idx={idx} mutate={mutateExercise} move={moveExercise} remove={removeExercise} />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      </Card>
    </>
  );
}

function ExercisesPage({ state, setState }: { state: PlanState; setState: React.Dispatch<React.SetStateAction<PlanState>> }) {
  const [env, setEnv] = useState<Env>("outdoor");
  const [muscle, setMuscle] = useState<Muscle>("full");
  const filtered = LIB.filter((x) => x.env === env && (muscle === "full" ? true : x.muscle === muscle));
  const addExercise = (it: Partial<Exercise> = {}) =>
    setState((s) => ({ ...s, exercises: [...s.exercises, { id: uid(), name: "Новое упражнение", sets: 3, reps: 10, ...it }] }));

  return (
    <>
      <Title order={2} mb="sm">
        Упражнения
      </Title>
      <Card withBorder shadow="sm" radius="md">
        <Group wrap="wrap" mb="sm">
          <Select
            label="Где тренируемся"
            data={ENV_OPTS}
            value={env} // env: Env
            onChange={(v) => v && setEnv(v as Env)}
            placeholder="Выберите место"
            searchable
            maw={220}
          />

          <Select
            label="Мышечная группа"
            data={MUSCLE_OPTS}
            value={muscle} // muscle: Muscle
            onChange={(v) => v && setMuscle(v as Muscle)}
            placeholder="Выберите группу"
            searchable
            maw={240}
          />

          <Button leftSection={<IconPlus size={16} />} variant="light" onClick={() => addExercise({})}>
            Пустая строка
          </Button>
        </Group>

        <Divider my="sm" />
        <Stack gap="xs">
          {filtered.map((it) => (
            <Card key={`${it.env}-${it.muscle}-${it.name}`} withBorder radius="md" padding="sm">
              <Group wrap="wrap" align="center">
                <Badge variant="light">{ENV_OPTS.find((e) => e.value === it.env)?.label}</Badge>
                <Badge variant="light" color="teal">
                  {MUSCLE_OPTS.find((m) => m.value === it.muscle)?.label}
                </Badge>
                <Text fw={500}>{it.name}</Text>
                <Text c="dimmed">
                  {it.sets}×{it.reps}
                </Text>
                {it.notes && <Text c="dimmed">— {it.notes}</Text>}
                <Button
                  style={{ marginLeft: "auto" }}
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addExercise({ name: it.name, sets: it.sets, reps: it.reps, env: it.env, muscle: it.muscle, notes: it.notes })}
                >
                  Добавить
                </Button>
              </Group>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Text size="sm" c="dimmed">
              Нет упражнений по выбранным фильтрам
            </Text>
          )}
        </Stack>
      </Card>
    </>
  );
}

function HistoryPage({ state }: { state: PlanState }) {
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

function TimerPage({ state, setState }: { state: PlanState; setState: React.Dispatch<React.SetStateAction<PlanState>> }) {
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

function SettingsPage() {
  return (
    <>
      <Title order={2} mb="sm">
        Настройки
      </Title>
      <Card withBorder shadow="sm" radius="md">
        <Text size="sm" c="dimmed">
          Темы и дополнительные параметры можно расширить: сохранение выбора в LocalStorage, экспорт CSV/PDF и недельные планы A/B/C — добавлю по
          команде.
        </Text>
      </Card>
    </>
  );
}
