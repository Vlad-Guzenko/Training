// src/App.tsx
import Layout from "./Layout";
import { Container } from "@mantine/core";
import { Routes, Route } from "react-router-dom";
import PlanPage from "./pages/PlanPage";
import ExercisesPage from "./pages/ExercisesPage";
import HistoryPage from "./pages/HistoryPage";
import TimerPage from "./pages/TimerPage";
import SettingsPage from "./pages/SettingsPage";
import GoalsPage from "./features/goals/ui/GoalsPage";
import { useEffect, useState } from "react";
import { PlanState } from "./types";
import { loadState, saveState } from "./lib/workout";
import { useCloudSync } from "./lib/useCloudSync";
import { usePrefsSync } from "./lib/usePrefsSync";
import { useGoalAutoProgress } from "./features/goals/api/useGoalAutoProgress";
import AboutPage from "./pages/AboutPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const saved = loadState();
  const [state, setState] = useState<PlanState>(
    () =>
      saved || {
        sessionNumber: 1,
        progressPct: 5,
        gentle: true,
        exercises: [],
        history: [],
        rpeToday: 7,
        restSeconds: 90,
        restLeft: 90,
        restRunning: false,
      }
  );

  // локальная персистенция
  useEffect(() => {
    saveState(state);
  }, [state]);

  // тик таймера
  useEffect(() => {
    if (!state.restRunning) return;
    const id = setInterval(
      () =>
        setState((s) => ({
          ...s,
          restLeft: Math.max(0, s.restLeft - 1),
          restRunning: s.restLeft - 1 > 0,
        })),
      1000
    );
    return () => clearInterval(id);
  }, [state.restRunning]);

  // 🔗 синк данных
  useCloudSync(state, setState, true, 3000);

  // 🎨 синк оформления
  usePrefsSync();
  useGoalAutoProgress(state);

  return (
    <Layout>
      <Container size="lg">
        <Routes>
          <Route
            path="/"
            element={<PlanPage state={state} setState={setState} />}
          />
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <GoalsPage state={state} setState={setState} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exercises"
            element={<ExercisesPage state={state} setState={setState} />}
          />
          <Route path="/history" element={<HistoryPage state={state} />} />
          <Route
            path="/timer"
            element={<TimerPage state={state} setState={setState} />}
          />
          <Route
            path="/settings"
            element={<SettingsPage state={state} setState={setState} />}
          />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Container>
    </Layout>
  );
}
