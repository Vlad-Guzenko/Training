export type GoalDomain = "strength" | "endurance" | "calisthenics";
export type GoalMetric = "weight_kg" | "reps" | "time_sec";

export interface Goal {
  id: string;
  name: string; // e.g., "Bench 100 kg"
  domain: GoalDomain;
  metric: GoalMetric;
  targetValue: number;
  startDate: string; // ISO yyyy-mm-dd
  planWeeks: number; // N weeks
  freqPerWeek: number; // planned sessions/week
  intensity: "easy" | "base" | "hard";
  status: "active" | "paused" | "done";
  progress: number; // 0..1
  eta?: string; // ISO date string
  createdAt: number;
  updatedAt: number;
}

export interface GoalWeek {
  weekIndex: number; // 0..N-1
  plannedSessions: number;
  adjusted?: boolean;
  notes?: string;
}
