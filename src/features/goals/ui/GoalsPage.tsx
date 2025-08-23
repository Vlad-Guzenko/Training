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
    const unsub = subscribeGoals((gs) => {
      const rank = (g: Goal) => (g.status === "active" ? 0 : 1);
      const sorted = [...gs].sort((a, b) => {
        const byActive = rank(a) - rank(b);
        if (byActive !== 0) return byActive;
        return createdAtMs(b) - createdAtMs(a);
      });
      setItems(sorted);
    });
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
  }, [authed, state.exercises.length]);

  const createdAtMs = (g: Goal): number => {
    const v: any = (g as any).createdAt;
    if (!v) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "string") return Date.parse(v) || 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v?.toMillis === "function") return v.toMillis();
    return 0;
  };

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

  const handleDelete = async (g: Goal) => {
    try {
      await deleteGoal(g.id);
    } catch (e) {
      console.warn("[goals] delete error", e);
    }
  };

  return (
    <Stack>
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
            {t("auth.pleaseSignIn")}
          </Text>
        </Card>
      ) : (
        <>
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
