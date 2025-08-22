// src/lib/cloudNormalized.ts
import { auth, db } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import type { Exercise, PlanState } from "../types";

/** Текущий пользователь или ошибка */
function assertUser() {
  const u = auth.currentUser;
  if (!u) throw new Error("Not signed in");
  return u;
}

/** Создаёт/возвращает дефолтный workoutId */
export async function ensureDefaultWorkout(): Promise<string> {
  const u = assertUser();
  const col = collection(db, "users", u.uid, "workouts");
  const qs = await getDocs(query(col, where("type", "==", "default")));
  if (!qs.empty) return qs.docs[0].id;

  const ref = await addDoc(col, {
    name: "Default",
    type: "default",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** мягко убирает undefined-ы из объекта/массива (Firestore их не любит) */
function stripUndefined<T>(v: T): T {
  if (Array.isArray(v)) return v.map(stripUndefined) as any;
  if (v && typeof v === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(v as any)) {
      if (val === undefined) continue;
      out[k] = stripUndefined(val as any);
    }
    return out;
  }
  return v;
}

/** Сохранить снапшот локального плана */
export async function savePlanSnapshot(state: PlanState) {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "plan");

  // НИЧЕГО не перекраиваем по типам PlanState (оставляем notes?: string | undefined).
  // stripUndefined удалит undefined-поля перед записью.
  await setDoc(
    ref,
    {
      state: stripUndefined(state as any), // ← ключ 'state' (совместимо с useCloudSync)
      updatedAt: serverTimestamp(),
      version: 1,
    },
    { merge: true }
  );
}

/** Загрузить снапшот плана (+ updatedAt) */
export async function loadPlanSnapshot(): Promise<{
  state: PlanState | null;
  updatedAt?: Timestamp;
}> {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "plan");
  const snap = await getDoc(ref);
  if (!snap.exists()) return { state: null, updatedAt: undefined };

  const data = snap.data() as any;
  // поддержим старое имя поля 'content' на всякий случай
  const state: PlanState | null = data?.state ?? data?.content ?? null;
  const updatedAt: Timestamp | undefined = data?.updatedAt;
  return { state, updatedAt };
}

/* ---------------- Сессии (история) ---------------- */

// Чтобы можно было писать null в notes, не связываем тип напрямую с Exercise.
export type CloudSessionExercise = {
  name: string;
  sets: number;
  reps: number;
  notes?: string | null;
};

export type CloudSession = {
  sessionNumber: number;
  rpe: number | null;
  volume: number;
  date: Date;
  notes?: string | null;
  exercises: CloudSessionExercise[];
  goalId?: string | null;
  goalName?: string | null;
};

export async function addSession(workoutId: string, s: CloudSession) {
  const u = assertUser();
  const sessions = collection(
    db,
    "users",
    u.uid,
    "workouts",
    workoutId,
    "sessions"
  );

  await addDoc(sessions, {
    sessionNumber: s.sessionNumber ?? 0,
    rpe: s.rpe ?? null,
    volume: s.volume ?? 0,
    date: Timestamp.fromDate(s.date ?? new Date()),
    notes: s.notes ?? null,
    exercises: (s.exercises || []).map((e) => ({
      name: e.name ?? "",
      sets: e.sets ?? 0,
      reps: e.reps ?? 0,
      notes: e.notes ?? null,
    })),
    goalId: s.goalId ?? null,
    goalName: s.goalName ?? null,
    createdAt: serverTimestamp(),
  });

  const wRef = doc(db, "users", u.uid, "workouts", workoutId);
  await setDoc(
    wRef,
    { updatedAt: serverTimestamp(), lastSession: s.sessionNumber ?? 0 },
    { merge: true }
  );
}

export type CloudPrefs = {
  colorScheme?: "light" | "dark";
  primaryColor?: string;
  lang?: "ua" | "en" | "it" | "ru";
};

/** Сохранить предпочтения пользователя */
export async function saveUserPrefs(prefs: CloudPrefs): Promise<void> {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "prefs");
  await setDoc(
    ref,
    {
      // Firestore не любит undefined — отфильтруем
      ...(prefs.colorScheme !== undefined
        ? { colorScheme: prefs.colorScheme }
        : {}),
      ...(prefs.primaryColor !== undefined
        ? { primaryColor: prefs.primaryColor }
        : {}),
      ...(prefs.lang !== undefined ? { lang: prefs.lang } : {}),
      updatedAt: serverTimestamp(),
      version: 1,
    },
    { merge: true }
  );
}

/** Загрузить предпочтения пользователя */
export async function loadUserPrefs(): Promise<CloudPrefs> {
  const u = assertUser();
  const ref = doc(db, "users", u.uid, "data", "prefs");
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  const data = snap.data() as any;
  return {
    colorScheme: data?.colorScheme,
    primaryColor: data?.primaryColor,
    lang: data?.lang,
  };
}
