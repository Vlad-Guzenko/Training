import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { PlanState } from "../types";
import { auth, db } from "./firebase";

const planDoc = () => {
  const u = auth.currentUser;
  if (!u) throw new Error("Не выполнен вход");
  return doc(db, "users", u.uid, "data", "plan");
};

export async function cloudSave(state: PlanState) {
  await setDoc(
    planDoc(),
    { content: state, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function cloudLoad(): Promise<PlanState | null> {
  const snap = await getDoc(planDoc());
  return snap.exists() ? (snap.data().content as PlanState) : null;
}
