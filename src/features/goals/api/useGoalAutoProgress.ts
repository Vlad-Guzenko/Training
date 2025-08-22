// src/features/goals/api/useGoalAutoProgress.ts
import { useEffect, useState } from "react";
import type { PlanState } from "../../../types";
import { getActiveGoal, updateGoal } from "./repo";
import { auth } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

/** считает выполненные сессии только по этой цели */
function countDone(state: PlanState, goalId: string) {
  return (state.history || []).filter(
    (h) =>
      h.goalId === goalId &&
      typeof (h as any).volume === "number" &&
      (h as any).volume > 0
  ).length;
}

/** грубая ETA по фактическому темпу */
function etaByPace(
  startISO: string,
  planWeeks: number,
  done: number,
  planned: number
) {
  const start = new Date(startISO + "T00:00:00Z");
  const now = new Date();
  const days = Math.max(1, Math.round((+now - +start) / 86400000));
  const pacePerDay = done / days;
  const leftSessions = Math.max(0, planned - done);
  const daysLeft =
    pacePerDay > 0
      ? Math.ceil(leftSessions / pacePerDay)
      : Math.ceil((planned / Math.max(1, planWeeks)) * 7);
  const eta = new Date(now.getTime() + daysLeft * 86400000);
  return eta.toISOString().slice(0, 10);
}

/** Авто-синк прогресса цели — только когда пользователь авторизован */
export function useGoalAutoProgress(state: PlanState) {
  const [authed, setAuthed] = useState<boolean>(!!auth.currentUser);

  // ждём инициализацию/смену пользователя
  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setAuthed(!!u));
    return () => off();
  }, []);

  useEffect(() => {
    if (!authed) return; // ещё не залогинен — тихо выходим

    (async () => {
      try {
        const g = await getActiveGoal();
        if (!g) return;

        const planned = Math.max(1, g.planWeeks * g.freqPerWeek);
        const done = countDone(state, g.id);
        const progress = Math.max(0, Math.min(1, done / planned));
        const eta = etaByPace(g.startDate, g.planWeeks, done, planned);

        await updateGoal(g.id, { progress, eta });
      } catch {
        /* молча игнорируем фоновые ошибки */
      }
    })();
  }, [authed, state.history?.length]);
}
