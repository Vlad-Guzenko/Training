import { Badge, Button, Card, Divider, Group, Select, Stack, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Env, Muscle, PlanState, Exercise } from "../types";
import { uid } from "../lib/workout";
import { useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";

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

type LibItem = { env: Env; muscle: Muscle; name: string; sets: number; reps: number; notes?: string };

const LIB: LibItem[] = [
  // outdoor
  { env: "outdoor", muscle: "legs", name: "Бег трусцой (мин)", sets: 1, reps: 20, notes: "Лёгкий темп" },
  { env: "outdoor", muscle: "legs", name: "Приседания с собственным весом", sets: 4, reps: 15 },
  { env: "outdoor", muscle: "chest", name: "Отжимания от земли", sets: 4, reps: 12 },
  { env: "outdoor", muscle: "back", name: "Подтягивания на турнике", sets: 3, reps: 6 },
  { env: "outdoor", muscle: "triceps", name: "Отжимания на брусьях", sets: 3, reps: 8 },
  { env: "outdoor", muscle: "core", name: "Планка (сек)", sets: 3, reps: 45 },
  // home
  { env: "home", muscle: "legs", name: "Выпады на месте", sets: 3, reps: 12 },
  { env: "home", muscle: "legs", name: "Ягодичный мост", sets: 3, reps: 15 },
  { env: "home", muscle: "chest", name: "Отжимания у дивана (наклонные)", sets: 4, reps: 10 },
  { env: "home", muscle: "back", name: "Тяга гантели в наклоне (1 рука)", sets: 3, reps: 10 },
  { env: "home", muscle: "biceps", name: "Сгибания рук с гантелями", sets: 3, reps: 12 },
  { env: "home", muscle: "core", name: "Скручивания", sets: 3, reps: 20 },
  // gym
  { env: "gym", muscle: "legs", name: "Приседания со штангой", sets: 5, reps: 5 },
  { env: "gym", muscle: "back", name: "Становая тяга", sets: 5, reps: 3 },
  { env: "gym", muscle: "chest", name: "Жим штанги лёжа", sets: 5, reps: 5 },
  { env: "gym", muscle: "shoulders", name: "Жим штанги стоя", sets: 5, reps: 5 },
  { env: "gym", muscle: "biceps", name: "Подъём штанги на бицепс", sets: 4, reps: 8 },
  { env: "gym", muscle: "triceps", name: "Французский жим лёжа", sets: 4, reps: 8 },
];

export default function ExercisesPage({ state, setState }: { state: PlanState; setState: React.Dispatch<React.SetStateAction<PlanState>> }) {
  const [env, setEnv] = useState<Env>("outdoor");
  const [muscle, setMuscle] = useState<Muscle>("full");

  const filtered = useMemo(() => LIB.filter((x) => x.env === env && (muscle === "full" ? true : x.muscle === muscle)), [env, muscle]);

  const addExercise = (it: Partial<Exercise> = {}) =>
    setState((s) => ({ ...s, exercises: [...s.exercises, { id: uid(), name: "Новое упражнение", sets: 3, reps: 10, ...it }] }));

  return (
    <>
      <Title order={2} mb="sm">
        Упражнения
      </Title>
      <Card withBorder shadow="sm" radius="md">
        <Group wrap="wrap" mb="sm" gap="sm">
          <Select
            label="Где тренируемся"
            data={ENV_OPTS}
            value={env}
            onChange={(v) => v && setEnv(v as Env)}
            searchable
            w={{ base: "100%", sm: 220 }}
          />
          <Select
            label="Мышечная группа"
            data={MUSCLE_OPTS}
            value={muscle}
            onChange={(v) => v && setMuscle(v as Muscle)}
            searchable
            w={{ base: "100%", sm: 240 }}
          />
          <Button leftSection={<IconPlus size={16} />} variant="light" onClick={() => addExercise({})} w={{ base: "100%", sm: "auto" }}>
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
                <Text fw={500} flex={1}>
                  {it.name}
                </Text>
                <Text c="dimmed">
                  {it.sets}×{it.reps}
                </Text>
                <Button
                  ml="auto"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    addExercise({ name: it.name, sets: it.sets, reps: it.reps, env: it.env, muscle: it.muscle, notes: it.notes });
                    notifications.show({
                      title: "Упражнение добавлено",
                      message: `${it.name} (${it.sets}×${it.reps}) добавлено в план`,
                      color: "teal",
                      position: "top-right",
                      autoClose: 2000,
                    });
                  }}
                  w={{ base: "100%", sm: "auto" }}
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
