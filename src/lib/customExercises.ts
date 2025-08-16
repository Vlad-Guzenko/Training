import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import type { Env, Muscle } from "../types";
import { auth, db } from "./firebase";

export type CustomExercise = {
  id?: string;
  name: string;
  env: Env;
  muscle: Exclude<Muscle, "full">;
  sets: number;
  reps: number;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
};

const colRef = (uid: string) => collection(db, "users", uid, "customExercises");

export function subscribeCustomExercises(
  cb: (items: CustomExercise[]) => void
) {
  const u = auth.currentUser;
  if (!u) return () => {};
  const q = query(colRef(u.uid), orderBy("name"));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items as CustomExercise[]);
  });
}

export async function addCustomExercise(data: Omit<CustomExercise, "id">) {
  const u = auth.currentUser;
  if (!u) throw new Error("not-authenticated");
  await addDoc(colRef(u.uid), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCustomExercise(
  id: string,
  patch: Partial<CustomExercise>
) {
  const u = auth.currentUser;
  if (!u) throw new Error("not-authenticated");
  await updateDoc(doc(db, "users", u.uid, "customExercises", id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomExercise(id: string) {
  const u = auth.currentUser;
  if (!u) throw new Error("not-authenticated");
  await deleteDoc(doc(db, "users", u.uid, "customExercises", id));
}

/** Одноразовая миграция из localStorage → Firestore при первом входе */
export async function migrateLocalCustoms(localItems: CustomExercise[]) {
  const u = auth.currentUser;
  if (!u || !localItems?.length) return;

  const cloud = await getDocs(colRef(u.uid));
  if (!cloud.empty) return; // в облаке уже есть — ничего не заливаем

  for (const it of localItems) {
    await addCustomExercise({
      name: it.name,
      env: it.env,
      muscle: it.muscle,
      sets: it.sets,
      reps: it.reps,
      notes: it.notes || "",
    });
  }
}
