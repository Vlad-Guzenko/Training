import Layout from "./Layout";
import { Container } from "@mantine/core";
import { Routes, Route } from "react-router-dom";
import PlanPage from "./pages/PlanPage";
import ExercisesPage from "./pages/ExercisesPage"; // проверь имя файла
import HistoryPage from "./pages/HistoryPage";
import TimerPage from "./pages/TimerPage";
import SettingsPage from "./pages/SettingsPage";
import { useEffect, useState } from "react";
import { PlanState } from "./types";
import { loadState, saveState } from "./lib/workout";

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

  return (
    <Layout>
      <Container fluid px={{ base: "xs", sm: "md" }}>
        <Routes>
          <Route path="/" element={<PlanPage state={state} setState={setState} />} />
          <Route path="/exercises" element={<ExercisesPage state={state} setState={setState} />} />
          <Route path="/history" element={<HistoryPage state={state} />} />
          <Route path="/timer" element={<TimerPage state={state} setState={setState} />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Container>
    </Layout>
  );
}
