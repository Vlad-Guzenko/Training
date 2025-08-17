import { useEffect, useRef, useState } from "react";
import { onAuth } from "../lib/firebase";
import { loadPlanSnapshot, savePlanSnapshot } from "./cloudNormalized";
import type { PlanState } from "../types";

export type SyncStatus = "saved" | "pending" | "offline" | "error";

const LS_STATE_KEY = "progressive-workout-planner-v3"; // ключ для локального состояния

function nowMs() {
  return Date.now();
}
function metaKey(uid: string) {
  return `workout-plan-meta-${uid}`;
}
function getMeta(uid: string) {
  try {
    return JSON.parse(localStorage.getItem(metaKey(uid)) || "{}") as {
      updatedAtLocal?: number;
    };
  } catch {
    return {};
  }
}
function setMeta(uid: string, m: { updatedAtLocal: number }) {
  localStorage.setItem(metaKey(uid), JSON.stringify(m));
}

// вызывать вручную при не-react изменениях (обычно не нужно)
export function markLocalUpdated(uid?: string) {
  if (!uid) return;
  localStorage.setItem(
    metaKey(uid),
    JSON.stringify({ updatedAtLocal: nowMs() })
  );
}

export function useCloudSync(
  state: PlanState,
  setState: React.Dispatch<React.SetStateAction<PlanState>>,
  enabled = true,
  debounceMs = 3000
): SyncStatus {
  const saveTimer = useRef<number | null>(null);
  const lastSerialized = useRef<string>("");
  const [status, setStatus] = useState<SyncStatus>("saved");

  // При логине — сравнение "кто новее"
  useEffect(() => {
    if (!enabled) return;
    const unsub = onAuth(async (u) => {
      if (!u) return;
      try {
        const { state: cloud, updatedAt } = await loadPlanSnapshot();
        const updatedAtCloud = updatedAt ? updatedAt.toMillis() : 0;
        const { updatedAtLocal = 0 } = getMeta(u.uid);

        if (!cloud) {
          await savePlanSnapshot(state);
          setMeta(u.uid, { updatedAtLocal: nowMs() });
          setStatus("saved");
        } else if (updatedAtLocal > updatedAtCloud) {
          await savePlanSnapshot(state);
          setMeta(u.uid, { updatedAtLocal: nowMs() });
          setStatus("saved");
        } else if (updatedAtCloud >= updatedAtLocal) {
          setState(cloud);
          localStorage.setItem(LS_STATE_KEY, JSON.stringify(cloud));
          setMeta(u.uid, { updatedAtLocal: updatedAtCloud });
          setStatus("saved");
        }
      } catch (e) {
        console.warn("[cloud sync] load error", e);
        setStatus("error");
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Автосейв с дебаунсом
  useEffect(() => {
    if (!enabled) return;
    const json = JSON.stringify(state);
    if (json === lastSerialized.current) return;
    lastSerialized.current = json;

    // Получим UID
    const uid = (() => {
      try {
        return JSON.parse(localStorage.getItem("firebase:authUser") || "{}")
          ?.uid as string | undefined;
      } catch {
        return undefined;
      }
    })();

    if (uid) setMeta(uid, { updatedAtLocal: nowMs() });

    setStatus("pending");

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await savePlanSnapshot(state);
        setStatus("saved");
      } catch (e) {
        console.warn("[cloud sync] save error", e);
        if (!navigator.onLine) setStatus("offline");
        else setStatus("error");
      }
    }, debounceMs) as unknown as number;

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, enabled, debounceMs]);

  return status;
}
