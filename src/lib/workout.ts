import { Exercise, PlanState } from "../types";

export const LS_KEY = "progressive-workout-planner-router-v1";
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const volumeOf = (exs: Exercise[]) => exs.reduce((s, e) => s + e.sets * e.reps, 0);
export const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const toInt = (v: string | number | null | undefined, def = 0) =>
  typeof v === "number" ? Math.trunc(v) : typeof v === "string" && v.trim() !== "" ? Math.trunc(parseFloat(v)) : def;

export function loadState(): PlanState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PlanState) : null;
  } catch {
    return null;
  }
}
export function saveState(s: PlanState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export function applyProgression(base: number, pct: number, gentle: boolean, up: boolean) {
  const factor = up ? 1 + pct / 100 : 1 - pct / 100;
  const raw = base * factor;
  if (gentle) {
    if (base <= 10) return Math.max(1, Math.round(raw));
    if (base <= 20) return Math.max(1, Math.round(raw / 2) * 2);
    return Math.max(1, Math.round(raw / 5) * 5);
  }
  return Math.max(1, Math.round(raw));
}

export function buildPlanText(s: PlanState, volume: number) {
  const lines = s.exercises.map((e, i) => `${i + 1}. ${e.name}: ${e.sets}×${e.reps}`).join("\n");
  return `Тренировка #${s.sessionNumber}\n\n${lines}\n\nОбщий объём: ${volume} повт.`;
}

export async function safeCopyText(text: string, filename: string) {
  try {
    if ((navigator as any)?.clipboard?.writeText) {
      await (navigator as any).clipboard.writeText(text);
      return true;
    }
    throw new Error("Clipboard API not available");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) return true;
      throw new Error("exec failed");
    } catch {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return false;
    }
  }
}
