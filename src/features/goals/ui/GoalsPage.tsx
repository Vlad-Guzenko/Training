import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import {
  getActiveGoal,
  setActiveGoal,
  subscribeGoals,
  deleteGoal,
} from "../api/repo";
import type { Goal } from "../domain/types";
import NewGoalModal from "./NewGoalModal";
import SuggestedWorkoutModal from "./SuggestedWorkoutModal";
import { suggestWorkoutForGoal } from "../domain/suggest";
import type { PlanState, Exercise } from "../../../types";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import GoalCard from "./GoalCard";

export default function GoalsPage({
  state,
  setState,
}: {
  state: PlanState;
  setState: React.Dispatch<React.SetStateAction<PlanState>>;
}) {
  const { t } = useTranslation();

  const [openedNew, { open: openNew, close: closeNew }] = useDisclosure(false);
  const [openedSug, { open: openSug, close: closeSug }] = useDisclosure(false);

  const [items, setItems] = useState<Goal[]>([]);
  const [sugGoal, setSugGoal] = useState<Goal | null>(null);
  const [sugList, setSugList] = useState<Exercise[]>([]);
  const autoOpenedRef = useRef(false);

  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setAuthed(!!u));
    return () => off();
  }, []);

  useEffect(() => {
    if (!authed) {
      setItems([]);
      return;
    }
    const unsub = subscribeGoals((gs) => setItems(gs));
    return () => unsub && unsub();
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    if (autoOpenedRef.current) return;
    if (state.exercises.length > 0) return;

    (async () => {
      try {
        const g = await getActiveGoal();
        if (!g) return;
        autoOpenedRef.current = true;
        setSugGoal(g);
        setSugList(suggestWorkoutForGoal(g));
        openSug();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, state.exercises.length]);

  const openSuggestFor = (g: Goal) => {
    setSugGoal(g);
    setSugList(suggestWorkoutForGoal(g));
    openSug();
  };

  const applyAppend = () => {
    if (!sugList.length || !sugGoal) return;
    setState((prev) => ({
      ...prev,
      exercises: [...prev.exercises, ...sugList],
      activeGoalId: sugGoal.id,
      activeGoalName: sugGoal.name,
      lastActionAt: new Date().toISOString(),
    }));
    closeSug();
  };

  const applyReplace = () => {
    if (!sugList.length || !sugGoal) return;
    setState((prev) => ({
      ...prev,
      exercises: [...sugList],
      activeGoalId: sugGoal.id,
      activeGoalName: sugGoal.name,
      lastActionAt: new Date().toISOString(),
    }));
    closeSug();
  };

  const makeActiveAndSuggest = async (g: Goal) => {
    await setActiveGoal(g.id);
    openSuggestFor(g);
  };

  const handleDelete = (g: Goal) => {
    modals.openConfirmModal({
      title: t("goals.confirmTitle") as string,
      children: (
        <Text size="sm">
          {t("goals.confirmDelete", { name: g.name }) as string}
        </Text>
      ),
      labels: {
        confirm: t("common.delete") as string,
        cancel: t("common.cancel") as string,
      },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await deleteGoal(g.id);
        } catch (e) {
          console.warn("[goals] delete error", e);
        }
      },
    });
  };

  return (
    <Stack>
      {/* Заголовок: на десктопе кнопка справа; на мобиле — отдельной строкой fullWidth */}
      <Group justify="space-between" wrap="nowrap">
        <Title order={2}>{t("goals.title")}</Title>
        {authed && (
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openNew}
            visibleFrom="sm"
          >
            {t("goals.new")}
          </Button>
        )}
      </Group>
      {authed && (
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openNew}
          fullWidth
          hiddenFrom="sm"
        >
          {t("goals.new")}
        </Button>
      )}

      {!authed ? (
        <Card withBorder radius="lg" p="lg">
          <Text c="dimmed" size="sm">
            {t("auth.pleaseSignIn", {
              defaultValue: "Please sign in to manage goals.",
            })}
          </Text>
        </Card>
      ) : (
        <>
          {/* Адаптивная сетка: 1 колонка на телефоне, 2 — на планшете, 3 — на больших экранах */}
          <SimpleGrid
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing={{ base: "md", sm: "lg" }}
          >
            {items.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                isActive={g.status === "active"}
                onSuggest={openSuggestFor}
                onMakeActive={makeActiveAndSuggest}
                onDelete={handleDelete}
              />
            ))}
          </SimpleGrid>

          <NewGoalModal
            opened={openedNew}
            onClose={closeNew}
            onCreated={async (g) => {
              await setActiveGoal(g.id);
              closeNew();
              openSuggestFor(g);
            }}
          />

          <SuggestedWorkoutModal
            opened={openedSug}
            onClose={closeSug}
            goalName={sugGoal?.name || ""}
            suggested={sugList}
            applyAppend={applyAppend}
            applyReplace={applyReplace}
          />
        </>
      )}
    </Stack>
  );
}
