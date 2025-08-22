// src/features/goals/api/repo.ts
import { auth, db } from "../../../lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Goal, GoalWeek } from "../domain/types";

function assertUser() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return u;
}

export async function listGoals(): Promise<Goal[]> {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "goals");
  const qsnap = await getDocs(query(col, orderBy("createdAt", "desc")));
  return qsnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Goal[];
}

export function subscribeGoals(cb: (items: Goal[]) => void): () => void {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "goals");
  const q = query(col, orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as Goal[];
    cb(items);
  });
}

export async function getGoal(goalId: string): Promise<Goal | null> {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "goals", goalId);
  const snap = await getDoc(ref);
  return snap.exists()
    ? ({ id: snap.id, ...(snap.data() as any) } as Goal)
    : null;
}

/** Без orderBy — чтобы не требовать композитный индекс */
export async function getActiveGoal(): Promise<Goal | null> {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "goals");
  const qsnap = await getDocs(query(col, where("status", "==", "active")));
  if (qsnap.empty) return null;
  const items = qsnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  })) as Goal[];
  items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return items[0] ?? null;
}

export async function listWeeks(goalId: string): Promise<GoalWeek[]> {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "goals", goalId, "weeks");
  const qsnap = await getDocs(query(col, orderBy("weekIndex", "asc")));
  return qsnap.docs.map((d) => d.data() as GoalWeek);
}

export async function createGoal(
  data: Omit<
    Goal,
    "id" | "createdAt" | "updatedAt" | "progress" | "eta" | "status"
  > &
    Partial<Pick<Goal, "progress" | "eta" | "status">>
) {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "goals");
  const now = Date.now();
  const goal: Omit<Goal, "id"> = {
    name: data.name,
    domain: data.domain,
    metric: data.metric,
    targetValue: data.targetValue,
    startDate: data.startDate,
    planWeeks: data.planWeeks,
    freqPerWeek: data.freqPerWeek,
    intensity: data.intensity,
    status: data.status ?? "active",
    progress: Math.min(Math.max(data.progress ?? 0, 0), 1),
    eta: data.eta ?? estimateEta(data.startDate, data.planWeeks),
    createdAt: now,
    updatedAt: now,
  };
  const ref = await addDoc(col, goal as any);

  // weeks
  const weeksCol = collection(db, "users", u.uid, "goals", ref.id, "weeks");
  for (let i = 0; i < goal.planWeeks; i++) {
    const w: GoalWeek = {
      weekIndex: i,
      plannedSessions: data.freqPerWeek,
      adjusted: false,
    };
    await addDoc(weeksCol, w as any);
  }
  return { id: ref.id, ...goal } as Goal;
}

export async function updateGoal(goalId: string, patch: Partial<Goal>) {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "goals", goalId);
  await setDoc(ref, { ...patch, updatedAt: Date.now() }, { merge: true });
}

export async function setActiveGoal(goalId: string) {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "goals");
  const qsnap = await getDocs(query(col, where("status", "==", "active")));
  const batch = writeBatch(db);
  qsnap.forEach((d) => {
    if (d.id !== goalId)
      batch.set(
        doc(db, "users", u.uid, "goals", d.id),
        { status: "paused", updatedAt: Date.now() },
        { merge: true }
      );
  });
  batch.set(
    doc(db, "users", u.uid, "goals", goalId),
    { status: "active", updatedAt: Date.now() },
    { merge: true }
  );
  await batch.commit();
}

export async function deleteGoal(goalId: string) {
  const u = assertUser();
  const weeksCol = collection(db, "users", u.uid, "goals", goalId, "weeks");
  const weeksSnap = await getDocs(weeksCol);
  const batch = writeBatch(db);
  weeksSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "users", u.uid, "goals", goalId));
  await batch.commit();
}

export function estimateEta(startDateISO: string, planWeeks: number) {
  const start = new Date(startDateISO + "T00:00:00Z");
  const eta = new Date(start.getTime() + planWeeks * 7 * 24 * 3600 * 1000);
  return eta.toISOString().slice(0, 10);
}
