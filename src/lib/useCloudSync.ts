// src/lib/useCloudSync.ts
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

const SKIP_IMPORT_FLAG = "__wf_skip_local_import_once";

function nowMs() {
  return Date.now();
}

function metaKey(uid: string) {
  return `workout-plan-meta-${uid}`;
}

function getMeta(uid: string) {
  try {
    return safeStorage.get<{ updatedAtLocal?: number }>(metaKey(uid), {}) as {
      updatedAtLocal?: number;
    };
  } catch {
    return {};
  }
}

function setMeta(uid: string, meta: { updatedAtLocal?: number }) {
  try {
    safeStorage.set(metaKey(uid), meta);
  } catch {}
}

/** «Осмысленный» план: где-то есть непустой массив (не пустой скелет) */
function isMeaningfulPlan(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;

  // быстрые кандидаты по ожидаемым полям
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

  // общий глубокий просмотр: любой непустой массив в объекте
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

function consumeSkipImportOnce(): boolean {
  try {
    const v = localStorage.getItem(SKIP_IMPORT_FLAG);
    if (v) {
      localStorage.removeItem(SKIP_IMPORT_FLAG);
      return v === "1" || v === "true";
    }
  } catch {}
  return false;
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
  const uidRef = useRef<string | undefined>(undefined);
  const [status, setStatus] = useState<SyncStatus>("hidden");

  // Реакция на логин/логаут — без UI
  useEffect(() => {
    if (!enabled) return;
    const unsub = onAuth(async (u) => {
      uidRef.current = u?.uid || undefined;

      // Гость: показываем "local" только если есть реальные локальные данные
      if (!u) {
        setStatus(isMeaningfulPlan(state) ? "local" : "hidden");
        return;
      }

      try {
        const skipLocalImport = consumeSkipImportOnce();
        const localHas = hasLocalState();

        const { state: cloud, updatedAt } = await loadPlanSnapshot();
        const updatedAtCloud = updatedAt ? updatedAt.toMillis() : 0;
        const { updatedAtLocal = 0 } = getMeta(u.uid);

        if (!cloud) {
          // в облаке пусто — пушим локальное, если оно есть и не запретили импорт
          if (!skipLocalImport && localHas) {
            await savePlanSnapshot(state);
            setMeta(u.uid, { updatedAtLocal: nowMs() });
          }
          setStatus("saved");
          return;
        }

        // в облаке есть данные
        if (!skipLocalImport && localHas && updatedAtLocal > updatedAtCloud) {
          await savePlanSnapshot(state);
          setMeta(u.uid, { updatedAtLocal: nowMs() });
          setStatus("saved");
          return;
        }

        // иначе — подтягиваем облако
        setState(cloud);
        localStorage.setItem(LS_KEY, JSON.stringify(cloud));
        setMeta(u.uid, { updatedAtLocal: updatedAtCloud });
        setStatus("saved");
      } catch (e) {
        console.warn("[cloud sync] load error", e);
        setStatus("error");
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Автосейв с дебаунсом: в облако — только при залогиненном пользователе
  useEffect(() => {
    if (!enabled) return;

    const json = JSON.stringify(state);
    if (json === lastSerialized.current) return;
    lastSerialized.current = json;

    const uid = uidRef.current;

    // не сохраняем «скелет» на самый первый старт (чтобы не плодить "данные из воздуха")
    const hadLS = !!safeStorage.get(LS_KEY);
    const meaningful = isMeaningfulPlan(state);
    if (!meaningful && !hadLS) {
      setStatus(uid ? "saved" : "hidden");
      return;
    }

    // гость — не шлём в облако, статус "local"/"hidden"
    if (!uid) {
      setStatus(meaningful ? "local" : "hidden");
      return;
    }

    // залогинен — обычный pending -> saved
    setMeta(uid, { updatedAtLocal: nowMs() });
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
