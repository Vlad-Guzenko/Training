import { useEffect, useRef, useState } from "react";
import { onAuth } from "../lib/firebase";
import { loadPlanSnapshot, savePlanSnapshot } from "./cloudNormalized";
import type { PlanState } from "../types";
import { LS_KEY } from "../lib/workout";
import { safeStorage } from "./safeStorage";

export type SyncStatus =
  | "saved"
  | "pending"
  | "offline"
  | "error"
  | "local"
  | "hidden";

function isMeaningfulPlan(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;

  const candidates = [
    obj?.history,
    obj?.sessions,
    obj?.exercises,
    obj?.customExercises,
    obj?.workouts,
    obj?.plan?.exercises,
    obj?.plan?.days,
    obj?.weeks,
  ].filter(Array.isArray) as any[];

  if (candidates.some((a) => a.length > 0)) return true;

  const stack: any[] = [obj];
  const seen = new Set<any>();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    for (const k in cur) {
      const v = cur[k];
      if (Array.isArray(v)) {
        if (v.length > 0) return true;
      } else if (v && typeof v === "object") {
        stack.push(v);
      }
    }
  }
  return false;
}

function hasLocalState(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const t = raw.trim();
    if (!t || t === "{}" || t === "null" || t === "undefined") return false;
    return isMeaningfulPlan(JSON.parse(t));
  } catch {
    return false;
  }
}

export function useCloudSync(
  state: PlanState,
  setState: React.Dispatch<React.SetStateAction<PlanState>>,
  enabled = true,
  debounceMs = 3000
): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("hidden");

  const saveTimer = useRef<number | null>(null);
  const lastSerialized = useRef<string>("");
  const uidRef = useRef<string | undefined>(undefined);

  // чтобы не делать первичную синхронизацию повторно для того же пользователя
  const lastInitUidRef = useRef<string | null>(null);
  // чтобы не применять один и тот же снимок облака повторно
  const lastAppliedCloudJsonRef = useRef<string | null>(null);

  // Первичный вход/переключение пользователя
  useEffect(() => {
    if (!enabled) return;

    const unsub = onAuth(async (u) => {
      uidRef.current = u?.uid || undefined;

      if (!u) {
        lastInitUidRef.current = null;
        setStatus(isMeaningfulPlan(state) ? "local" : "hidden");
        return;
      }

      const uid = u.uid;
      const needInitial = lastInitUidRef.current !== uid;

      if (!needInitial) {
        setStatus("saved");
        return;
      }

      try {
        const { state: cloud } = await loadPlanSnapshot();
        const localHas = hasLocalState();

        if (cloud) {
          const cloudJson = JSON.stringify(cloud);
          const stateJson = JSON.stringify(state);

          // уже синхронно? ничего не делаем
          if (
            cloudJson === stateJson ||
            lastAppliedCloudJsonRef.current === cloudJson
          ) {
            setStatus("saved");
          } else {
            // облако важнее локалки
            setState(cloud);
            localStorage.setItem(LS_KEY, cloudJson);
            lastAppliedCloudJsonRef.current = cloudJson;
            setStatus("saved");
          }
        } else if (!cloud && localHas) {
          // в облаке пусто, локалка есть — загрузим локалку в облако
          await savePlanSnapshot(state);
          setStatus("saved");
        } else {
          setStatus("saved");
        }

        lastInitUidRef.current = uid;
      } catch (e) {
        console.warn("[cloud sync] login sync error", e);
        setStatus("error");
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Автосохранение по изменениям состояния
  useEffect(() => {
    if (!enabled) return;

    const json = JSON.stringify(state);
    if (json === lastSerialized.current) return;
    lastSerialized.current = json;

    const uid = uidRef.current;
    const hadLS = !!safeStorage.get(LS_KEY);
    const meaningful = isMeaningfulPlan(state);

    if (!meaningful && !hadLS) {
      setStatus(uid ? "saved" : "hidden");
      return;
    }
    if (!uid) {
      setStatus(meaningful ? "local" : "hidden");
      return;
    }

    setStatus("pending");

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await savePlanSnapshot(state);
        setStatus("saved");
      } catch (e) {
        console.warn("[cloud sync] save error", e);
        setStatus(navigator.onLine ? "error" : "offline");
      }
    }, debounceMs) as unknown as number;

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state, enabled, debounceMs]);

  return status;
}
