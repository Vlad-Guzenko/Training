// src/pages/ExercisesPage.tsx
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  Title,
  Modal,
  useMantineTheme,
  TextInput,
  NumberInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAdjustments, IconPlus } from "@tabler/icons-react";
import { Env, Muscle, PlanState, Exercise } from "../types";
import { uid } from "../lib/workout";
import { notifications } from "@mantine/notifications";

import { useForm } from "@mantine/form";
import { useCustomExercises } from "../hooks/useCustomExercises";
import { addCustomExercise } from "../lib/customExercises";
import { auth } from "../lib/firebase";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { deleteCustomExercise } from "../lib/customExercises"; // есть в нашем API

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

type LibItem = {
  env: Env;
  muscle: Muscle;
  name: string;
  sets: number;
  reps: number;
  notes?: string;
};

const LIB: LibItem[] = [
  // outdoor
  {
    env: "outdoor",
    muscle: "legs",
    name: "Бег трусцой (мин)",
    sets: 1,
    reps: 20,
    notes: "Лёгкий темп",
  },
  {
    env: "outdoor",
    muscle: "legs",
    name: "Приседания с собственным весом",
    sets: 4,
    reps: 15,
  },
  {
    env: "outdoor",
    muscle: "chest",
    name: "Отжимания от земли",
    sets: 4,
    reps: 12,
  },
  {
    env: "outdoor",
    muscle: "back",
    name: "Подтягивания на турнике",
    sets: 3,
    reps: 6,
  },
  {
    env: "outdoor",
    muscle: "triceps",
    name: "Отжимания на брусьях",
    sets: 3,
    reps: 8,
  },
  { env: "outdoor", muscle: "core", name: "Планка (сек)", sets: 3, reps: 45 },
  // home
  { env: "home", muscle: "legs", name: "Выпады на месте", sets: 3, reps: 12 },
  { env: "home", muscle: "legs", name: "Ягодичный мост", sets: 3, reps: 15 },
  {
    env: "home",
    muscle: "chest",
    name: "Отжимания у дивана (наклонные)",
    sets: 4,
    reps: 10,
  },
  {
    env: "home",
    muscle: "back",
    name: "Тяга гантели в наклоне (1 рука)",
    sets: 3,
    reps: 10,
  },
  {
    env: "home",
    muscle: "biceps",
    name: "Сгибания рук с гантелями",
    sets: 3,
    reps: 12,
  },
  { env: "home", muscle: "core", name: "Скручивания", sets: 3, reps: 20 },
  // gym
  {
    env: "gym",
    muscle: "legs",
    name: "Приседания со штангой",
    sets: 5,
    reps: 5,
  },
  { env: "gym", muscle: "back", name: "Становая тяга", sets: 5, reps: 3 },
  { env: "gym", muscle: "chest", name: "Жим штанги лёжа", sets: 5, reps: 5 },
  {
    env: "gym",
    muscle: "shoulders",
    name: "Жим штанги стоя",
    sets: 5,
    reps: 5,
  },
  {
    env: "gym",
    muscle: "biceps",
    name: "Подъём штанги на бицепс",
    sets: 4,
    reps: 8,
  },
  {
    env: "gym",
    muscle: "triceps",
    name: "Французский жим лёжа",
    sets: 4,
    reps: 8,
  },
];

export default function ExercisesPage({
  state,
  setState,
}: {
  state: PlanState;
  setState: React.Dispatch<React.SetStateAction<PlanState>>;
}) {
  const theme = useMantineTheme();
  const primary = theme.primaryColor;

  // текущие фильтры списка
  const [env, setEnv] = useState<Env>("outdoor");
  const [muscle, setMuscle] = useState<Muscle>("full");

  const {
    items: myCustoms,
    isCloud,
    setItems: setLocalCustoms,
  } = useCustomExercises();

  // 2. Состояние: открыта ли модалка
  const [opened, setOpened] = useState(false);

  // 3. Форма для добавления упражнения
  const form = useForm({
    initialValues: {
      name: "", // название упражнения
      env: "outdoor" as Env, // где выполняем
      muscle: "legs" as Exclude<Muscle, "full">, // группа мышц (без "все тело")
      sets: 3, // подходы
      reps: 10, // повторы
      notes: "", // заметки
    },
    validate: {
      name: (v) => (v.trim().length < 2 ? "Минимум 2 символа" : null),
      sets: (v) => (v < 1 ? "Не меньше 1" : null),
      reps: (v) => (v < 1 ? "Не меньше 1" : null),
    },
  });

  // объединённая библиотека: базовая + мои
  const allLib = useMemo(() => [...LIB, ...myCustoms], [myCustoms]);

  // фильтрация для отображения
  const filtered = useMemo(
    () =>
      allLib.filter(
        (x) => x.env === env && (muscle === "full" ? true : x.muscle === muscle)
      ),
    [allLib, env, muscle]
  );

  const keyOf = (x: { env: Env; muscle: Muscle; name: string }) =>
    `${x.env}|${x.muscle}|${x.name}`;
  const customIndex = useMemo(() => {
    // myCustoms приходит из useCustomExercises()
    return new Map(myCustoms.map((c: any) => [keyOf(c), c])); // c.id будет у облачных
  }, [myCustoms]);

  // модалка подбора фильтров
  const [pickOpen, pick] = useDisclosure(false);
  const [pickEnv, setPickEnv] = useState<Env>(env);
  const [pickMuscle, setPickMuscle] = useState<Muscle>(muscle);

  const applyPick = () => {
    setEnv(pickEnv);
    setMuscle(pickMuscle);
    pick.close();
    notifications.show({
      title: "Подбор применён",
      message:
        pickMuscle === "full"
          ? `Показаны упражнения: ${ENV_OPTS.find(
              (e) => e.value === pickEnv
            )?.label.toLowerCase()} • все группы`
          : `Показаны упражнения: ${ENV_OPTS.find(
              (e) => e.value === pickEnv
            )?.label.toLowerCase()} • ${MUSCLE_OPTS.find(
              (m) => m.value === pickMuscle
            )?.label.toLowerCase()}`,
      color: primary as any,
      autoClose: 2000,
      position: "top-right",
    });
  };

  // добавление в план
  const addExercise = (it: Partial<Exercise>) =>
    setState((s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        { id: uid(), name: "Новое упражнение", sets: 3, reps: 10, ...it },
      ],
    }));

  // при клике по «Выбрать» показываем тост с CTA «Добавить в план»
  const selectExercise = (it: LibItem) => {
    const id = notifications.show({
      title: "Упражнение выбрано",
      message: (
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm">
            {it.name} — {it.sets}×{it.reps}
          </Text>
          <Button
            size="xs"
            onClick={() => {
              addExercise({
                name: it.name,
                sets: it.sets,
                reps: it.reps,
                env: it.env,
                muscle: it.muscle,
                notes: it.notes,
              });
              notifications.update({
                id,
                title: "Добавлено в план",
                message: `${it.name} добавлено`,
                color: "teal",
                autoClose: 1500,
              });
            }}
          >
            Добавить в план
          </Button>
        </Group>
      ),
      withCloseButton: true,
      autoClose: 6000,
      color: primary as any,
      position: "top-right",
    });
  };

  async function createMyExercise(values: typeof form.values) {
    try {
      if (auth.currentUser) {
        // Залогинен → сохраняем в Firestore
        await addCustomExercise({
          name: values.name,
          env: values.env,
          muscle: values.muscle,
          sets: values.sets,
          reps: values.reps,
          notes: values.notes,
        } as any);
      } else {
        // Гость → временно в локалку (через хук)
        setLocalCustoms((prev: any) => [...prev, values]);
      }

      setOpened(false);
      form.reset();

      // Тост с CTA «Добавить в план»
      notifications.show({
        title: "Добавлено в «Мои упражнения»",
        message: (
          <Group gap="xs" wrap="wrap">
            <Text>«{values.name}» сохранено. Добавить в план?</Text>
            <Button
              size="xs"
              variant="light"
              onClick={() => {
                addExercise({
                  name: values.name,
                  sets: values.sets,
                  reps: values.reps,
                  env: values.env,
                  muscle: values.muscle,
                  notes: values.notes,
                });
              }}
            >
              Добавить в план
            </Button>
          </Group>
        ),
        color: "teal",
        autoClose: 2500,
        withCloseButton: true,
        position: "top-right",
      });
    } catch (e: any) {
      notifications.show({
        title: "Ошибка",
        message: e?.message || "Не удалось сохранить упражнение",
        color: "red",
        position: "top-right",
      });
    }
  }

  async function handleDeleteCustom(item: LibItem) {
    const entry = customIndex.get(keyOf(item));
    if (!entry) return; // не «своё» — ничего не делаем

    try {
      if (entry.id) {
        // в облаке
        await deleteCustomExercise(entry.id);
      } else {
        // локально (гость)
        setLocalCustoms((prev: any[]) =>
          prev.filter(
            (p) =>
              !(
                p.name === item.name &&
                p.env === item.env &&
                p.muscle === item.muscle
              )
          )
        );
      }
      notifications.show({
        title: "Удалено",
        message: `«${item.name}» убрано из моих упражнений`,
        color: "orange",
        position: "top-right",
        autoClose: 1500,
      });
    } catch (e: any) {
      notifications.show({
        title: "Ошибка",
        message: e?.message || "Не удалось удалить",
        color: "red",
        position: "top-right",
      });
    }
  }

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
          <Button
            leftSection={<IconAdjustments size={16} />}
            variant="light"
            onClick={pick.open}
            w={{ base: "100%", sm: "auto" }}
            h={36}
            mt={{ base: 4, sm: 24 }}
          >
            Подобрать
          </Button>
          <Button
            size="sm"
            leftSection={<IconPlus size={16} />}
            variant="filled"
            onClick={() => {
              // инициализируем форму текущими фильтрами
              form.setValues({
                name: "",
                env,
                muscle:
                  muscle === "full"
                    ? "legs"
                    : (muscle as Exclude<Muscle, "full">),
                sets: 3,
                reps: 10,
                notes: "",
              });
              setOpened(true);
            }}
            w={{ base: "100%", sm: "auto" }}
            h={36}
            mt={{ base: 4, sm: 24 }}
          >
            Добавить своё
          </Button>
        </Group>

        <Divider my="sm" />

        {filtered.map((it) => (
          <Card
            key={`${it.env}-${it.muscle}-${it.name}`}
            withBorder
            radius="md"
            padding="sm"
          >
            <Group wrap="wrap" align="center">
              <Badge variant="light">
                {ENV_OPTS.find((e) => e.value === it.env)?.label}
              </Badge>
              <Badge variant="light" color="teal">
                {MUSCLE_OPTS.find((m) => m.value === it.muscle)?.label}
              </Badge>

              <Text fw={500} flex={1}>
                {it.name}
              </Text>

              <Text c="dimmed">
                {it.sets}×{it.reps}
              </Text>

              {/* ← корзина только если это пользовательское упражнение */}
              {customIndex.has(keyOf(it)) && (
                <Tooltip label="Удалить из моих" withArrow>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleDeleteCustom(it)}
                    aria-label="Удалить из моих"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Tooltip>
              )}

              <Button
                ml="auto"
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  addExercise({
                    name: it.name,
                    sets: it.sets,
                    reps: it.reps,
                    env: it.env,
                    muscle: it.muscle,
                    notes: it.notes,
                  });
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
      </Card>

      {/* Модалка подбора */}
      <Modal
        opened={pickOpen}
        onClose={pick.close}
        title="Подобрать упражнения"
        centered
      >
        <Stack>
          <Select
            label="Где тренируемся"
            data={ENV_OPTS}
            value={pickEnv}
            onChange={(v) => v && setPickEnv(v as Env)}
          />
          <Select
            label="Мышечная группа"
            data={MUSCLE_OPTS}
            value={pickMuscle}
            onChange={(v) => v && setPickMuscle(v as Muscle)}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={pick.close}>
              Отмена
            </Button>
            <Button onClick={applyPick}>Показать</Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Своё упражнение"
        centered
      >
        <form
          onSubmit={form.onSubmit((v) => createMyExercise(v))}
          style={{ display: "grid", gap: 12 }}
        >
          <Group wrap="wrap" align="end">
            <Select
              label="Где тренируемся"
              data={ENV_OPTS}
              value={form.values.env}
              onChange={(v) => v && form.setFieldValue("env", v as Env)}
              size="sm"
              w={{ base: "100%", sm: 200 }}
            />
            <Select
              label="Мышечная группа"
              data={MUSCLE_OPTS.filter((m) => m.value !== "full")}
              value={form.values.muscle}
              onChange={(v) =>
                v && form.setFieldValue("muscle", v as Exclude<Muscle, "full">)
              }
              size="sm"
              w={{ base: "100%", sm: 220 }}
            />
          </Group>

          <TextInput
            label="Название"
            placeholder="Например: Жим гантелей сидя"
            {...form.getInputProps("name")}
            size="sm"
          />

          <Group grow>
            <NumberInput
              label="Подходы"
              min={1}
              {...form.getInputProps("sets")}
              size="sm"
            />
            <NumberInput
              label="Повторы"
              min={1}
              {...form.getInputProps("reps")}
              size="sm"
            />
          </Group>

          <TextInput
            label="Заметки"
            placeholder="Опционально"
            {...form.getInputProps("notes")}
            size="sm"
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setOpened(false)}>
              Отмена
            </Button>
            <Button type="submit">Сохранить</Button>
          </Group>
        </form>
      </Modal>
    </>
  );
}
