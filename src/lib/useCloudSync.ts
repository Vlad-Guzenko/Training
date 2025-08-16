// src/lib/useCloudSync.ts
import { useEffect, useRef } from "react";
import { onAuth } from "../lib/firebase";
import { loadPlanSnapshot, savePlanSnapshot } from "./cloudNormalized";
import { notifications } from "@mantine/notifications";
import type { PlanState } from "../types";

const LS_STATE_KEY = "progressive-workout-planner-v3"; // твой основной ключ

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
) {
  const saveTimer = useRef<number | null>(null);
  const lastSerialized = useRef<string>("");

  // При логине — сравнение "кто новее" ПО ТЕКУЩЕМУ UID
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
          notifications.show({
            title: "Синхронизация",
            message: "Залили локальные данные в облако",
            color: "teal",
          });
        } else if (updatedAtLocal > updatedAtCloud) {
          await savePlanSnapshot(state);
          notifications.show({
            title: "Синхронизация",
            message: "Локальные новее — обновили облако",
            color: "teал",
          });
        } else if (updatedAtCloud >= updatedAtLocal) {
          setState(cloud);
          localStorage.setItem(LS_STATE_KEY, JSON.stringify(cloud));
          setMeta(u.uid, { updatedAtLocal: updatedAtCloud });
          notifications.show({
            title: "Синхронизация",
            message: "Подтянули более свежие данные из облака",
            color: "teal",
          });
        }
      } catch (e) {
        console.warn("[cloud sync] load error", e);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Автосейв с дебаунсом — тоже в рамках текущего UID
  useEffect(() => {
    if (!enabled) return;
    const json = JSON.stringify(state);
    if (json === lastSerialized.current) return;
    lastSerialized.current = json;

    // Кто-то залогинен? Проставим пер-юзерную мету
    const uid = (() => {
      try {
        return JSON.parse(localStorage.getItem("firebase:authUser") || "{}")
          ?.uid as string | undefined;
      } catch {
        return undefined;
      }
    })();

    if (uid) setMeta(uid, { updatedAtLocal: nowMs() });

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await savePlanSnapshot(state);
      } catch (e) {
        console.warn("[cloud sync] save error", e);
      }
    }, debounceMs) as unknown as number;

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, enabled, debounceMs]);
}
