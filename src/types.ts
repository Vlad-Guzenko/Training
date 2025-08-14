export type Env = "outdoor" | "home" | "gym";
export type Muscle = "legs" | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "core" | "full";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  notes?: string;
  env?: Env;
  muscle?: Muscle;
}
export interface HistoryPoint {
  sessionNumber: number;
  date: string;
  volume: number;
  rpe: number;
}

export interface PlanState {
  sessionNumber: number;
  progressPct: number;
  gentle: boolean;
  exercises: Exercise[];
  lastActionAt?: string;
  history: HistoryPoint[];
  rpeToday: number;
  restSeconds: number;
  restLeft: number;
  restRunning: boolean;
}
