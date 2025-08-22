// src/features/goals/domain/suggest.ts
import type { Goal } from "./types";
import type { Exercise } from "../../../types";
import { uid } from "../../../lib/workout";

/**
 * Простая эвристика: под Strength даём «жимовой» день;
 * под Calisthenics — подтягивания/отжимания; под Endurance — «беговые интервалы» (как общий каркас).
 * Интенсивность влияет на объём (sets×reps).
 */
export function suggestWorkoutForGoal(goal: Goal): Exercise[] {
  const level = goal.intensity || "base";

  const vol = (
    ez: [number, number],
    base: [number, number],
    hard: [number, number]
  ) => {
    if (level === "easy") return ez;
    if (level === "hard") return hard;
    return base;
  };

  if (goal.domain === "strength") {
    const [mSets, mReps] = vol([3, 5], [5, 5], [5, 6]);
    const [sSets, sReps] = vol([2, 5], [3, 5], [4, 5]);
    const [aSets, aReps] = vol([2, 8], [3, 8], [4, 8]);

    return [
      {
        id: uid(),
        name: "Bench press",
        sets: mSets,
        reps: mReps,
        env: "gym",
        muscle: "chest",
      },
      {
        id: uid(),
        name: "Overhead press",
        sets: sSets,
        reps: sReps,
        env: "gym",
        muscle: "shoulders",
      },
      {
        id: uid(),
        name: "Barbell row",
        sets: aSets,
        reps: aReps,
        env: "gym",
        muscle: "back",
      },
      {
        id: uid(),
        name: "Triceps dips",
        sets: 3,
        reps: 8,
        env: "gym",
        muscle: "triceps",
      },
      {
        id: uid(),
        name: "Plank",
        sets: 3,
        reps: 45,
        env: "gym",
        muscle: "core",
        notes: "seconds",
      },
    ];
  }

  if (goal.domain === "calisthenics") {
    const [pSets, pReps] = vol([3, 5], [5, 5], [6, 6]);
    const [oSets, oReps] = vol([3, 8], [4, 10], [5, 12]);

    return [
      {
        id: uid(),
        name: "Pull-ups",
        sets: pSets,
        reps: pReps,
        env: "outdoor",
        muscle: "back",
      },
      {
        id: uid(),
        name: "Push-ups",
        sets: oSets,
        reps: oReps,
        env: "outdoor",
        muscle: "chest",
      },
      {
        id: uid(),
        name: "Hanging leg raises",
        sets: 3,
        reps: 10,
        env: "outdoor",
        muscle: "core",
      },
    ];
  }

  // endurance: базовый каркас интервалов
  const [iSets, iReps] = vol([6, 1], [8, 1], [10, 1]); // reps=минуты усилия
  return [
    {
      id: uid(),
      name: "Run — warm-up jog",
      sets: 1,
      reps: 10,
      env: "outdoor",
      muscle: "full",
      notes: "minutes",
    },
    {
      id: uid(),
      name: "Run — intervals (hard)",
      sets: iSets,
      reps: iReps,
      env: "outdoor",
      muscle: "full",
      notes: "minutes on / 2 min easy",
    },
    {
      id: uid(),
      name: "Run — cool-down",
      sets: 1,
      reps: 5,
      env: "outdoor",
      muscle: "full",
      notes: "minutes",
    },
  ];
}
