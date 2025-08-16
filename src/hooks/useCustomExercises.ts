import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  subscribeCustomExercises,
  migrateLocalCustoms,
  type CustomExercise,
} from "../lib/customExercises";
import { auth } from "../lib/firebase";

const LSK = "custom-exercises-v1";

export function useCustomExercises() {
  const [items, setItems] = useState<CustomExercise[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LSK) || "[]");
    } catch {
      return [];
    }
  });
  const [isCloud, setIsCloud] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsCloud(false);
        return;
      }

      try {
        await migrateLocalCustoms(items);
      } catch {}

      const unsub = subscribeCustomExercises((remote) => {
        setItems(remote);
        setIsCloud(true);
      });
      return () => unsub();
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!isCloud) localStorage.setItem(LSK, JSON.stringify(items));
  }, [items, isCloud]);

  return { items, isCloud, setItems };
}
