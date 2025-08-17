import { auth, db } from "../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { PlanState, Exercise } from "../types";

function assertUser() {
  const u = auth.currentUser;
  if (!u) throw new Error("Не выполнен вход");
  return u;
}

// ---- Snapshot: быстрый старт UI ----
export async function savePlanSnapshot(state: PlanState) {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "plan");
  await setDoc(
    ref,
    { content: state, updatedAt: serverTimestamp(), version: 1 },
    { merge: true }
  );
}

export async function loadPlanSnapshot(): Promise<{
  state: PlanState | null;
  updatedAt?: Timestamp;
}> {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "plan");
  const snap = await getDoc(ref);
  if (!snap.exists()) return { state: null };
  const data = snap.data() as any;
  return {
    state: data.content as PlanState,
    updatedAt: (data.updatedAt as Timestamp) || undefined,
  };
}

// ---- Нормализованные коллекции ----
export async function ensureDefaultWorkout(): Promise<string> {
  const u = assertUser();
  const id = "default";
  const wRef = doc(db, "users", u.uid, "workouts", id);
  const w = await getDoc(wRef);
  if (!w.exists()) {
    await setDoc(
      wRef,
      {
        name: "Основной план",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
  return id;
}

export type CloudSession = {
  sessionNumber: number;
  rpe: number;
  volume: number;
  date: Date;
  notes?: string;
  exercises: Array<Pick<Exercise, "name" | "sets" | "reps" | "notes">>;
};

export async function addSession(workoutId: string, s: CloudSession) {
  const u = assertUser();
  const coll = collection(
    db,
    "users",
    u.uid,
    "workouts",
    workoutId,
    "sessions"
  );
  await addDoc(coll, {
    sessionNumber: s.sessionNumber,
    rpe: s.rpe,
    volume: s.volume,
    date: Timestamp.fromDate(s.date),
    notes: s.notes || null,
    exercises: s.exercises,
    createdAt: serverTimestamp(),
  });
  const wRef = doc(db, "users", u.uid, "workouts", workoutId);
  await setDoc(
    wRef,
    { updatedAt: serverTimestamp(), lastSession: s.sessionNumber },
    { merge: true }
  );
}

// ---- Prefs (оформление + язык) ----
export type UserPrefs = {
  primaryColor?: string; // например "indigo"
  colorScheme?: "light" | "dark";
  lang?: "ua" | "en" | "it" | "ru"; // <— добавили язык
  updatedAt?: Timestamp;
};

export async function loadUserPrefs(): Promise<UserPrefs | null> {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "prefs");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserPrefs;
}

export async function saveUserPrefs(p: {
  primaryColor?: string;
  colorScheme?: "light" | "dark";
  lang?: "ua" | "en" | "it" | "ru"; // <— добавили язык
}) {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "prefs");
  await setDoc(ref, { ...p, updatedAt: serverTimestamp() }, { merge: true });
}
