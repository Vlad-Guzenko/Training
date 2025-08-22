// src/features/goals/api/progress.ts
import { auth, db } from "../../../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import type { Goal } from "../domain/types";
import type { PlanState } from "../../../types";

function assertUser() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return u;
}

async function getMostRecentActiveGoal(): Promise<Goal | null> {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "goals");
  const q = query(
    col,
    where("status", "==", "active"),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) } as Goal;
}

function clamp(v: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

function estimateEtaDynamic(goal: Goal, completedSessions: number) {
  const planned = Math.max(1, goal.planWeeks * goal.freqPerWeek);
  const start = new Date(goal.startDate + "T00:00:00Z");
  const today = new Date();

  const msPerWeek = 7 * 24 * 3600 * 1000;
  const weeksPassed = Math.max(
    0.01,
    (today.getTime() - start.getTime()) / msPerWeek
  );
  const avgPerWeek = Math.max(0.01, completedSessions / weeksPassed);

  const remaining = Math.max(0, planned - completedSessions);
  if (remaining === 0) return iso(today);

  const weeksMore = remaining / avgPerWeek;
  return iso(new Date(today.getTime() + weeksMore * msPerWeek));
}

export function countCompletedSessionsForGoal(
  state: PlanState,
  goalId: string
) {
  return state.history.filter(
    (h) => h.goalId === goalId && (h as any).volume && (h as any).volume > 0
  ).length;
}

export async function syncMostRecentGoalProgress(state: PlanState) {
  const goal = await getMostRecentActiveGoal();
  if (!goal) return;

  const planned = Math.max(1, goal.planWeeks * goal.freqPerWeek);
  const done = countCompletedSessionsForGoal(state, goal.id);
  const progress = Math.max(0, Math.min(1, done / planned));
  const eta = estimateEtaDynamic(goal, done);

  const needUpdate =
    Math.abs((goal.progress ?? 0) - progress) > 0.01 ||
    (goal.eta || "") !== eta;

  if (!needUpdate) return;

  const u = assertUser();
  const ref = doc(db, "users", u.uid, "goals", goal.id);
  await setDoc(ref, { progress, eta, updatedAt: Date.now() }, { merge: true });
}
